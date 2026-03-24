import * as fs from "fs";
import * as path from "path";
import play from "play-dl";
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

    // Extrair áudio do YouTube usando play-dl
    console.log("[YouTube] Extraindo áudio de:", youtubeUrl);

    try {
      // Validar se é um link do YouTube válido
      const isYouTube = await play.validate(youtubeUrl);
      if (!isYouTube) {
        return {
          success: false,
          error: "URL do YouTube inválida ou vídeo não acessível",
        };
      }

      console.log("[YouTube] Obtendo informações do vídeo...");
      // Apenas validar a URL, não precisa buscar informações
      console.log("[YouTube] URL validada, prosseguindo com download...");

      console.log("[YouTube] Baixando áudio...");
      const stream = await play.stream(youtubeUrl, {
        discordPlayerCompatibility: false,
      });

      // Salvar o stream em um arquivo
      await new Promise<void>((resolve, reject) => {
        stream.stream
          .pipe(fs.createWriteStream(audioFilePath!))
          .on("finish", () => {
            console.log("[YouTube] Áudio salvo com sucesso");
            resolve();
          })
          .on("error", (error) => {
            console.error("[YouTube] Erro ao salvar áudio:", error);
            reject(error);
          });

        stream.stream.on("error", (error) => {
          console.error("[YouTube] Erro no stream de áudio:", error);
          reject(error);
        });
      });
    } catch (error) {
      console.error("[YouTube] Erro ao extrair áudio:", error);
      if (error instanceof Error) {
        console.error("[YouTube] Mensagem de erro:", error.message);
      }
      return {
        success: false,
        error: `Erro ao extrair áudio do YouTube: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      };
    }

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
