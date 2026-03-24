import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Copy, Download, Play, Pause, Volume2, Save } from "lucide-react";
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
      className="gap-2"
      disabled={isSaving}
    >
      <Save className="w-4 h-4" />
      {isSaving ? "Salvando..." : "Salvar"}
    </Button>
  );
}

export default function TranscriptionEditor({
  transcription,
  onBack,
}: TranscriptionEditorProps) {
  const [segments, setSegments] = useState(transcription.segments);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [exportFormat, setExportFormat] = useState("srt");
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);

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

  // Copiar texto
  const handleCopyText = () => {
    const fullText = segments.map((seg) => `${seg.speaker}: ${seg.text}`).join("\n\n");
    navigator.clipboard.writeText(fullText);
    toast.success("Texto copiado para a área de transferência");
  };

  // Limpar ao sair
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header Simples */}
      <header className="border-b border-border/50 sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-semibold text-foreground">{transcription.fileName}</h1>
              <p className="text-xs text-muted-foreground">
                {new Date(transcription.createdAt).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCopyText}>
              <Copy className="w-4 h-4 mr-2" />
              Copiar
            </Button>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger className="w-20 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="srt">SRT</SelectItem>
                <SelectItem value="vtt">VTT</SelectItem>
                <SelectItem value="txt">TXT</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExport} size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Baixar
            </Button>
            <SaveButton transcription={transcription} segments={segments} />
          </div>
        </div>
      </header>

      {/* Main Content - Simples e Limpo */}
      <main className="container py-8 max-w-4xl">
        {/* Player Minimalista */}
        <div className="mb-12">
          {/* Waveform */}
          <div className="bg-secondary/30 rounded-lg p-4 h-20 flex items-end justify-center gap-0.5 mb-6">
            {Array.from({ length: 60 }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 rounded-full transition-all ${
                  currentTime > (i / 60) * totalDuration
                    ? "bg-primary"
                    : "bg-muted"
                }`}
                style={{
                  height: `${20 + Math.random() * 60}%`,
                }}
              />
            ))}
          </div>

          {/* Time Display */}
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
            <span className="font-mono">{formatTime(currentTime)}</span>
            <span className="font-mono">{formatTime(totalDuration)}</span>
          </div>

          {/* Progress Bar */}
          <div
            className="w-full bg-secondary rounded-full h-1 cursor-pointer relative group mb-6"
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
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newTime = Math.max(0, currentTime - 5);
                setCurrentTime(newTime);
                if (audioRef.current) audioRef.current.currentTime = newTime;
              }}
            >
              -5s
            </Button>
            <Button
              size="lg"
              onClick={() => setIsPlaying(!isPlaying)}
              className="rounded-full w-12 h-12"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newTime = Math.min(totalDuration, currentTime + 5);
                setCurrentTime(newTime);
                if (audioRef.current) audioRef.current.currentTime = newTime;
              }}
            >
              +5s
            </Button>
            <Button variant="outline" size="icon">
              <Volume2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Hidden Audio */}
          <audio
            ref={audioRef}
            crossOrigin="anonymous"
            onEnded={() => setIsPlaying(false)}
          />
        </div>

        {/* Texto Completo - Fácil de Copiar */}
        <div className="mb-8 p-6 bg-secondary/20 rounded-lg border border-border/30">
          <h3 className="text-sm font-semibold text-foreground mb-3">Transcrição Completa</h3>
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {segments.map((seg) => seg.text).join(" ")}
          </p>
        </div>

        {/* Transcrição - Texto Limpo */}
        <div className="space-y-6">
          <h3 className="text-sm font-semibold text-foreground">Segmentos com Timestamps</h3>
          {segments.map((segment) => (
            <div
              key={segment.id}
              className={`pb-6 border-b border-border/30 transition-all cursor-pointer hover:bg-secondary/20 p-4 rounded-lg ${
                currentSegment?.id === segment.id ? "bg-primary/5" : ""
              }`}
              onClick={() => {
                setCurrentTime(segment.start);
                if (audioRef.current) audioRef.current.currentTime = segment.start;
              }}
            >
              <div className="flex items-start gap-4">
                <div className="text-xs font-mono text-muted-foreground pt-1 min-w-fit">
                  {formatTime(segment.start)}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-primary mb-2">
                    {segment.speaker}
                  </p>
                  <p className="text-sm leading-relaxed text-foreground">
                    {segment.text}
                  </p>
                </div>
              </div>
            </div>
          ))}
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
