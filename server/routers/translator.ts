import { protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";

const SUPPORTED_LANGUAGES = {
  pt: "Português (Brasil)",
  en: "Inglês",
  es: "Espanhol",
};

export const translatorRouter = {
  /**
   * Traduz texto para o idioma alvo
   */
  translateText: protectedProcedure
    .input(
      z.object({
        text: z.string().min(10, "Texto muito curto"),
        sourceLanguage: z.enum(["pt", "en", "es"]),
        targetLanguage: z.enum(["pt", "en", "es"]),
      })
    )
    .mutation(async ({ input }) => {
      if (input.sourceLanguage === input.targetLanguage) {
        return {
          success: true,
          translation: input.text,
          message: "Idiomas são iguais, texto retornado sem alterações",
        };
      }

      try {
        const sourceLangName = SUPPORTED_LANGUAGES[input.sourceLanguage];
        const targetLangName = SUPPORTED_LANGUAGES[input.targetLanguage];

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `Você é um tradutor profissional. Traduza o texto de ${sourceLangName} para ${targetLangName}.
Mantenha o tom, estilo e significado original. Não adicione explicações, apenas a tradução.`,
            },
            {
              role: "user",
              content: input.text,
            },
          ],
        });

        const translation = (response.choices[0]?.message?.content as string) || "";

        return {
          success: true,
          translation,
          sourceLanguage: input.sourceLanguage,
          targetLanguage: input.targetLanguage,
        };
      } catch (error) {
        console.error("Erro ao traduzir:", error);
        return {
          success: false,
          error: "Erro ao traduzir texto. Tente novamente.",
        };
      }
    }),

  /**
   * Traduz para múltiplos idiomas simultaneamente
   */
  translateToMultiple: protectedProcedure
    .input(
      z.object({
        text: z.string().min(10),
        sourceLanguage: z.enum(["pt", "en", "es"]),
        targetLanguages: z.array(z.enum(["pt", "en", "es"])).min(1).max(3),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const translations: Record<string, string> = {};

        for (const targetLang of input.targetLanguages) {
          if (targetLang === input.sourceLanguage) {
            translations[targetLang] = input.text;
            continue;
          }

          const sourceLangName = SUPPORTED_LANGUAGES[input.sourceLanguage];
          const targetLangName = SUPPORTED_LANGUAGES[targetLang];

          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `Traduza para ${targetLangName}. Apenas a tradução, sem explicações.`,
              },
              {
                role: "user",
                content: input.text,
              },
            ],
          });

          translations[targetLang] = (response.choices[0]?.message?.content as string) || "";
        }

        return {
          success: true,
          translations,
          sourceLanguage: input.sourceLanguage,
        };
      } catch (error) {
        console.error("Erro ao traduzir para múltiplos idiomas:", error);
        return {
          success: false,
          error: "Erro ao traduzir para múltiplos idiomas.",
        };
      }
    }),

  /**
   * Detecta o idioma do texto
   */
  detectLanguage: protectedProcedure
    .input(
      z.object({
        text: z.string().min(10),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `Detecte o idioma do texto e responda APENAS com o código do idioma (pt, en, ou es).`,
            },
            {
              role: "user",
              content: input.text,
            },
          ],
        });

        const detectedCode = ((response.choices[0]?.message?.content as string) || "").toLowerCase().trim();
        const isValid = ["pt", "en", "es"].includes(detectedCode);

        return {
          success: isValid,
          detectedLanguage: isValid ? detectedCode : "pt",
          detectedLanguageName: isValid ? SUPPORTED_LANGUAGES[detectedCode as keyof typeof SUPPORTED_LANGUAGES] : "Desconhecido",
        };
      } catch (error) {
        console.error("Erro ao detectar idioma:", error);
        return {
          success: false,
          detectedLanguage: "pt",
          error: "Erro ao detectar idioma, assumindo Português.",
        };
      }
    }),
};
