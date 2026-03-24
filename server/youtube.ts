import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { transcribeWithGroq } from "./transcription";

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

    audioFilePath = path.join(tempDir, "audio.mp3");

    console.log("[YouTube] Extraindo áudio de:", youtubeUrl);

    try {
      // Usar yt-dlp via python3 -m para contornar problemas de PATH
      const command = `python3 -m yt_dlp -f bestaudio -x --audio-format mp3 -o "${audioFilePath}" "${youtubeUrl}" 2>&1`;
      
      console.log("[YouTube] Executando comando:", command);
      
      const output = execSync(command, {
        encoding: "utf-8",
        timeout: 60000, // 60 segundos de timeout
      });

      console.log("[YouTube] Output do yt-dlp:", output);

      // Verificar se o arquivo foi criado
      if (!fs.existsSync(audioFilePath)) {
        return {
          success: false,
          error: "Erro ao salvar o áudio extraído",
        };
      }

      console.log("[YouTube] Áudio salvo com sucesso");
    } catch (error) {
      console.error("[YouTube] Erro ao extrair áudio:", error);
      
      // Tentar extrair mensagem de erro mais clara
      let errorMessage = "Erro ao extrair áudio do YouTube";
      if (error instanceof Error) {
        if (error.message.includes("Sign in")) {
          errorMessage = "YouTube requer autenticação. Tente com um vídeo público sem restrições.";
        } else if (error.message.includes("404")) {
          errorMessage = "Vídeo não encontrado ou foi removido.";
        } else if (error.message.includes("410")) {
          errorMessage = "Vídeo não está mais disponível.";
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage,
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
