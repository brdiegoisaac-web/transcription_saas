import { useState } from "react";
import {
  Zap,
  Target,
  Brain,
  TrendingUp,
  AlertTriangle,
  Copy,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Eye,
  MessageSquare,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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

interface BlocoEstrutura {
  bloco: string;
  texto: string;
  timestamp_inicio: string;
  timestamp_fim: string;
  score: number;
  tipo: string;
  observacao: string;
}

interface EngenhariaReversa {
  big_idea: string;
  mecanismo_unico: string;
  emocao_principal: string;
  emocoes_secundarias: string[];
  publico_alvo_implicito: string;
  nivel_consciencia: string;
  angulo_principal: string;
}

interface Scores {
  hook_power: number;
  clareza_mensagem: number;
  intensidade_emocional: number;
  especificidade: number;
  cta_strength: number;
  retencao_estimada: number;
  score_geral: number;
}

interface Melhoria {
  bloco: string;
  problema: string;
  sugestao: string;
  exemplo: string;
}

interface Variacao {
  tipo: string;
  texto: string;
}

interface AnalysisData {
  estrutura: BlocoEstrutura[];
  engenharia_reversa: EngenhariaReversa;
  scores: Scores;
  melhorias: Melhoria[];
  variacoes_hook: Variacao[];
  variacoes_cta: Variacao[];
  veredicto: string;
}

interface GeneratedVariation {
  titulo: string;
  angulo: string;
  script_completo: string;
  diferencial: string;
}

const BLOCK_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  hook: { color: "text-red-500", bg: "bg-red-500/10 border-red-500/30", icon: <Zap className="w-4 h-4" />, label: "Hook" },
  contexto: { color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/30", icon: <Eye className="w-4 h-4" />, label: "Contexto" },
  problema: { color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/30", icon: <AlertTriangle className="w-4 h-4" />, label: "Problema" },
  agitacao: { color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30", icon: <TrendingUp className="w-4 h-4" />, label: "Agitação" },
  insight: { color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/30", icon: <Lightbulb className="w-4 h-4" />, label: "Insight" },
  solucao: { color: "text-green-500", bg: "bg-green-500/10 border-green-500/30", icon: <Target className="w-4 h-4" />, label: "Solução" },
  prova: { color: "text-cyan-500", bg: "bg-cyan-500/10 border-cyan-500/30", icon: <BarChart3 className="w-4 h-4" />, label: "Prova" },
  cta: { color: "text-pink-500", bg: "bg-pink-500/10 border-pink-500/30", icon: <MessageSquare className="w-4 h-4" />, label: "CTA" },
  micro_hook: { color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/30", icon: <Zap className="w-3 h-3" />, label: "Micro-Hook" },
};

function ScoreBar({ label, score, max = 10 }: { label: string; score: number; max?: number }) {
  const percentage = (score / max) * 100;
  const getColor = () => {
    if (score >= 8) return "bg-green-500";
    if (score >= 6) return "bg-yellow-500";
    if (score >= 4) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs sm:text-sm text-muted-foreground">{label}</span>
        <span className="text-xs sm:text-sm font-bold text-foreground">{score}/10</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function StructureBlock({ bloco }: { bloco: BlocoEstrutura }) {
  const [expanded, setExpanded] = useState(false);
  const config = BLOCK_CONFIG[bloco.bloco] || BLOCK_CONFIG.hook;

  return (
    <div className={`border rounded-lg p-3 sm:p-4 ${config.bg} transition-all`}>
      <div
        className="flex items-start justify-between gap-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={config.color}>{config.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {bloco.timestamp_inicio} → {bloco.timestamp_fim}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                Score: {bloco.score}/10
              </Badge>
            </div>
          </div>
        </div>
        <span className="text-muted-foreground flex-shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-current/20 space-y-2">
          <p className="text-xs sm:text-sm text-foreground italic">"{bloco.texto}"</p>
          <p className="text-xs text-muted-foreground">{bloco.observacao}</p>
        </div>
      )}
    </div>
  );
}

export default function CreativeAnalysis({ text, segments }: CreativeAnalysisProps) {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [variationFocus, setVariationFocus] = useState<"completo" | "hook" | "cta" | "emocional">("completo");
  const [variations, setVariations] = useState<GeneratedVariation[]>([]);

  const analyzeMutation = trpc.creativeAnalyzer.analyzeCreative.useMutation();

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

  const variationsMutation = trpc.creativeAnalyzer.generateVariations.useMutation();

  const handleGenerateVariations = async () => {
    if (!analysis) return;

    setIsGenerating(true);
    try {
      const result = await variationsMutation.mutateAsync({
        originalText: text,
        analysisJson: JSON.stringify(analysis),
        numberOfVariations: 3,
        focus: variationFocus,
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
      <div className="border-t border-border bg-muted/30">
        <div className="px-4 sm:px-6 py-6 sm:py-8">
          <div className="text-center max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Brain className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Análise de Criativo
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              A IA vai destrinchar a estrutura do criativo, identificar cada bloco
              (Hook, Problema, Agitação, CTA...), dar score por dimensão, e sugerir
              melhorias concretas.
            </p>
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="gap-2"
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analisando criativo...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analisar Criativo
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-border">
      <div className="px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Análise do Criativo
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10">
              <span className="text-xs text-muted-foreground">Score Geral</span>
              <span className="text-sm font-bold text-primary">
                {analysis.scores?.score_geral || 0}/10
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="text-xs"
            >
              {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : "Reanalisar"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="estrutura" className="w-full">
          <TabsList className="w-full flex overflow-x-auto">
            <TabsTrigger value="estrutura" className="text-xs sm:text-sm">
              Estrutura
            </TabsTrigger>
            <TabsTrigger value="scores" className="text-xs sm:text-sm">
              Scores
            </TabsTrigger>
            <TabsTrigger value="engenharia" className="text-xs sm:text-sm">
              Engenharia
            </TabsTrigger>
            <TabsTrigger value="melhorias" className="text-xs sm:text-sm">
              Melhorias
            </TabsTrigger>
            <TabsTrigger value="variacoes" className="text-xs sm:text-sm">
              Variações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="estrutura" className="mt-4">
            <div className="space-y-2 sm:space-y-3">
              {analysis.estrutura && analysis.estrutura.length > 0 ? (
                analysis.estrutura.map((bloco, idx) => (
                  <StructureBlock key={idx} bloco={bloco} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum bloco identificado.
                </p>
              )}
            </div>

            {analysis.veredicto && (
              <Card className="mt-4 p-4 bg-primary/5 border-primary/20">
                <div className="flex items-start gap-2">
                  <Target className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-1">Veredicto</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">{analysis.veredicto}</p>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="scores" className="mt-4">
            <Card className="p-4 sm:p-6">
              <div className="space-y-4">
                {analysis.scores && (
                  <>
                    <ScoreBar label="Hook Power" score={analysis.scores.hook_power} />
                    <ScoreBar label="Clareza da Mensagem" score={analysis.scores.clareza_mensagem} />
                    <ScoreBar label="Intensidade Emocional" score={analysis.scores.intensidade_emocional} />
                    <ScoreBar label="Especificidade" score={analysis.scores.especificidade} />
                    <ScoreBar label="Força do CTA" score={analysis.scores.cta_strength} />
                    <ScoreBar label="Retenção Estimada" score={analysis.scores.retencao_estimada} />
                    <div className="pt-3 mt-3 border-t border-border">
                      <ScoreBar label="Score Geral" score={analysis.scores.score_geral} />
                    </div>
                  </>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="engenharia" className="mt-4">
            {analysis.engenharia_reversa && (
              <div className="space-y-3">
                <Card className="p-4">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Big Idea
                  </h4>
                  <p className="text-sm sm:text-base font-semibold text-foreground">
                    {analysis.engenharia_reversa.big_idea}
                  </p>
                </Card>

                <Card className="p-4">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Mecanismo Único
                  </h4>
                  <p className="text-sm text-foreground">
                    {analysis.engenharia_reversa.mecanismo_unico}
                  </p>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Card className="p-4">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Emoção Principal
                    </h4>
                    <Badge className="text-sm">{analysis.engenharia_reversa.emocao_principal}</Badge>
                  </Card>

                  <Card className="p-4">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Ângulo Principal
                    </h4>
                    <Badge variant="secondary" className="text-sm">
                      {analysis.engenharia_reversa.angulo_principal}
                    </Badge>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="melhorias" className="mt-4">
            <div className="space-y-3">
              {analysis.melhorias && analysis.melhorias.length > 0 ? (
                analysis.melhorias.map((melhoria, idx) => {
                  const config = BLOCK_CONFIG[melhoria.bloco] || BLOCK_CONFIG.hook;
                  return (
                    <Card key={idx} className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={config.color}>{config.icon}</span>
                        <Badge variant="outline" className="text-xs">
                          {config.label}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <span className="text-xs font-medium text-red-500 uppercase">Problema</span>
                          <p className="text-sm text-foreground">{melhoria.problema}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-green-500 uppercase">Sugestão</span>
                          <p className="text-sm text-foreground">{melhoria.sugestao}</p>
                        </div>
                        {melhoria.exemplo && (
                          <div className="bg-muted/50 rounded-lg p-3 mt-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-primary uppercase">
                                Exemplo Reescrito
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleCopy(melhoria.exemplo)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                            <p className="text-sm text-foreground italic">"{melhoria.exemplo}"</p>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma melhoria identificada.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="variacoes" className="mt-4">
            <div className="space-y-4">
              <Card className="p-4">
                <h4 className="text-sm font-semibold text-foreground mb-3">
                  Gerar Novas Versões do Criativo
                </h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {(["completo", "hook", "cta", "emocional"] as const).map((focus) => {
                    const labels: Record<string, string> = {
                      completo: "Reescrita Completa",
                      hook: "Foco no Hook",
                      cta: "Foco no CTA",
                      emocional: "Mais Emocional",
                    };
                    return (
                      <Button
                        key={focus}
                        variant={variationFocus === focus ? "default" : "outline"}
                        size="sm"
                        className="text-xs"
                        onClick={() => setVariationFocus(focus)}
                      >
                        {labels[focus]}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  onClick={handleGenerateVariations}
                  disabled={isGenerating}
                  className="gap-2 w-full sm:w-auto"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Gerando variações...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Gerar 3 Variações
                    </>
                  )}
                </Button>
              </Card>

              {variations.length > 0 && (
                <div className="space-y-3">
                  {variations.map((variation, idx) => (
                    <Card key={idx} className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <h4 className="text-sm font-semibold text-foreground">
                            Variação {idx + 1}: {variation.titulo}
                          </h4>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="secondary" className="text-[10px]">
                              {variation.angulo}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 flex-shrink-0"
                          onClick={() => handleCopy(variation.script_completo)}
                        >
                          <Copy className="w-3 h-3" />
                          <span className="text-xs">Copiar</span>
                        </Button>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-3 mb-3">
                        <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                          {variation.script_completo}
                        </p>
                      </div>

                      {variation.diferencial && (
                        <p className="text-xs text-muted-foreground italic">
                          <Lightbulb className="w-3 h-3 inline mr-1" />
                          {variation.diferencial}
                        </p>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
