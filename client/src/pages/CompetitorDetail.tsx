import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Plus, Trash2, ExternalLink, FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Creative {
  id: number;
  fileName: string;
  originalText: string;
  duration: number;
  inputLanguage: string;
  createdAt: Date;
  notes?: string;
}

export default function CompetitorDetail() {
  const [, params] = useRoute("/competitor/:competitorId");
  const [, setLocation] = useLocation();
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [selectedTranscription, setSelectedTranscription] = useState<number | null>(null);
  const [linkNotes, setLinkNotes] = useState("");

  const competitorId = params?.competitorId ? parseInt(params.competitorId) : null;

  // Queries
  const creativesQuery = trpc.competitors.listCreatives.useQuery(
    { competitorId: competitorId! },
    { enabled: !!competitorId }
  );

  const transcriptionsQuery = trpc.history.list.useQuery({ limit: 100 });
  const linkMutation = trpc.competitors.linkCreative.useMutation();

  const creatives = creativesQuery.data || [];
  const transcriptions = transcriptionsQuery.data || [];

  const handleLinkCreative = async () => {
    if (!selectedTranscription) {
      toast.error("Selecione um criativo");
      return;
    }

    try {
      await linkMutation.mutateAsync({
        transcriptionId: selectedTranscription,
        competitorId: competitorId!,
        notes: linkNotes || undefined,
      });

      toast.success("Criativo associado!");
      setSelectedTranscription(null);
      setLinkNotes("");
      setShowLinkForm(false);
      creativesQuery.refetch();
    } catch (error) {
      toast.error("Erro ao associar criativo");
    }
  };

  if (!competitorId) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-12">
          <p className="text-muted-foreground">Concorrente não encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocation("/organization")}
              className="p-2 hover:bg-secondary rounded transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Criativos do Concorrente</h1>
              <p className="text-sm text-muted-foreground">Gerencie os anúncios e criativos</p>
            </div>
          </div>
          <Button onClick={() => setShowLinkForm(!showLinkForm)} className="gap-2">
            <Plus className="w-4 h-4" />
            Adicionar Criativo
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-12">
        <div className="max-w-4xl mx-auto">
          {showLinkForm && (
            <Card className="p-6 mb-8">
              <h3 className="text-lg font-semibold text-foreground mb-4">Associar Criativo</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Selecione um criativo
                  </label>
                  <select
                    value={selectedTranscription || ""}
                    onChange={(e) => setSelectedTranscription(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">-- Escolha um criativo --</option>
                    {transcriptions.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.fileName} ({Math.round(t.duration / 60)}m)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Notas (opcional)
                  </label>
                  <textarea
                    value={linkNotes}
                    onChange={(e) => setLinkNotes(e.target.value)}
                    placeholder="Ex: Anúncio de verão, campanha principal, etc."
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleLinkCreative}
                    disabled={linkMutation.isPending || !selectedTranscription}
                  >
                    {linkMutation.isPending ? "Associando..." : "Associar"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowLinkForm(false);
                      setSelectedTranscription(null);
                      setLinkNotes("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {creativesQuery.isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando criativos...</p>
            </div>
          ) : creatives.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Nenhum criativo associado ainda</p>
              <Button onClick={() => setShowLinkForm(true)}>
                Adicionar Primeiro Criativo
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {creatives.map((creative: any) => (
                <Card key={creative.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {creative.fileName}
                        </h3>
                        <Badge variant="secondary">
                          {Math.round(creative.duration / 60)}m {creative.duration % 60}s
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <Calendar className="w-4 h-4" />
                        {formatDistanceToNow(new Date(creative.createdAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </div>

                      {creative.notes && (
                        <div className="mb-4 p-3 bg-secondary/50 rounded-lg border border-border">
                          <p className="text-sm text-foreground">
                            <span className="font-medium">Notas:</span> {creative.notes}
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Idioma:</span> {creative.inputLanguage}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          <span className="font-medium">Transcrição:</span> {creative.originalText}
                        </p>
                      </div>
                    </div>

                    <button className="p-2 hover:bg-destructive/10 rounded transition text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
