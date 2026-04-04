import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Copy, Download, Play, Pause, MoreVertical, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import CreativeAnalysis from "@/components/CreativeAnalysis";

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

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
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

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

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

  const totalDuration = duration || (segments.length > 0 ? segments[segments.length - 1].end : 0);
  const currentSegment = segments.find(
    (seg) => currentTime >= seg.start && currentTime < seg.end
  );

  const startEditSegment = (segment: Segment) => {
    setEditingSegmentId(segment.id);
    setEditingText(segment.text);
  };

  const saveSegmentEdit = (segmentId: number) => {
    setSegments(
      segments.map((seg) =>
        seg.id === segmentId ? { ...seg, text: editingText } : seg
      )
    );
    setEditingSegmentId(null);
    setEditingText("");
    toast.success("Segmento atualizado");
  };

  const deleteSegment = (segmentId: number) => {
    setSegments(segments.filter((seg) => seg.id !== segmentId));
    toast.success("Segmento removido");
  };

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

    toast.success(`Exportado como ${exportFormat.toUpperCase()}`);
  };

  const handleCopyFullText = () => {
    const fullText = segments.map((seg) => `${seg.speaker}: ${seg.text}`).join("\n\n");
    navigator.clipboard.writeText(fullText);
    toast.success("Copiado para área de transferência");
  };

  const handleCopyAsParagraph = () => {
    const paragraphText = segments.map((seg) => seg.text).join(" ");
    navigator.clipboard.writeText(paragraphText);
    toast.success("Parágrafo copiado");
  };

  const saveMutation = trpc.history.save.useMutation();

  const handleSave = async () => {
    try {
      const fullText = segments.map((seg) => `${seg.speaker}: ${seg.text}`).join("\n\n");
      
      await saveMutation.mutateAsync({
        fileName: transcription.fileName,
        originalText: fullText,
        segments: segments,
        duration: totalDuration,
        inputLanguage: "pt",
        outputLanguage: "pt",
      });
      
      toast.success("Transcrição salva");
    } catch (error) {
      toast.error("Erro ao salvar");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header Minimalista */}
      <header className="border-b border-gray-100 sticky top-0 z-40 bg-white/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
                aria-label="Voltar"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="font-medium text-gray-900 truncate text-sm sm:text-base">
                  {transcription.fileName}
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(transcription.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <MoreVertical className="w-5 h-5 text-gray-600" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleCopyFullText}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar com quebras
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyAsParagraph}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar parágrafo único
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger className="w-20 border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="srt">SRT</SelectItem>
                  <SelectItem value="vtt">VTT</SelectItem>
                  <SelectItem value="txt">TXT</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>

              <button
                onClick={handleExport}
                className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
                aria-label="Exportar"
              >
                <Download className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Player Minimalista */}
      <div className="border-b border-gray-100 bg-gray-50/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-gray-900" />
              ) : (
                <Play className="w-5 h-5 text-gray-900" />
              )}
            </button>

            <div className="flex-1 min-w-0">
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
                className="w-full h-1 bg-gray-200 rounded-full appearance-none cursor-pointer accent-gray-900"
              />
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(totalDuration)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Segmentos */}
        <div className="mb-12">
          <h2 className="text-sm font-semibold text-gray-900 mb-6 uppercase tracking-wide">
            Transcrição
          </h2>
          
          <div className="space-y-3">
            {segments.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                Nenhum segmento disponível
              </div>
            ) : (
              segments.map((segment) => (
                <div
                  key={segment.id}
                  className={`p-4 rounded-lg border transition-all cursor-pointer ${
                    currentSegment?.id === segment.id
                      ? "border-gray-900 bg-gray-50"
                      : "border-gray-100 hover:border-gray-200 bg-white"
                  }`}
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.currentTime = segment.start;
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-gray-500">
                          {formatTime(segment.start)}
                        </span>
                        <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-700">
                          {segment.speaker}
                        </span>
                      </div>

                      {editingSegmentId === segment.id ? (
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full p-2 border border-gray-200 rounded text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                          rows={2}
                          autoFocus
                        />
                      ) : (
                        <p className="text-sm text-gray-700 leading-relaxed">{segment.text}</p>
                      )}
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      {editingSegmentId === segment.id ? (
                        <>
                          <button
                            onClick={() => saveSegmentEdit(segment.id)}
                            className="px-2 py-1 text-xs font-medium text-gray-900 hover:bg-gray-100 rounded transition-colors"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() => setEditingSegmentId(null)}
                            className="px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditSegment(segment)}
                            className="px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => deleteSegment(segment.id)}
                            className="px-2 py-1 text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
                          >
                            Remover
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end mb-12">
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg font-medium text-sm hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {saveMutation.isPending ? "Salvando..." : "Salvar Transcrição"}
          </button>
        </div>

        {/* Análise de Criativo */}
        <div className="border-t border-gray-100 pt-12">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="w-5 h-5 text-gray-900" />
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Análise de Criativo
            </h2>
          </div>
          <CreativeAnalysis
            text={segments.map((seg) => seg.text).join(" ")}
            segments={segments}
          />
        </div>
      </div>

      <audio ref={audioRef} />
    </div>
  );
}
