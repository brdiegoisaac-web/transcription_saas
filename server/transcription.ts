import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";
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
      // Comprimir usando ffmpeg: extrair apenas áudio com bitrate muito reduzido
      // Usar 32k bitrate para garantir que fica abaixo de 25MB
      const command = `ffmpeg -i "${inputPath}" -q:a 9 -b:a 32k "${outputPath}" -y 2>&1`;
      console.log(`[Compression] Executando: ${command}`);
      
      execSync(command, {
        stdio: "pipe",
        maxBuffer: 50 * 1024 * 1024,
        timeout: 300000, // 5 minutos
      });

      // Ler arquivo comprimido
      const compressedBuffer = readFileSync(outputPath);
      const MAX_MANUS_SIZE = 25 * 1024 * 1024;

      console.log(
        `[Compression] Sucesso: ${(buffer.length / 1024 / 1024).toFixed(1)}MB → ${(compressedBuffer.length / 1024 / 1024).toFixed(1)}MB`
      );

      if (compressedBuffer.length > MAX_MANUS_SIZE) {
        console.log(`[Compression] Ainda muito grande, comprimindo mais...`);
        const inputPath2 = path.join(tmpDir, `input2-${timestamp}-${random}.mp3`);
        const outputPath2 = path.join(tmpDir, `output2-${timestamp}-${random}.mp3`);
        writeFileSync(inputPath2, compressedBuffer);
        
        try {
          const command2 = `ffmpeg -i "${inputPath2}" -q:a 9 -b:a 8k "${outputPath2}" -y 2>&1`;
          execSync(command2, { stdio: "pipe", maxBuffer: 50 * 1024 * 1024, timeout: 300000 });
          const compressedBuffer2 = readFileSync(outputPath2);
          console.log(`[Compression] Segunda compressao: ${(compressedBuffer2.length / 1024 / 1024).toFixed(1)}MB`);
          
          try { unlinkSync(inputPath2); } catch {}
          try { unlinkSync(outputPath2); } catch {}
          
          if (compressedBuffer2.length > MAX_MANUS_SIZE) {
            throw new Error(`Arquivo ainda muito grande: ${(compressedBuffer2.length / 1024 / 1024).toFixed(1)}MB`);
          }
          return compressedBuffer2;
        } catch (error2) {
          try { unlinkSync(inputPath2); } catch {}
          try { unlinkSync(outputPath2); } catch {}
          throw error2;
        }
      }

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
 * Transcrever áudio usando Groq API (Whisper) com fallback para Manus API
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

  // Tentar com Groq primeiro
  console.log("[Transcription] Tentando Groq API...");
  const groqResult = await tryGroqTranscription(processedBuffer, fileName, language);
  
  if (groqResult.success) {
    return groqResult.data!;
  }

  // Fallback para Manus API
  console.log("[Transcription] Groq falhou, usando fallback Manus API...");
  return tryManusTranscription(audioBuffer, fileName, language);
}

/**
 * Tentar transcrição com Groq API
 */
async function tryGroqTranscription(
  audioBuffer: Buffer,
  fileName: string,
  language: "pt" | "en" | "es"
): Promise<{ success: boolean; data?: TranscriptionResult; error?: string }> {
  const maxRetries = 2; // Menos tentativas para Groq, mais rápido fazer fallback
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
      const fullBody = Buffer.concat([bodyStart, audioBuffer, bodyEnd]);

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

        console.log("[Transcription] Groq sucesso!");
        return {
          success: true,
          data: {
            text,
            segments,
            language: data.language || "pt",
          },
        };
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      lastError = error as Error;
      console.error(`[Transcription] Groq tentativa ${attempt + 1}/${maxRetries} falhou:`, error);

      // Se for a última tentativa, retornar erro
      if (attempt === maxRetries - 1) {
        return {
          success: false,
          error: lastError?.message || "Erro desconhecido ao transcrever com Groq",
        };
      }

      // Esperar antes de tentar novamente
      const delayMs = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return {
    success: false,
    error: lastError?.message || "Erro ao transcrever com Groq",
  };
}

/**
 * Tentar transcrição com Manus API (fallback)
 */
async function tryManusTranscription(
  audioBuffer: Buffer,
  fileName: string,
  language: "pt" | "en" | "es"
): Promise<TranscriptionResult> {
  // Salvar arquivo temporário
  const tmpDir = os.tmpdir();
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2);
  const tmpPath = path.join(tmpDir, `audio-${timestamp}-${random}.mp3`);

  try {
    writeFileSync(tmpPath, audioBuffer);

    // Usar o serviço de transcrição do Manus
    // Nota: transcribeAudio espera uma URL, então precisamos fazer upload primeiro
    // Para agora, vamos usar a API diretamente

    // Criar FormData para enviar para Manus
    const formData = new FormData();
    const blob = new Blob([Buffer.from(audioBuffer)], { type: "audio/mpeg" });
    formData.append("file", blob, fileName);
    formData.append("model", "whisper-1");
    formData.append("language", language);

    const response = await fetch(`${ENV.forgeApiUrl}/v1/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.forgeApiKey}`,
      },
      body: formData as any,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Manus API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as any;

    // Processar resposta
    const text = data.text || "";
    const segments = processTranscriptionSegments(text, data.segments || []);

    console.log("[Transcription] Manus API sucesso!");
    return {
      text,
      segments,
      language: data.language || language,
    };
  } catch (error) {
    console.error("[Transcription] Manus API falhou:", error);
    throw new Error(
      `Falha ao transcrever com ambas as APIs: ${error instanceof Error ? error.message : "Erro desconhecido"}`
    );
  } finally {
    // Limpar arquivo temporário
    try {
      unlinkSync(tmpPath);
    } catch {}
  }
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
