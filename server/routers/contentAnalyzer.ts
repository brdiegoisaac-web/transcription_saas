import { protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";

export const contentAnalyzerRouter = {
  /**
   * Gera um resumo automático da transcrição
   */
  generateSummary: protectedProcedure
    .input(
      z.object({
        text: z.string().min(20, "Texto muito curto para resumir"),
        summaryLength: z.enum(["curto", "médio", "longo"]).optional().default("médio"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const lengthInstructions = {
          curto: "Máximo 100 palavras",
          médio: "Entre 150-250 palavras",
          longo: "Entre 300-400 palavras",
        };

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `Você é um resumidor profissional. Crie um resumo conciso e claro do texto.
${lengthInstructions[input.summaryLength]}
Mantenha os pontos principais e informações importantes.`,
            },
            {
              role: "user",
              content: `Resuma este texto:\n\n${input.text}`,
            },
          ],
        });

        const summary = (response.choices[0]?.message?.content as string) || "";

        return {
          success: true,
          summary,
          wordCount: summary.split(/\s+/).length,
          summaryLength: input.summaryLength,
        };
      } catch (error) {
        console.error("Erro ao gerar resumo:", error);
        return {
          success: false,
          error: "Erro ao gerar resumo. Tente novamente.",
        };
      }
    }),

  /**
   * Extrai palavras-chave da transcrição
   */
  extractKeywords: protectedProcedure
    .input(
      z.object({
        text: z.string().min(20),
        numberOfKeywords: z.number().min(5).max(20).optional().default(10),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `Extraia as ${input.numberOfKeywords} palavras-chave mais importantes do texto.
Formato: lista separada por vírgulas, ordenada por relevância.
Apenas as palavras-chave, sem explicações.`,
            },
            {
              role: "user",
              content: input.text,
            },
          ],
        });

        const keywordsText = (response.choices[0]?.message?.content as string) || "";
        const keywords = keywordsText
          .split(",")
          .map((kw) => kw.trim())
          .filter((kw) => kw.length > 0);

        return {
          success: true,
          keywords,
          count: keywords.length,
        };
      } catch (error) {
        console.error("Erro ao extrair palavras-chave:", error);
        return {
          success: false,
          error: "Erro ao extrair palavras-chave.",
        };
      }
    }),

  /**
   * Analisa o sentimento do texto
   */
  analyzeSentiment: protectedProcedure
    .input(
      z.object({
        text: z.string().min(20),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `Analise o sentimento do texto e responda em JSON com este formato:
{
  "sentiment": "positivo" | "negativo" | "neutro" | "misto",
  "score": número entre -1 (muito negativo) e 1 (muito positivo),
  "explanation": "explicação breve do sentimento detectado",
  "emotions": ["emoção1", "emoção2", ...] (máximo 5 emoções)
}

Responda APENAS com o JSON, sem explicações adicionais.`,
            },
            {
              role: "user",
              content: input.text,
            },
          ],
        });

        const analysisText = (response.choices[0]?.message?.content as string) || "{}";
        
        try {
          const analysis = JSON.parse(analysisText);
          return {
            success: true,
            sentiment: analysis.sentiment || "neutro",
            score: analysis.score || 0,
            explanation: analysis.explanation || "",
            emotions: analysis.emotions || [],
          };
        } catch {
          // Se não conseguir parsear JSON, fazer análise simples
          return {
            success: true,
            sentiment: "neutro",
            score: 0,
            explanation: analysisText,
            emotions: [],
          };
        }
      } catch (error) {
        console.error("Erro ao analisar sentimento:", error);
        return {
          success: false,
          error: "Erro ao analisar sentimento.",
        };
      }
    }),

  /**
   * Análise completa: resumo + palavras-chave + sentimento
   */
  analyzeComplete: protectedProcedure
    .input(
      z.object({
        text: z.string().min(20),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Executar análises em paralelo
        const [summaryResult, keywordsResult, sentimentResult] = await Promise.all([
          // Resumo
          invokeLLM({
            messages: [
              {
                role: "system",
                content: "Resuma este texto em 150-200 palavras, mantendo os pontos principais.",
              },
              {
                role: "user",
                content: input.text,
              },
            ],
          }),
          // Palavras-chave
          invokeLLM({
            messages: [
              {
                role: "system",
                content: "Extraia 10 palavras-chave principais. Formato: lista separada por vírgulas.",
              },
              {
                role: "user",
                content: input.text,
              },
            ],
          }),
          // Sentimento
          invokeLLM({
            messages: [
              {
                role: "system",
                content: `Analise o sentimento. Responda em JSON: {"sentiment": "positivo|negativo|neutro", "score": número entre -1 e 1}`,
              },
              {
                role: "user",
                content: input.text,
              },
            ],
          }),
        ]);

        const summary = (summaryResult.choices[0]?.message?.content as string) || "";
        const keywordsText = (keywordsResult.choices[0]?.message?.content as string) || "";
        const keywords = keywordsText
          .split(",")
          .map((kw) => kw.trim())
          .filter((kw) => kw.length > 0);

        let sentiment = { sentiment: "neutro", score: 0 };
        try {
          const sentimentText = (sentimentResult.choices[0]?.message?.content as string) || "{}";
          sentiment = JSON.parse(sentimentText);
        } catch {
          // Ignorar erro de parsing
        }

        return {
          success: true,
          summary,
          keywords,
          sentiment: sentiment.sentiment || "neutro",
          sentimentScore: sentiment.score || 0,
        };
      } catch (error) {
        console.error("Erro na análise completa:", error);
        return {
          success: false,
          error: "Erro ao realizar análise completa.",
        };
      }
    }),
};
