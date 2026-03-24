import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Trash2, Download, Search } from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function History() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Buscar histórico
  const { data: transcriptions, isLoading, refetch } = trpc.history.list.useQuery({
    limit: 50,
  });

  // Buscar transcrição específica
  const { data: selectedTranscription } = trpc.history.get.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId }
  );

  // Deletar transcrição
  const deleteMutation = trpc.history.delete.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedId(null);
    },
  });

  // Buscar por nome
  const { data: searchResults } = trpc.history.search.useQuery(
    { query: searchQuery, limit: 20 },
    { enabled: searchQuery.length > 0 }
  );

  const displayTranscriptions = searchQuery.length > 0 ? searchResults : transcriptions;

  // Se uma transcrição foi selecionada, mostrar detalhes
  if (selectedId && selectedTranscription) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedId(null)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {selectedTranscription.fileName}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(selectedTranscription.createdAt), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm("Tem certeza que deseja deletar esta transcrição?")) {
                  deleteMutation.mutate({ id: selectedId });
                }
              }}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Deletar
            </Button>
          </div>

          {/* Metadados */}
          <Card className="bg-card/50 backdrop-blur-sm border border-border/50 p-4 mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Idioma de Entrada</p>
                <p className="font-semibold text-foreground capitalize">
                  {selectedTranscription.inputLanguage === "pt"
                    ? "Português"
                    : selectedTranscription.inputLanguage === "en"
                    ? "Inglês"
                    : "Espanhol"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Idioma de Saída</p>
                <p className="font-semibold text-foreground capitalize">
                  {selectedTranscription.outputLanguage === "pt"
                    ? "Português"
                    : selectedTranscription.outputLanguage === "en"
                    ? "Inglês"
                    : "Espanhol"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duração</p>
                <p className="font-semibold text-foreground">
                  {Math.floor(selectedTranscription.duration / 60)}m{" "}
                  {selectedTranscription.duration % 60}s
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Segmentos</p>
                <p className="font-semibold text-foreground">
                  {selectedTranscription.segments.length}
                </p>
              </div>
            </div>
          </Card>

          {/* Texto Completo */}
          <Card className="bg-card/50 backdrop-blur-sm border border-border/50 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                Transcrição Completa
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(selectedTranscription.originalText);
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Copiar
              </Button>
            </div>
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
              {selectedTranscription.originalText}
            </p>
          </Card>

          {/* Segmentos */}
          <Card className="bg-card/50 backdrop-blur-sm border border-border/50 p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Segmentos</h2>
            <div className="space-y-3">
              {selectedTranscription.segments.map(
                (segment: any, index: number) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg bg-background/50 hover:bg-background transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">
                          {String(Math.floor(segment.start / 60)).padStart(2, "0")}:
                          {String(Math.floor(segment.start % 60))
                            .padStart(2, "0")
                            .padStart(2, "0")}
                          {" - "}
                          {String(Math.floor(segment.end / 60)).padStart(2, "0")}:
                          {String(Math.floor(segment.end % 60))
                            .padStart(2, "0")
                            .padStart(2, "0")}{" "}
                          • <span className="font-semibold">{segment.speaker}</span>
                        </p>
                        <p className="text-sm text-foreground">{segment.text}</p>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Lista de transcrições
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Histórico</h1>
            <p className="text-muted-foreground mt-2">
              Visualize e reutilize suas transcrições anteriores
            </p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Nova Transcrição
          </Button>
        </div>

        {/* Busca */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome do arquivo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
            />
          </div>
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando histórico...</p>
          </div>
        ) : displayTranscriptions && displayTranscriptions.length > 0 ? (
          <div className="space-y-3">
            {displayTranscriptions.map((transcription) => (
              <Card
                key={transcription.id}
                className="bg-card/50 backdrop-blur-sm border border-border/50 p-4 hover:border-primary/50 transition cursor-pointer"
                onClick={() => setSelectedId(transcription.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      {transcription.fileName}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {transcription.segments.length} segmentos •{" "}
                      {Math.floor(transcription.duration / 60)}m{" "}
                      {transcription.duration % 60}s •{" "}
                      {formatDistanceToNow(new Date(transcription.createdAt), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {transcription.inputLanguage === "pt"
                        ? "PT"
                        : transcription.inputLanguage === "en"
                        ? "EN"
                        : "ES"}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery
                ? "Nenhuma transcrição encontrada"
                : "Nenhuma transcrição salva ainda"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
