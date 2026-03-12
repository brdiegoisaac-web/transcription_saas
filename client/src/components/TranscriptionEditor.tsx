import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Download, Play, Pause, Volume2, Copy, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Segment {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker: string;
}

interface TranscriptionEditorProps {
  transcription: {
    id: string;
    text: string;
    segments: Segment[];
    fileName: string;
    createdAt: Date;
    fileUrl?: string;
  };
  onBack: () => void;
}

export default function TranscriptionEditor({
  transcription,
  onBack,
}: TranscriptionEditorProps) {
  const [segments, setSegments] = useState(transcription.segments);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [exportFormat, setExportFormat] = useState("srt");
  const [editingSegmentId, setEditingSegmentId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);

  // Usar áudio real do arquivo ou simular
  useEffect(() => {
    if (transcription.fileUrl && audioRef.current) {
      audioRef.current.src = transcription.fileUrl;
      audioRef.current.addEventListener(
        "loadedmetadata",
        () => {
          setDuration(audioRef.current?.duration || 0);
        },
        { once: true }
      );
    }
  }, [transcription.fileUrl]);

  // Controlar reprodução de áudio
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch((err) => console.log("Erro ao reproduzir:", err));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Atualizar tempo atual durante reprodução
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      if (audio.currentTime >= audio.duration) {
        setIsPlaying(false);
      }
    };

    if (isPlaying) {
      const interval = setInterval(updateTime, 100);
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  // Encontrar segmento atual baseado no tempo
  const currentSegment = segments.find(
    (seg) => currentTime >= seg.start && currentTime < seg.end
  );

  // Duração total (usar a real do arquivo ou calcular dos segmentos)
  const totalDuration = duration || (segments.length > 0 ? segments[segments.length - 1].end : 12);

  // Exportar transcrição
  const handleExport = () => {
    let content = "";

    if (exportFormat === "srt") {
      content = segments
        .map(
          (seg, idx) =>
            `${idx + 1}\n${formatTime(seg.start)} --> ${formatTime(seg.end)}\n${seg.speaker}: ${seg.text}\n`
        )
        .join("\n");
    } else if (exportFormat === "vtt") {
      content = "WEBVTT\n\n";
      content += segments
        .map(
          (seg) =>
            `${formatTime(seg.start)} --> ${formatTime(seg.end)}\n${seg.speaker}: ${seg.text}\n`
        )
        .join("\n");
    } else if (exportFormat === "txt") {
      content = segments.map((seg) => `${seg.speaker}: ${seg.text}`).join("\n\n");
    } else if (exportFormat === "json") {
      content = JSON.stringify(
        {
          fileName: transcription.fileName,
          createdAt: transcription.createdAt,
          segments: segments,
        },
        null,
        2
      );
    }

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcription.${exportFormat}`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`Transcrição exportada em formato ${exportFormat.toUpperCase()}`);
  };

  // Editar segmento
  const handleEditSegment = (id: number, newText: string) => {
    setSegments(
      segments.map((seg) => (seg.id === id ? { ...seg, text: newText } : seg))
    );
  };

  // Deletar segmento
  const handleDeleteSegment = (id: number) => {
    setSegments(segments.filter((seg) => seg.id !== id));
    toast.success("Segmento removido");
  };

  // Copiar texto
  const handleCopyText = () => {
    const fullText = segments.map((seg) => `${seg.speaker}: ${seg.text}`).join("\n\n");
    navigator.clipboard.writeText(fullText);
    toast.success("Texto copiado para a área de transferência");
  };

  // Pausar ao sair
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-foreground">Editor de Transcrição</h1>
              <p className="text-sm text-muted-foreground">{transcription.fileName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleCopyText}>
              <Copy className="w-4 h-4 mr-2" />
              Copiar
            </Button>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="srt">SRT</SelectItem>
                <SelectItem value="vtt">VTT</SelectItem>
                <SelectItem value="txt">TXT</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExport} className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Player Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Player Card */}
            <Card className="bg-card/50 backdrop-blur-sm border border-border/50 p-6">
              <div ref={playerRef} className="space-y-4">
                {/* Waveform Visualization */}
                <div className="bg-secondary/30 rounded-lg p-4 h-24 flex items-end justify-center gap-1">
                  {Array.from({ length: 40 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-all ${
                        currentTime > (i / 40) * totalDuration
                          ? "bg-primary h-16"
                          : "bg-muted h-8"
                      }`}
                    />
                  ))}
                </div>

                {/* Hidden Audio Element */}
                <audio
                  ref={audioRef}
                  crossOrigin="anonymous"
                  onEnded={() => setIsPlaying(false)}
                />

                {/* Time Display */}
                <div className="flex items-center justify-between text-sm">
                  <span className="font-mono text-foreground">{formatTime(currentTime)}</span>
                  <span className="font-mono text-muted-foreground">{formatTime(totalDuration)}</span>
                </div>

                {/* Progress Bar */}
                <div
                  className="w-full bg-secondary rounded-full h-2 cursor-pointer relative group"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percent = (e.clientX - rect.left) / rect.width;
                    const newTime = percent * totalDuration;
                    setCurrentTime(newTime);
                    if (audioRef.current) {
                      audioRef.current.currentTime = newTime;
                    }
                  }}
                >
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${(currentTime / totalDuration) * 100}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ left: `${(currentTime / totalDuration) * 100}%` }}
                  />
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const newTime = Math.max(0, currentTime - 1);
                      setCurrentTime(newTime);
                      if (audioRef.current) {
                        audioRef.current.currentTime = newTime;
                      }
                    }}
                  >
                    <span className="text-xs">-1s</span>
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="rounded-full w-14 h-14"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const newTime = Math.min(totalDuration, currentTime + 1);
                      setCurrentTime(newTime);
                      if (audioRef.current) {
                        audioRef.current.currentTime = newTime;
                      }
                    }}
                  >
                    <span className="text-xs">+1s</span>
                  </Button>
                  <Button variant="outline" size="icon">
                    <Volume2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Segments Timeline */}
            <Card className="bg-card/50 backdrop-blur-sm border border-border/50 p-6">
              <h3 className="font-semibold text-foreground mb-4">Segmentos ({segments.length})</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {segments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Nenhum segmento disponível</p>
                  </div>
                ) : (
                  segments.map((segment) => (
                  <div
                    key={segment.id}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      currentSegment?.id === segment.id
                        ? "bg-primary/10 border-primary/50"
                        : "bg-secondary/30 border-border/50 hover:border-border"
                    }`}
                    onClick={() => setCurrentTime(segment.start)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono text-muted-foreground">
                            {formatTime(segment.start)} - {formatTime(segment.end)}
                          </span>
                          <span className="text-xs font-semibold text-primary">
                            {segment.speaker}
                          </span>
                        </div>
                        {editingSegmentId === segment.id ? (
                          <textarea
                            autoFocus
                            value={segment.text}
                            onChange={(e) =>
                              handleEditSegment(segment.id, e.target.value)
                            }
                            onBlur={() => setEditingSegmentId(null)}
                            className="w-full px-3 py-2 rounded border border-primary bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        ) : (
                          <p className="text-sm text-foreground break-words">
                            {segment.text}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditingSegmentId(segment.id)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteSegment(segment.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Info Sidebar */}
          <div className="space-y-6">
            <Card className="bg-card/50 backdrop-blur-sm border border-border/50 p-6">
              <h3 className="font-semibold text-foreground mb-4">Informações</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Arquivo</p>
                  <p className="text-foreground font-medium truncate">
                    {transcription.fileName}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Duração</p>
                  <p className="text-foreground font-medium">12.00 segundos</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Segmentos</p>
                  <p className="text-foreground font-medium">{segments.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Precisão</p>
                  <p className="text-foreground font-medium">99%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Criado em</p>
                  <p className="text-foreground font-medium">
                    {new Date(transcription.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="bg-primary/10 border border-primary/20 p-6">
              <h3 className="font-semibold text-foreground mb-3">💡 Dica</h3>
              <p className="text-sm text-muted-foreground">
                Clique em qualquer segmento para reproduzir a partir daquele ponto. Edite o texto
                diretamente para corrigir erros de transcrição.
              </p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms
    .toString()
    .padStart(2, "0")}`;
}
