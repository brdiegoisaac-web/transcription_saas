import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import { transcribeWithGroq } from "./transcription";

const execAsync = promisify(exec);

interface YouTubeTranscriptionResult {
  success: boolean;
  data?: {
    text: string;
    segments: Array<{
      id: number;
      start: number;
      end: number;
      text: string;
      speaker: string;
    }>;
  };
  error?: string;
}

/**
 * Extrai áudio de um vídeo do YouTube e transcreve
 * @param youtubeUrl - URL do vídeo do YouTube
 * @param language - Idioma do áudio (pt, en, es)
 * @returns Resultado da transcrição
 */
export async function transcribeYouTubeVideo(
  youtubeUrl: string,
  language: "pt" | "en" | "es" = "pt"
): Promise<YouTubeTranscriptionResult> {
  let audioFilePath: string | null = null;

  try {
    // Validar URL do YouTube
    if (!isValidYouTubeUrl(youtubeUrl)) {
      return {
        success: false,
        error: "URL do YouTube inválida",
      };
    }

    // Criar diretório temporário
    const tempDir = path.join("/tmp", `youtube-${Date.now()}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Extrair áudio do YouTube usando yt-dlp
    console.log("[YouTube] Extraindo áudio de:", youtubeUrl);
    const outputTemplate = path.join(tempDir, "audio.%(ext)s");

    try {
      await execAsync(
        `yt-dlp -f bestaudio -x --audio-format mp3 -o "${outputTemplate}" "${youtubeUrl}"`,
        { timeout: 300000 } // 5 minutos de timeout
      );
    } catch (error) {
      console.error("[YouTube] Erro ao extrair áudio:", error);
      return {
        success: false,
        error: "Erro ao extrair áudio do YouTube. Verifique se o vídeo está disponível.",
      };
    }

    // Encontrar o arquivo de áudio extraído
    const files = fs.readdirSync(tempDir);
    audioFilePath = path.join(tempDir, files[0]);

    if (!fs.existsSync(audioFilePath)) {
      return {
        success: false,
        error: "Erro ao salvar o áudio extraído",
      };
    }

    // Ler o arquivo de áudio
    const audioBuffer = fs.readFileSync(audioFilePath);

    // Transcrever usando Groq
    console.log("[YouTube] Transcrevendo áudio com Groq...");
    const result = await transcribeWithGroq(audioBuffer, youtubeUrl, language);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("[YouTube] Erro ao transcrever vídeo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  } finally {
    // Limpar arquivos temporários
    if (audioFilePath && fs.existsSync(audioFilePath)) {
      try {
        const tempDir = path.dirname(audioFilePath);
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log("[YouTube] Arquivos temporários removidos");
      } catch (error) {
        console.error("[YouTube] Erro ao limpar arquivos temporários:", error);
      }
    }
  }
}

/**
 * Valida se a URL é um link válido do YouTube
 */
function isValidYouTubeUrl(url: string): boolean {
  const youtubeRegex =
    /^(https?:\/\/)?(www\.)?(youtube|youtu|youtube-nocookie)\.(com|be)\//;
  return youtubeRegex.test(url);
}
