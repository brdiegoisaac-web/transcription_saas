import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";
import { execSync } from "child_process";
import { writeFileSync, unlinkSync, readFileSync } from "fs";
import path from "path";
import os from "os";

export interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker: string;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  language: string;
}

/**
 * Comprimir áudio/vídeo se for muito grande
 * Groq tem limite de 25MB
 */
async function compressAudioIfNeeded(buffer: Buffer, fileName: string): Promise<Buffer> {
  const MAX_GROQ_SIZE = 25 * 1024 * 1024; // 25MB

  if (buffer.length <= MAX_GROQ_SIZE) {
    return buffer;
  }

  console.log(
    `[Compression] Arquivo muito grande (${(buffer.length / 1024 / 1024).toFixed(1)}MB), comprimindo...`
  );

  try {
    const tmpDir = os.tmpdir();
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2);
    const inputPath = path.join(tmpDir, `input-${timestamp}-${random}.mp4`);
    const outputPath = path.join(tmpDir, `output-${timestamp}-${random}.mp3`);

    // Escrever arquivo temporário
    writeFileSync(inputPath, buffer);

    try {
      // Comprimir usando ffmpeg: extrair apenas áudio com bitrate reduzido
      const command = `ffmpeg -i "${inputPath}" -q:a 9 -b:a 64k "${outputPath}" -y 2>&1`;
      console.log(`[Compression] Executando: ${command}`);
      
      execSync(command, {
        stdio: "pipe",
        maxBuffer: 50 * 1024 * 1024,
        timeout: 300000, // 5 minutos
      });

      // Ler arquivo comprimido
      const compressedBuffer = readFileSync(outputPath);

      console.log(
        `[Compression] Sucesso: ${(buffer.length / 1024 / 1024).toFixed(1)}MB → ${(compressedBuffer.length / 1024 / 1024).toFixed(1)}MB`
      );

      // Limpar arquivos temporários
      try {
        unlinkSync(inputPath);
      } catch {}
      try {
        unlinkSync(outputPath);
      } catch {}

      return compressedBuffer;
    } catch (error) {
      // Limpar em caso de erro
      try {
        unlinkSync(inputPath);
      } catch {}
      try {
        unlinkSync(outputPath);
      } catch {}
      throw error;
    }
  } catch (error) {
    console.error("[Compression] Erro ao comprimir:", error);
    throw new Error(
      `Arquivo muito grande (${(buffer.length / 1024 / 1024).toFixed(1)}MB) e não foi possível comprimir. Máximo suportado: 25MB`
    );
  }
}

/**
 * Transcrever áudio usando Groq API (Whisper)
 * @param audioBuffer - Buffer do arquivo de áudio
 * @param fileName - Nome do arquivo (para referência)
 * @returns Resultado da transcrição com segmentos
 */
export async function transcribeWithGroq(
  audioBuffer: Buffer,
  fileName: string,
  language: "pt" | "en" | "es" = "pt"
): Promise<TranscriptionResult> {
  if (!ENV.groqApiKey) {
    throw new Error("GROQ_API_KEY não configurada");
  }

  // Comprimir se necessário
  let processedBuffer = await compressAudioIfNeeded(audioBuffer, fileName);

  // Retry logic com exponential backoff
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Criar FormData manualmente com boundary
      const boundary = "----FormBoundary" + Date.now() + Math.random();
      let body = "";

      // Adicionar arquivo
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
      body += `Content-Type: audio/mpeg\r\n\r\n`;

      // Converter para string binária para concatenar com o buffer
      const bodyStart = Buffer.from(body);
      const bodyEnd = Buffer.from(
        `\r\n--${boundary}\r\n` +
          `Content-Disposition: form-data; name="model"\r\n\r\n` +
          `whisper-large-v3-turbo\r\n` +
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="language"\r\n\r\n` +
          `${language}\r\n` +
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="response_format"\r\n\r\n` +
          `json\r\n` +
          `--${boundary}--\r\n`
      );

      // Concatenar buffers
      const fullBody = Buffer.concat([bodyStart, processedBuffer, bodyEnd]);

      // Fazer requisição para Groq API com timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 segundos timeout

      try {
        const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ENV.groqApiKey}`,
            "Content-Type": `multipart/form-data; boundary=${boundary}`,
          },
          body: fullBody as any,
          signal: controller.signal as any,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Groq API error: ${response.status} - ${error}`);
        }

        const data = (await response.json()) as any;

        // Processar resposta e gerar segmentos
        const text = data.text || "";
        const segments = processTranscriptionSegments(text, data.segments || []);

        return {
          text,
          segments,
          language: data.language || "pt",
        };
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      lastError = error as Error;
      console.error(`[Transcription] Tentativa ${attempt + 1}/${maxRetries} falhou:`, error);

      // Se for a última tentativa, lançar erro
      if (attempt === maxRetries - 1) {
        throw new Error(
          `Falha ao transcrever após ${maxRetries} tentativas: ${lastError?.message || "Erro desconhecido"}`
        );
      }

      // Esperar antes de tentar novamente (exponential backoff)
      const delayMs = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError || new Error("Erro desconhecido ao transcrever");
}

/**
 * Processar segmentos da transcrição
 */
function processTranscriptionSegments(
  fullText: string,
  apiSegments: any[]
): TranscriptionSegment[] {
  if (apiSegments.length === 0) {
    // Se não houver segmentos da API, dividir o texto em partes
    return createDefaultSegments(fullText);
  }

  // Mapear segmentos da API
  // Whisper não faz diarização real — manter como falante único
  // a menos que a API retorne dados de speaker reais
  return apiSegments.map((seg, idx) => ({
    id: idx,
    start: seg.start || 0,
    end: seg.end || 0,
    text: seg.text || "",
    speaker: seg.speaker || "Falante A",
  }));
}

/**
 * Criar segmentos padrão se a API não retornar segmentos
 */
function createDefaultSegments(text: string): TranscriptionSegment[] {
  // Dividir texto em frases
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const segments: TranscriptionSegment[] = [];

  let currentTime = 0;
  const wordsPerSecond = 2.5; // Estimativa de velocidade de fala

  sentences.forEach((sentence, idx) => {
    const words = sentence.trim().split(/\s+/).length;
    const duration = Math.max(2, words / wordsPerSecond); // Mínimo 2 segundos

    segments.push({
      id: idx,
      start: currentTime,
      end: currentTime + duration,
      text: sentence.trim(),
      speaker: "Falante A",
    });

    currentTime += duration;
  });

  return segments;
}

/**
 * Limpar e melhorar pontuação da transcrição usando LLM
 * Processa todos os segmentos de uma vez pra eficiência
 */
export async function cleanupTranscriptionText(
  segments: TranscriptionSegment[]
): Promise<TranscriptionSegment[]> {
  if (segments.length === 0) return segments;

  // Montar texto com marcadores de segmento
  const numberedText = segments
    .map((seg, idx) => `[${idx}] ${seg.text}`)
    .join("\n");

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Você é um corretor de transcrições de áudio. Sua tarefa é APENAS corrigir pontuação, capitalização e formatação do texto transcrito.

REGRAS:
- Adicione pontos finais, vírgulas, pontos de interrogação e exclamação onde necessário
- Capitalize início de frases e nomes próprios
- NÃO altere as palavras — mantenha exatamente o que foi falado
- NÃO adicione ou remova palavras
- NÃO resuma ou reescreva
- Mantenha os marcadores [N] no início de cada linha
- Responda APENAS com as linhas corrigidas, uma por linha, cada uma começando com [N]`,
        },
        {
          role: "user",
          content: numberedText,
        },
      ],
    });

    const cleanedText = (response.choices[0]?.message?.content as string) || "";

    // Parsear resposta e aplicar aos segmentos
    const cleanedLines = cleanedText.split("\n").filter((l) => l.trim());
    const cleanedMap = new Map<number, string>();

    for (const line of cleanedLines) {
      const match = line.match(/^\[(\d+)\]\s*(.+)$/);
      if (match) {
        cleanedMap.set(parseInt(match[1]), match[2].trim());
      }
    }

    return segments.map((seg, idx) => ({
      ...seg,
      text: cleanedMap.get(idx) || seg.text,
    }));
  } catch (error) {
    console.error("[Transcription] Erro ao limpar texto:", error);
    // Em caso de erro, retornar segmentos originais
    return segments;
  }
}
