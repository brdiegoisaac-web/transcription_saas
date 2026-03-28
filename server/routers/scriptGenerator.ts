import { publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";

export const scriptGeneratorRouter = {
  /**
   * Gera um roteiro de anúncio a partir de uma transcrição
   * Entrada: texto da transcrição
   * Saída: roteiro formatado para anúncio
   */
  generateAdScript: protectedProcedure
    .input(
      z.object({
        transcriptionText: z.string().min(10, "Texto muito curto"),
        targetAudience: z.string().optional().default("geral"),
        tone: z.enum(["profissional", "casual", "entusiasmado"]).optional().default("profissional"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const systemPrompt = `Você é um roteirista profissional especializado em criar roteiros de anúncios. 
Sua tarefa é converter uma transcrição em um roteiro de anúncio conciso e impactante.

Público-alvo: ${input.targetAudience}
Tom: ${input.tone}

Formato do roteiro:
- Abertura (hook para chamar atenção)
- Corpo (apresentar benefícios principais)
- Call-to-action (incentivar ação)

Mantenha o roteiro entre 150-250 palavras.`;

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: `Crie um roteiro de anúncio baseado nesta transcrição:\n\n${input.transcriptionText}`,
            },
          ],
        });

        const scriptContent = (response.choices[0]?.message?.content as string) || "";

        return {
          success: true,
          script: scriptContent,
          wordCount: scriptContent.split(/\s+/).length,
        };
      } catch (error) {
        console.error("Erro ao gerar roteiro:", error);
        return {
          success: false,
          error: "Erro ao gerar roteiro. Tente novamente.",
        };
      }
    }),

  /**
   * Gera múltiplas variações de roteiros para A/B testing
   */
  generateScriptVariations: protectedProcedure
    .input(
      z.object({
        transcriptionText: z.string().min(10),
        numberOfVariations: z.number().min(2).max(5).default(3),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const tones = ["profissional", "casual", "entusiasmado"];
        const variations = [];

        for (let i = 0; i < Math.min(input.numberOfVariations, tones.length); i++) {
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `Você é um roteirista profissional. Crie um roteiro de anúncio com tom ${tones[i]}.
Mantenha entre 150-200 palavras.`,
              },
              {
                role: "user",
                content: `Crie um roteiro baseado nesta transcrição:\n\n${input.transcriptionText}`,
              },
            ],
          });

          variations.push({
            tone: tones[i],
            script: response.choices[0]?.message?.content || "",
          });
        }

        return {
          success: true,
          variations,
        };
      } catch (error) {
        console.error("Erro ao gerar variações:", error);
        return {
          success: false,
          error: "Erro ao gerar variações de roteiro.",
        };
      }
    }),

  /**
   * Extrai pontos-chave da transcrição para criar roteiro
   */
  extractKeyPoints: protectedProcedure
    .input(
      z.object({
        transcriptionText: z.string().min(10),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `Você é um analista de conteúdo. Extraia os 5 pontos-chave mais importantes da transcrição.
Formato: lista com bullet points, cada ponto com máximo 15 palavras.`,
            },
            {
              role: "user",
              content: `Extraia os pontos-chave desta transcrição:\n\n${input.transcriptionText}`,
            },
          ],
        });

        const keyPoints = response.choices[0]?.message?.content || "";

        return {
          success: true,
          keyPoints,
        };
      } catch (error) {
        console.error("Erro ao extrair pontos-chave:", error);
        return {
          success: false,
          error: "Erro ao extrair pontos-chave.",
        };
      }
    }),
};
