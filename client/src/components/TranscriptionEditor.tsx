import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Copy, Download, Play, Pause, Volume2, Save, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

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

function SaveButton({ transcription, segments }: any) {
  const saveMutation = trpc.history.save.useMutation();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const fullText = segments.map((seg: any) => `${seg.speaker}: ${seg.text}`).join("\n\n");
      
      await saveMutation.mutateAsync({
        fileName: transcription.fileName,
        originalText: fullText,
        segments: segments,
        duration: segments.length > 0 ? segments[segments.length - 1].end : 0,
        inputLanguage: "pt",
        outputLanguage: "pt",
      });
      
      toast.success("Transcrição salva com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar transcrição");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Button 
      onClick={handleSave} 
      size="sm" 
      className="gap-2 w-full sm:w-auto"
      disabled={isSaving}
    >
      <Save className="w-4 h-4" />
      <span className="hidden xs:inline">{isSaving ? "Salvando..." : "Salvar"}</span>
      <span className="xs:hidden">{isSaving ? "..." : "OK"}</span>
    </Button>
  );
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
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
  const [editingText, setEditingText] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [showFullText, setShowFullText] = useState(false);

  // Usar áudio real do arquivo
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

  // Controlar reprodução
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch((err) => console.log("Erro ao reproduzir:", err));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Atualizar tempo durante reprodução
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

  const totalDuration = duration || (segments.length > 0 ? segments[segments.length - 1].end : 12);

  // Encontrar segmento atual
  const currentSegment = segments.find(
    (seg) => currentTime >= seg.start && currentTime < seg.end
  );

  // Iniciar edição de segmento
  const startEditSegment = (segment: Segment) => {
    setEditingSegmentId(segment.id);
    setEditingText(segment.text);
  };

  // Salvar edição de segmento
  const saveSegmentEdit = (segmentId: number) => {
    setSegments(
      segments.map((seg) =>
        seg.id === segmentId ? { ...seg, text: editingText } : seg
      )
    );
    setEditingSegmentId(null);
    setEditingText("");
    toast.success("Segmento editado!");
  };

  // Cancelar edição
  const cancelSegmentEdit = () => {
    setEditingSegmentId(null);
    setEditingText("");
  };

  // Deletar segmento
  const deleteSegment = (segmentId: number) => {
    setSegments(segments.filter((seg) => seg.id !== segmentId));
    toast.success("Segmento deletado!");
  };

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
      content = JSON.stringify(segments, null, 2);
    }

    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(content));
    element.setAttribute("download", `transcription.${exportFormat === "json" ? "json" : exportFormat}`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast.success(`Transcrição exportada em ${exportFormat.toUpperCase()}!`);
  };

  // Copiar texto completo com quebras de linha
  const handleCopyFullText = () => {
    const fullText = segments.map((seg) => `${seg.speaker}: ${seg.text}`).join("\n\n");
    navigator.clipboard.writeText(fullText);
    toast.success("Texto copiado para a área de transferência!");
  };

  // Copiar como parágrafo único (sem quebras)
  const handleCopyAsParagraph = () => {
    const paragraphText = segments.map((seg) => seg.text).join(" ");
    navigator.clipboard.writeText(paragraphText);
    toast.success("Parágrafo único copiado para a área de transferência!");
  };

  // Controles de tempo
  const handleSkip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime + seconds);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Responsivo */}
      <header className="border-b border-border sticky top-0 z-40 bg-background/95 backdrop-blur">
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="font-semibold text-foreground truncate text-sm sm:text-base">{transcription.fileName}</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {new Date(transcription.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>

            {/* Mobile: Compact buttons */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleCopyFullText} 
                className="h-8 w-8 sm:h-10 sm:w-10"
                title="Copiar com quebras"
              >
                <Copy className="w-4 h-4" />
              </Button>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleCopyAsParagraph} 
                className="h-8 w-8 sm:h-10 sm:w-10"
                title="Copiar parágrafo único"
              >
                <Copy className="w-4 h-4" />
              </Button>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleExport} 
                className="h-8 w-8 sm:h-10 sm:w-10"
                title="Exportar"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Desktop: Full controls */}
          <div className="hidden sm:flex items-center gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={handleCopyFullText} className="gap-2">
              <Copy className="w-4 h-4" />
              Copiar com Quebras
            </Button>

            <Button variant="outline" size="sm" onClick={handleCopyAsParagraph} className="gap-2">
              <Copy className="w-4 h-4" />
              Parágrafo Único
            </Button>

            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="srt">SRT</SelectItem>
                <SelectItem value="vtt">VTT</SelectItem>
                <SelectItem value="txt">TXT</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleExport} size="sm" className="gap-2 bg-primary">
              <Download className="w-4 h-4" />
              Exportar
            </Button>

            <SaveButton transcription={transcription} segments={segments} />
          </div>

          {/* Mobile: Export format selector and save button */}
          <div className="sm:hidden flex items-center gap-2 justify-between">
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger className="w-20 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="srt">SRT</SelectItem>
                <SelectItem value="vtt">VTT</SelectItem>
                <SelectItem value="txt">TXT</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
            <SaveButton transcription={transcription} segments={segments} />
          </div>
        </div>
      </header>

      {/* Player - Responsivo */}
      <div className="border-b border-border bg-muted/50">
        <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-3 sm:space-y-4">
          {/* Waveform placeholder */}
          <div className="h-12 sm:h-16 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg flex items-center px-3 sm:px-4">
            <div className="flex gap-1 items-center h-full w-full">
              {segments.map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-primary/40 rounded-sm"
                  style={{
                    height: `${30 + Math.random() * 50}%`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max={totalDuration}
              value={currentTime}
              onChange={(e) => {
                if (audioRef.current) {
                  audioRef.current.currentTime = parseFloat(e.target.value);
                }
              }}
              className="w-full"
            />
            <div className="flex justify-between text-xs sm:text-sm text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(totalDuration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-2 sm:gap-4">
            <Button variant="outline" size="sm" onClick={() => handleSkip(-5)} className="text-xs sm:text-sm">
              -5s
            </Button>
            <Button
              size="lg"
              className="rounded-full w-12 h-12 sm:w-14 sm:h-14"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="w-5 h-5 sm:w-6 sm:h-6" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6" />}
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleSkip(5)} className="text-xs sm:text-sm">
              +5s
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10">
              <Volume2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Texto Completo - Responsivo */}
      <div className="border-b border-border bg-muted/30">
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between mb-3 gap-2">
            <h2 className="font-semibold text-sm sm:text-base text-foreground">Transcrição Completa</h2>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setShowFullText(!showFullText)}
              className="text-xs"
            >
              {showFullText ? "Ocultar" : "Mostrar"}
            </Button>
          </div>
          {showFullText && (
            <div className="bg-background p-3 sm:p-4 rounded-lg border border-border max-h-48 overflow-y-auto">
              <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                {segments.map((seg) => `${seg.speaker}: ${seg.text}`).join("\n\n")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Segmentos - Responsivo */}
      <div className="px-4 sm:px-6 py-4 sm:py-6">
        <h2 className="font-semibold text-sm sm:text-base text-foreground mb-3 sm:mb-4">Segmentos</h2>
        <div className="space-y-2 sm:space-y-3">
          {segments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum segmento disponível
            </div>
          ) : (
            segments.map((segment) => (
              <div
                key={segment.id}
                className={`p-3 sm:p-4 rounded-lg border transition-colors cursor-pointer ${
                  currentSegment?.id === segment.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = segment.start;
                  }
                }}
              >
                <div className="flex items-start justify-between gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 sm:gap-2 mb-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-medium text-primary">
                        {formatTime(segment.start)}
                      </span>
                      <span className="text-xs text-muted-foreground">→</span>
                      <span className="text-xs sm:text-sm font-medium text-primary">
                        {formatTime(segment.end)}
                      </span>
                      <span className="text-xs px-2 py-1 bg-accent/20 rounded text-accent-foreground">
                        {segment.speaker}
                      </span>
                    </div>

                    {editingSegmentId === segment.id ? (
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full p-2 border border-border rounded bg-background text-foreground text-xs sm:text-sm"
                        rows={2}
                        autoFocus
                      />
                    ) : (
                      <p className="text-xs sm:text-sm text-foreground break-words">{segment.text}</p>
                    )}
                  </div>

                  <div className="flex gap-1 flex-shrink-0">
                    {editingSegmentId === segment.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => saveSegmentEdit(segment.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelSegmentEdit}
                          className="h-8 w-8 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditSegment(segment)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteSegment(segment.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Audio element */}
      <audio ref={audioRef} />
    </div>
  );
}
