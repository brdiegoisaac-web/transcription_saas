import { ENV } from "./_core/env";

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
 * Transcrever áudio usando Groq API (Whisper)
 * @param audioBuffer - Buffer do arquivo de áudio
 * @param fileName - Nome do arquivo (para referência)
 * @returns Resultado da transcrição com segmentos
 */
export async function transcribeWithGroq(
  audioBuffer: Buffer,
  fileName: string
): Promise<TranscriptionResult> {
  if (!ENV.groqApiKey) {
    throw new Error("GROQ_API_KEY não configurada");
  }

  try {
    // Criar FormData manualmente com boundary
    const boundary = "----FormBoundary" + Date.now();
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
        `pt\r\n` +
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="response_format"\r\n\r\n` +
        `json\r\n` +
        `--${boundary}--\r\n`
    );

    // Concatenar buffers
    const fullBody = Buffer.concat([bodyStart, audioBuffer, bodyEnd]);

    // Fazer requisição para Groq API
    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.groqApiKey}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: fullBody as any,
    });

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
  } catch (error) {
    console.error("[Transcription] Erro ao transcrever com Groq:", error);
    throw error;
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
    speaker: idx % 2 === 0 ? "Falante A" : "Falante B",
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
      speaker: idx % 2 === 0 ? "Falante A" : "Falante B",
    });

    currentTime += duration;
  });

  return segments;
}
