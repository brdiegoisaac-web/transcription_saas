import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createCategory,
  getUserCategories,
  createCompetitor,
  getCategoryCompetitors,
  deleteCompetitor,
  linkCreativeToCompetitor,
  getCompetitorCreatives,
} from "../db";

export const competitorsRouter = router({
  /**
   * Criar nova categoria
   */
  createCategory: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const category = await createCategory(ctx.user.id, input.name, input.description);
      return { success: !!category, category };
    }),

  /**
   * Listar categorias do usuário
   */
  listCategories: protectedProcedure.query(async ({ ctx }) => {
    return await getUserCategories(ctx.user.id);
  }),

  /**
   * Criar novo concorrente
   */
  createCompetitor: protectedProcedure
    .input(
      z.object({
        categoryId: z.number(),
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        website: z.string().url().optional(),
        adAccountUrl: z.string().url().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const competitor = await createCompetitor(ctx.user.id, input.categoryId, input.name, {
        description: input.description,
        website: input.website,
        adAccountUrl: input.adAccountUrl,
        notes: input.notes,
      });
      return { success: !!competitor, competitor };
    }),

  /**
   * Listar concorrentes de uma categoria
   */
  listCompetitors: protectedProcedure
    .input(z.object({ categoryId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await getCategoryCompetitors(input.categoryId, ctx.user.id);
    }),

  /**
   * Deletar concorrente
   */
  deleteCompetitor: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const success = await deleteCompetitor(input.id, ctx.user.id);
      return { success };
    }),

  /**
   * Associar criativo a concorrente
   */
  linkCreative: protectedProcedure
    .input(
      z.object({
        transcriptionId: z.number(),
        competitorId: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const link = await linkCreativeToCompetitor(
        input.transcriptionId,
        input.competitorId,
        input.notes
      );
      return { success: !!link, link };
    }),

  /**
   * Listar criativos de um concorrente
   */
  listCreatives: protectedProcedure
    .input(z.object({ competitorId: z.number() }))
    .query(async ({ input }) => {
      return await getCompetitorCreatives(input.competitorId);
    }),
});
