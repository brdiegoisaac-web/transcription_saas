import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { transcribeWithGroq } from "../transcription";
import { transcribeYouTubeVideo } from "../youtube";

export const transcriptionRouter = router({
  transcribeFile: publicProcedure
    .input(
      z.object({
        audioBase64: z.string().describe("Arquivo de áudio em base64"),
        fileName: z.string().describe("Nome do arquivo"),
        inputLanguage: z.enum(["pt", "en", "es"]).describe("Idioma do áudio").optional(),
        outputLanguage: z.enum(["pt", "en", "es"]).describe("Idioma de saída").optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Converter base64 para Buffer
        const audioBuffer = Buffer.from(input.audioBase64, "base64");

        // Chamar Groq API para transcrever
        const result = await transcribeWithGroq(
          audioBuffer,
          input.fileName,
          input.inputLanguage || "pt"
        );

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        console.error("[Transcription Router] Erro:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Erro desconhecido na transcrição",
        };
      }
    }),
  transcribeYouTube: publicProcedure
    .input(
      z.object({
        youtubeUrl: z.string().url().describe("URL do vídeo do YouTube"),
        inputLanguage: z.enum(["pt", "en", "es"]).describe("Idioma do áudio").optional(),
        outputLanguage: z.enum(["pt", "en", "es"]).describe("Idioma de saída").optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await transcribeYouTubeVideo(
          input.youtubeUrl,
          input.inputLanguage || "pt"
        );

        return result;
      } catch (error) {
        console.error("[Transcription Router] Erro ao transcrever YouTube:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Erro desconhecido na transcrição",
        };
      }
    }),
});
