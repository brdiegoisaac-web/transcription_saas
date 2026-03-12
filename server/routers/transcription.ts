import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { transcribeWithGroq } from "../transcription";

export const transcriptionRouter = router({
  transcribeFile: publicProcedure
    .input(
      z.object({
        audioBase64: z.string().describe("Arquivo de áudio em base64"),
        fileName: z.string().describe("Nome do arquivo"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Converter base64 para Buffer
        const audioBuffer = Buffer.from(input.audioBase64, "base64");

        // Chamar Groq API para transcrever
        const result = await transcribeWithGroq(audioBuffer, input.fileName);

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
});
