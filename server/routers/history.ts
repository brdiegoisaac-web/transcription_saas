import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { saveTranscription, getUserTranscriptions, getTranscriptionById, deleteTranscription, updateTranscriptionName } from "../db";

export const historyRouter = router({
  /**
   * Salvar uma nova transcrição
   */
  save: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        originalText: z.string(),
        segments: z.array(
          z.object({
            id: z.number(),
            start: z.number(),
            end: z.number(),
            text: z.string(),
            speaker: z.string(),
          })
        ),
        inputLanguage: z.enum(["pt", "en", "es"]),
        outputLanguage: z.enum(["pt", "en", "es"]),
        duration: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await saveTranscription({
        userId: ctx.user.id,
        fileName: input.fileName,
        originalText: input.originalText,
        segments: JSON.stringify(input.segments),
        inputLanguage: input.inputLanguage,
        outputLanguage: input.outputLanguage,
        duration: input.duration,
      });

      return {
        success: !!result,
        transcription: result,
      };
    }),

  /**
   * Obter histórico de transcrições do usuário
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const transcriptions = await getUserTranscriptions(ctx.user.id, input.limit);

      return transcriptions.map((t) => ({
        id: t.id,
        fileName: t.fileName,
        originalText: t.originalText,
        segments: JSON.parse(t.segments),
        inputLanguage: t.inputLanguage,
        outputLanguage: t.outputLanguage,
        duration: t.duration,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }));
    }),

  /**
   * Obter uma transcrição específica
   */
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const transcription = await getTranscriptionById(input.id, ctx.user.id);

      if (!transcription) {
        return null;
      }

      return {
        id: transcription.id,
        fileName: transcription.fileName,
        originalText: transcription.originalText,
        segments: JSON.parse(transcription.segments),
        inputLanguage: transcription.inputLanguage,
        outputLanguage: transcription.outputLanguage,
        duration: transcription.duration,
        createdAt: transcription.createdAt,
        updatedAt: transcription.updatedAt,
      };
    }),

  /**
   * Atualizar nome de uma transcrição
   */
  updateName: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1).max(255) }))
    .mutation(async ({ ctx, input }) => {
      const success = await updateTranscriptionName(input.id, ctx.user.id, input.name);
      return { success };
    }),

  /**
   * Deletar uma transcrição
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const success = await deleteTranscription(input.id, ctx.user.id);
      return { success };
    }),

  /**
   * Buscar transcrições por nome de arquivo
   */
  search: protectedProcedure
    .input(
      z.object({
        query: z.string(),
        limit: z.number().max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const allTranscriptions = await getUserTranscriptions(ctx.user.id, 100);

      const filtered = allTranscriptions.filter((t) =>
        t.fileName.toLowerCase().includes(input.query.toLowerCase())
      );

      return filtered.slice(0, input.limit).map((t) => ({
        id: t.id,
        fileName: t.fileName,
        originalText: t.originalText,
        segments: JSON.parse(t.segments),
        inputLanguage: t.inputLanguage,
        outputLanguage: t.outputLanguage,
        duration: t.duration,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }));
    }),
});
