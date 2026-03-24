import { z } from "zod";

// Constantes de validação
export const AUDIO_VALIDATION = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_DURATION: 2 * 60 * 60, // 2 horas em segundos
  SUPPORTED_FORMATS: ["mp3", "wav", "m4a", "ogg", "webm", "flac", "aac"],
  SUPPORTED_MIME_TYPES: [
    "audio/mpeg",
    "audio/wav",
    "audio/mp4",
    "audio/ogg",
    "audio/webm",
    "audio/flac",
    "audio/aac",
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-matroska",
  ],
};

// Schemas de validação
export const transcriptionInputSchema = z.object({
  inputLanguage: z.enum(["pt", "en", "es"]),
  outputLanguage: z.enum(["pt", "en", "es"]),
});

export const youtubeInputSchema = z.object({
  url: z.string().url("URL inválida"),
  inputLanguage: z.enum(["pt", "en", "es"]),
  outputLanguage: z.enum(["pt", "en", "es"]),
});

export const historySearchSchema = z.object({
  query: z.string().max(100).optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().min(1).max(50).optional().default(10),
});

// Funções de validação
export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  // Validar tamanho
  if (file.size > AUDIO_VALIDATION.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Arquivo muito grande. Máximo: ${AUDIO_VALIDATION.MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  // Validar tipo MIME
  if (!AUDIO_VALIDATION.SUPPORTED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Formato não suportado. Formatos aceitos: ${AUDIO_VALIDATION.SUPPORTED_FORMATS.join(", ")}`,
    };
  }

  // Validar extensão
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !AUDIO_VALIDATION.SUPPORTED_FORMATS.includes(extension)) {
    return {
      valid: false,
      error: `Extensão não suportada: .${extension}`,
    };
  }

  return { valid: true };
}

export async function validateAudioDuration(
  file: File
): Promise<{ valid: boolean; duration?: number; error?: string }> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    audio.src = url;

    const handleLoadedMetadata = () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("error", handleError);
      URL.revokeObjectURL(url);

      const duration = audio.duration;

      if (duration > AUDIO_VALIDATION.MAX_DURATION) {
        resolve({
          valid: false,
          error: `Áudio muito longo. Máximo: ${AUDIO_VALIDATION.MAX_DURATION / 60} minutos`,
        });
      } else if (duration === 0 || !isFinite(duration)) {
        resolve({
          valid: false,
          error: "Não foi possível determinar a duração do áudio",
        });
      } else {
        resolve({ valid: true, duration });
      }
    };

    const handleError = () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("error", handleError);
      URL.revokeObjectURL(url);
      resolve({
        valid: false,
        error: "Erro ao processar arquivo de áudio",
      });
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("error", handleError);

    // Timeout de 10 segundos
    setTimeout(() => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("error", handleError);
      URL.revokeObjectURL(url);
      resolve({
        valid: false,
        error: "Timeout ao processar arquivo",
      });
    }, 10000);
  });
}

export function validateYoutubeUrl(url: string): boolean {
  const youtubeRegex =
    /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  return youtubeRegex.test(url);
}
