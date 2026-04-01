import { protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";

/**
 * Analisador de Criativos de Alta Performance
 * 
 * Recebe a transcrição de um criativo (anúncio em vídeo) e retorna:
 * 1. Classificação estrutural (Hook, Contexto, Problema, Agitação, Insight, Solução, Prova, CTA)
 * 2. Análise estratégica por bloco (score, tipo, força)
 * 3. Engenharia reversa (big idea, mecanismo único, emoção, público)
 * 4. Sugestões de melhoria e otimização
 */

const CREATIVE_ANALYSIS_PROMPT = `Você é um analista sênior de criativos de resposta direta, especializado em Meta Ads e Google Ads. Sua função é fazer engenharia reversa de criativos em vídeo a partir da transcrição.

ESTRUTURA DE UM CRIATIVO PROFISSIONAL:

1. HOOK (0-3s) — Para o scroll. Tipos: dor_direta, curiosidade, contrarian, prova_social, identificacao, choque, pergunta
2. CONTEXTO (3-7s) — Situa quem fala, pra quem é, qual cenário
3. PROBLEMA (7-12s) — Expande a dor, mostra consequência
4. AGITAÇÃO (12-17s) — Intensifica emocionalmente, faz a pessoa se ver na situação
5. INSIGHT (17-20s) — Quebra de padrão: "O problema não é X, é Y"
6. SOLUÇÃO (20-25s) — Introduz o mecanismo (não o produto direto)
7. PROVA (opcional) — Resultado, depoimento, número, autoridade
8. CTA (últimos 3-5s) — Tipos: direto, curiosidade, beneficio, urgencia

REGRAS IMPORTANTES:
- Nem todo criativo tem todos os blocos. Classifique apenas o que existir.
- Blocos podem se sobrepor ou estar fora de ordem.
- Micro-hooks podem aparecer ao longo do vídeo (reforços de atenção).
- Um criativo curto pode ter apenas Hook + Solução + CTA.

Analise a transcrição e responda APENAS com um JSON válido (sem markdown, sem backticks, sem explicação fora do JSON) no seguinte formato:

{
  "estrutura": [
    {
      "bloco": "hook|contexto|problema|agitacao|insight|solucao|prova|cta|micro_hook",
      "texto": "texto exato do trecho",
      "timestamp_inicio": "00:00",
      "timestamp_fim": "00:03",
      "score": 8,
      "tipo": "tipo específico do bloco (ex: dor_direta, curiosidade, etc)",
      "observacao": "análise breve do que funciona ou não nesse trecho"
    }
  ],
  "engenharia_reversa": {
    "big_idea": "qual é a grande ideia central do criativo",
    "mecanismo_unico": "qual mecanismo ou método é apresentado como diferencial",
    "emocao_principal": "qual emoção dominante (medo, curiosidade, esperança, urgência, etc)",
    "emocoes_secundarias": ["emoção2", "emoção3"],
    "publico_alvo_implicito": "quem é o público baseado na linguagem e dores apresentadas",
    "nivel_consciencia": "inconsciente|consciente_problema|consciente_solucao|consciente_produto|mais_consciente",
    "angulo_principal": "qual ângulo de abordagem (testemunho, educativo, provocativo, storytelling, demonstracao)"
  },
  "scores": {
    "hook_power": 8,
    "clareza_mensagem": 7,
    "intensidade_emocional": 6,
    "especificidade": 7,
    "cta_strength": 5,
    "retencao_estimada": 7,
    "score_geral": 7
  },
  "melhorias": [
    {
      "bloco": "hook",
      "problema": "o que está fraco ou faltando",
      "sugestao": "sugestão concreta de melhoria",
      "exemplo": "exemplo reescrito"
    }
  ],
  "variacoes_hook": [
    {
      "tipo": "tipo do hook alternativo",
      "texto": "hook reescrito com esse ângulo"
    }
  ],
  "variacoes_cta": [
    {
      "tipo": "tipo do CTA alternativo",
      "texto": "CTA reescrito"
    }
  ],
  "veredicto": "parágrafo curto com avaliação geral do criativo: o que funciona, o que não funciona, e o principal ajuste que faria a maior diferença"
}`;

export const creativeAnalyzerRouter = {
  /**
   * Análise completa de criativo
   * Recebe transcrição e retorna estrutura + análise + melhorias
   */
  analyzeCreative: protectedProcedure
    .input(
      z.object({
        text: z.string().min(10, "Transcrição muito curta para analisar"),
        segments: z.array(z.object({
          id: z.number(),
          start: z.number(),
          end: z.number(),
          text: z.string(),
          speaker: z.string(),
        })).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Montar transcrição com timestamps para a IA
        let transcriptionWithTimestamps = "";
        
        if (input.segments && input.segments.length > 0) {
          transcriptionWithTimestamps = input.segments
            .map((seg) => {
              const startMin = Math.floor(seg.start / 60).toString().padStart(2, "0");
              const startSec = Math.floor(seg.start % 60).toString().padStart(2, "0");
              const endMin = Math.floor(seg.end / 60).toString().padStart(2, "0");
              const endSec = Math.floor(seg.end % 60).toString().padStart(2, "0");
              return `[${startMin}:${startSec} → ${endMin}:${endSec}] ${seg.text}`;
            })
            .join("\n");
        } else {
          transcriptionWithTimestamps = input.text;
        }

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: CREATIVE_ANALYSIS_PROMPT,
            },
            {
              role: "user",
              content: `Analise este criativo:\n\n${transcriptionWithTimestamps}`,
            },
          ],
        });

        const rawContent = (response.choices[0]?.message?.content as string) || "{}";
        
        // Limpar possíveis markdown fences
        const cleanJson = rawContent
          .replace(/```json\s*/g, "")
          .replace(/```\s*/g, "")
          .trim();

        try {
          const analysis = JSON.parse(cleanJson);
          return {
            success: true,
            analysis,
          };
        } catch (parseError) {
          // Fallback: tentar extrair JSON do meio do texto
          const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const analysis = JSON.parse(jsonMatch[0]);
              return {
                success: true,
                analysis,
              };
            } catch {
              // Se mesmo assim falhar, retornar o texto bruto
              return {
                success: false,
                error: "Erro ao processar análise. A IA retornou formato inválido.",
                rawResponse: rawContent,
              };
            }
          }
          
          return {
            success: false,
            error: "Erro ao processar análise do criativo.",
            rawResponse: rawContent,
          };
        }
      } catch (error) {
        console.error("[CreativeAnalyzer] Erro:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Erro ao analisar criativo.",
        };
      }
    }),

  /**
   * Gerar novas versões do criativo baseado na análise
   */
  generateVariations: protectedProcedure
    .input(
      z.object({
        originalText: z.string().min(10),
        analysisJson: z.string().describe("JSON da análise original"),
        numberOfVariations: z.number().min(1).max(5).default(3),
        focus: z.enum(["hook", "cta", "completo", "emocional"]).default("completo"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const focusInstructions: Record<string, string> = {
          hook: "Foque em criar hooks radicalmente diferentes. Varie entre dor direta, curiosidade, prova social, contrarian e pergunta provocativa.",
          cta: "Foque em CTAs mais fortes. Varie entre direto, curiosidade, benefício e urgência.",
          completo: "Reescreva o criativo inteiro mantendo a big idea mas mudando ângulo, hook e CTA.",
          emocional: "Mantenha a estrutura mas aumente a intensidade emocional em cada bloco.",
        };

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `Você é um copywriter sênior especializado em criativos de resposta direta para Meta Ads.

Baseado na análise de um criativo existente, gere ${input.numberOfVariations} variações otimizadas.

${focusInstructions[input.focus]}

Responda APENAS com JSON válido no formato:
{
  "variacoes": [
    {
      "titulo": "nome descritivo da variação",
      "angulo": "qual ângulo essa variação usa",
      "script_completo": "texto completo do criativo reescrito, com indicação de [HOOK], [CONTEXTO], [PROBLEMA], [AGITAÇÃO], [INSIGHT], [SOLUÇÃO], [PROVA], [CTA] em cada parte",
      "diferencial": "o que muda em relação ao original"
    }
  ]
}`,
            },
            {
              role: "user",
              content: `Criativo original:\n${input.originalText}\n\nAnálise do criativo:\n${input.analysisJson}`,
            },
          ],
        });

        const rawContent = (response.choices[0]?.message?.content as string) || "{}";
        const cleanJson = rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

        try {
          const result = JSON.parse(cleanJson);
          return {
            success: true,
            variations: result.variacoes || result.variations || [],
          };
        } catch {
          const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const result = JSON.parse(jsonMatch[0]);
              return {
                success: true,
                variations: result.variacoes || result.variations || [],
              };
            } catch {
              return {
                success: false,
                error: "Erro ao gerar variações.",
              };
            }
          }
          return {
            success: false,
            error: "Erro ao gerar variações do criativo.",
          };
        }
      } catch (error) {
        console.error("[CreativeAnalyzer] Erro ao gerar variações:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Erro ao gerar variações.",
        };
      }
    }),
};
