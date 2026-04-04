import { useState } from "react";
import { Loader2, ChevronDown, ChevronUp, Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface Segment {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker: string;
}

interface CreativeAnalysisProps {
  text: string;
  segments: Segment[];
}

interface AnalysisData {
  estrutura: Array<{
    bloco: string;
    texto: string;
    timestamp_inicio: string;
    timestamp_fim: string;
    score: number;
    tipo: string;
    observacao: string;
  }>;
  engenharia_reversa: {
    big_idea: string;
    mecanismo_unico: string;
    emocao_principal: string;
    emocoes_secundarias: string[];
    publico_alvo_implicito: string;
    nivel_consciencia: string;
    angulo_principal: string;
  };
  scores: {
    hook_power: number;
    clareza_mensagem: number;
    intensidade_emocional: number;
    especificidade: number;
    cta_strength: number;
    retencao_estimada: number;
    score_geral: number;
  };
  melhorias: Array<{
    bloco: string;
    problema: string;
    sugestao: string;
    exemplo: string;
  }>;
  variacoes_hook: Array<{ tipo: string; texto: string }>;
  variacoes_cta: Array<{ tipo: string; texto: string }>;
  veredicto: string;
}

interface GeneratedVariation {
  titulo: string;
  angulo: string;
  script_completo: string;
  diferencial: string;
}

export default function CreativeAnalysis({ text, segments }: CreativeAnalysisProps) {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [variations, setVariations] = useState<GeneratedVariation[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const analyzeMutation = trpc.creativeAnalyzer.analyzeCreative.useMutation();
  const variationsMutation = trpc.creativeAnalyzer.generateVariations.useMutation();

  const handleAnalyze = async () => {
    if (!text.trim()) {
      toast.error("Nenhum texto para analisar");
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeMutation.mutateAsync({
        text,
        segments,
      });

      if (result.success && result.analysis) {
        setAnalysis(result.analysis);
        setExpandedSection("estrutura");
        toast.success("Análise concluída!");
      } else {
        toast.error(result.error || "Erro ao analisar criativo");
      }
    } catch (error) {
      console.error("Erro ao analisar:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao conectar com a IA");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateVariations = async () => {
    if (!analysis) return;

    setIsGenerating(true);
    try {
      const result = await variationsMutation.mutateAsync({
        originalText: text,
        analysisJson: JSON.stringify(analysis),
        numberOfVariations: 3,
        focus: "completo",
      });

      if (result.success && result.variations) {
        setVariations(result.variations);
        toast.success("Variações geradas!");
      } else {
        toast.error(result.error || "Erro ao gerar variações");
      }
    } catch (error) {
      console.error("Erro ao gerar variações:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao gerar variações");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Sparkles className="w-6 h-6 text-gray-600" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Análise de Criativo</h3>
        <p className="text-xs text-gray-500 mb-6 max-w-sm">
          A IA vai analisar a estrutura do seu criativo, identificar pontos fortes e sugerir melhorias.
        </p>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Analisar Criativo
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Score Geral */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Score Geral</p>
          <p className="text-2xl font-semibold text-gray-900">{analysis.scores?.score_geral || 0}/10</p>
        </div>
        <button
          onClick={handleGenerateVariations}
          disabled={isGenerating}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Gerar Variações
            </>
          )}
        </button>
      </div>

      {/* Estrutura */}
      <div className="border border-gray-100 rounded-lg overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === "estrutura" ? null : "estrutura")}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <h3 className="text-sm font-semibold text-gray-900">Estrutura do Criativo</h3>
          {expandedSection === "estrutura" ? (
            <ChevronUp className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-600" />
          )}
        </button>

        {expandedSection === "estrutura" && (
          <div className="border-t border-gray-100 p-4 space-y-3 bg-white">
            {analysis.estrutura && analysis.estrutura.length > 0 ? (
              analysis.estrutura.map((bloco, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
                      {bloco.bloco}
                    </span>
                    <span className="text-xs font-medium text-gray-600">
                      Score: {bloco.score}/10
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 italic mb-2">"{bloco.texto}"</p>
                  <p className="text-xs text-gray-500">{bloco.observacao}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500">Nenhum bloco identificado</p>
            )}
          </div>
        )}
      </div>

      {/* Scores */}
      <div className="border border-gray-100 rounded-lg overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === "scores" ? null : "scores")}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <h3 className="text-sm font-semibold text-gray-900">Análise de Dimensões</h3>
          {expandedSection === "scores" ? (
            <ChevronUp className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-600" />
          )}
        </button>

        {expandedSection === "scores" && (
          <div className="border-t border-gray-100 p-4 space-y-3 bg-white">
            {analysis.scores && (
              <>
                <ScoreItem label="Hook Power" score={analysis.scores.hook_power} />
                <ScoreItem label="Clareza da Mensagem" score={analysis.scores.clareza_mensagem} />
                <ScoreItem label="Intensidade Emocional" score={analysis.scores.intensidade_emocional} />
                <ScoreItem label="Especificidade" score={analysis.scores.especificidade} />
                <ScoreItem label="Força do CTA" score={analysis.scores.cta_strength} />
                <ScoreItem label="Retenção Estimada" score={analysis.scores.retencao_estimada} />
              </>
            )}
          </div>
        )}
      </div>

      {/* Engenharia Reversa */}
      <div className="border border-gray-100 rounded-lg overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === "engenharia" ? null : "engenharia")}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <h3 className="text-sm font-semibold text-gray-900">Engenharia Reversa</h3>
          {expandedSection === "engenharia" ? (
            <ChevronUp className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-600" />
          )}
        </button>

        {expandedSection === "engenharia" && analysis.engenharia_reversa && (
          <div className="border-t border-gray-100 p-4 space-y-4 bg-white">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Big Idea</p>
              <p className="text-sm text-gray-900 font-medium">{analysis.engenharia_reversa.big_idea}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Mecanismo Único</p>
              <p className="text-sm text-gray-900">{analysis.engenharia_reversa.mecanismo_unico}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Emoção Principal</p>
                <p className="text-sm text-gray-900 font-medium">{analysis.engenharia_reversa.emocao_principal}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Ângulo</p>
                <p className="text-sm text-gray-900 font-medium">{analysis.engenharia_reversa.angulo_principal}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Melhorias */}
      <div className="border border-gray-100 rounded-lg overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === "melhorias" ? null : "melhorias")}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <h3 className="text-sm font-semibold text-gray-900">Sugestões de Melhoria</h3>
          {expandedSection === "melhorias" ? (
            <ChevronUp className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-600" />
          )}
        </button>

        {expandedSection === "melhorias" && (
          <div className="border-t border-gray-100 p-4 space-y-4 bg-white">
            {analysis.melhorias && analysis.melhorias.length > 0 ? (
              analysis.melhorias.map((melhoria, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-2">
                    {melhoria.bloco}
                  </p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-600 font-medium mb-1">Problema:</p>
                      <p className="text-xs text-gray-700">{melhoria.problema}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium mb-1">Sugestão:</p>
                      <p className="text-xs text-gray-700">{melhoria.sugestao}</p>
                    </div>
                    {melhoria.exemplo && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-gray-600 font-medium">Exemplo:</p>
                          <button
                            onClick={() => handleCopy(melhoria.exemplo)}
                            className="p-1 hover:bg-white rounded transition-colors"
                          >
                            <Copy className="w-3 h-3 text-gray-600" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-700 italic">"{melhoria.exemplo}"</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500">Nenhuma melhoria identificada</p>
            )}
          </div>
        )}
      </div>

      {/* Variações Geradas */}
      {variations.length > 0 && (
        <div className="border border-gray-100 rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === "variacoes" ? null : "variacoes")}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <h3 className="text-sm font-semibold text-gray-900">Variações Geradas</h3>
            {expandedSection === "variacoes" ? (
              <ChevronUp className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            )}
          </button>

          {expandedSection === "variacoes" && (
            <div className="border-t border-gray-100 p-4 space-y-4 bg-white">
              {variations.map((variation, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
                        Variação {idx + 1}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">{variation.angulo}</p>
                    </div>
                    <button
                      onClick={() => handleCopy(variation.script_completo)}
                      className="p-1 hover:bg-white rounded transition-colors flex-shrink-0"
                    >
                      <Copy className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed mb-2">
                    {variation.script_completo}
                  </p>
                  {variation.diferencial && (
                    <p className="text-xs text-gray-500 italic">
                      💡 {variation.diferencial}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Veredicto */}
      {analysis.veredicto && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Veredicto</p>
          <p className="text-sm text-gray-900 leading-relaxed">{analysis.veredicto}</p>
        </div>
      )}
    </div>
  );
}

function ScoreItem({ label, score }: { label: string; score: number }) {
  const percentage = (score / 10) * 100;
  const getColor = () => {
    if (score >= 8) return "bg-green-500";
    if (score >= 6) return "bg-yellow-500";
    if (score >= 4) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-600">{label}</span>
        <span className="text-xs font-semibold text-gray-900">{score}/10</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
