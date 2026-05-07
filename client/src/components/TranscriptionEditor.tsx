import { useState } from "react";
import { ArrowLeft, Copy, Download, Save, Edit2, Check, X, MoreVertical, Zap } from "lucide-react";
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
import AudioPlayer from "@/components/AudioPlayer";

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
  const linkCreativeMutation = trpc.competitors.linkCreative.useMutation();
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  
  // Carregar dados para o modal
  const { data: categories } = trpc.competitors.listCategories.useQuery();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const { data: competitors } = trpc.competitors.listCompetitors.useQuery(
    { categoryId: selectedCategoryId! },
    { enabled: !!selectedCategoryId }
  );

  const handleSaveToHistory = async () => {
    setIsSaving(true);
    try {
      const fullText = segments.map((seg: any) => `${seg.speaker}: ${seg.text}`).join("\n\n");
      
      const result = await saveMutation.mutateAsync({
        fileName: transcription.fileName,
        originalText: fullText,
        segments: segments,
        duration: segments.length > 0 ? segments[segments.length - 1].end : 0,
        inputLanguage: "pt",
        outputLanguage: "pt",
      });
      
      // Se selecionou um concorrente, associar como criativo
      if (selectedCompetitorId && result?.transcription?.id) {
        await linkCreativeMutation.mutateAsync({
          competitorId: selectedCompetitorId,
          transcriptionId: result.transcription.id,
          notes: notes,
        });
        toast.success("Criativo salvo e associado ao concorrente!");
      } else {
        toast.success("Transcrição salva com sucesso!");
      }
      
      setShowSaveModal(false);
      setSelectedCategoryId(null);
      setSelectedCompetitorId(null);
      setNotes("");
    } catch (error) {
      toast.error("Erro ao salvar transcrição");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (showSaveModal) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
          <h2 className="text-lg font-semibold text-blue-900">Salvar Criativo</h2>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Categoria (Opcional)</label>
              <select
                value={selectedCategoryId || ""}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value ? parseInt(e.target.value) : null);
                  setSelectedCompetitorId(null);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecionar categoria...</option>
                {categories?.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Concorrente (Opcional)</label>
              <select
                value={selectedCompetitorId || ""}
                onChange={(e) => setSelectedCompetitorId(e.target.value ? parseInt(e.target.value) : null)}
                disabled={!selectedCategoryId}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Selecionar concorrente...</option>
                {competitors?.map((comp: any) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Notas (Opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Anúncio principal, campanha de verão..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setShowSaveModal(false);
                setSelectedCategoryId(null);
                setSelectedCompetitorId(null);
                setNotes("");
              }}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveToHistory}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowSaveModal(true)}
      className="px-6 py-2 bg-blue-900 text-white rounded-lg font-medium text-sm hover:bg-blue-800 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
    >
      <Save className="w-4 h-4" />
      Salvar
    </button>
  );
}

export default function TranscriptionEditor({ transcription, onBack }: TranscriptionEditorProps) {
  const [segments, setSegments] = useState<Segment[]>(transcription.segments);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [currentSegment, setCurrentSegment] = useState<Segment | null>(null);
  const [editingSegmentId, setEditingSegmentId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCopyParagraph = () => {
    const text = segments.map((s) => s.text).join(" ");
    navigator.clipboard.writeText(text);
    toast.success("Parágrafo copiado!");
  };

  const handleExport = () => {
    const text = segments.map((s) => `[${formatTime(s.start)}] ${s.speaker}: ${s.text}`).join("\n\n");
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text));
    element.setAttribute("download", `${transcription.fileName}.txt`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("Exportado!");
  };

  const handleEditSegment = (segment: Segment) => {
    setEditingSegmentId(segment.id);
    setEditingText(segment.text);
  };

  const handleSaveEdit = (segmentId: number) => {
    setSegments(segments.map((s) => (s.id === segmentId ? { ...s, text: editingText } : s)));
    setEditingSegmentId(null);
    toast.success("Segmento atualizado!");
  };

  const handleDeleteSegment = (segmentId: number) => {
    setSegments(segments.filter((s) => s.id !== segmentId));
    toast.success("Segmento removido!");
  };

  const handleCancelEdit = () => {
    setEditingSegmentId(null);
    setEditingText("");
  };

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <header className="border-b border-blue-100 sticky top-0 z-50 bg-white/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                onClick={onBack}
                className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                aria-label="Voltar"
              >
                <ArrowLeft className="w-5 h-5 text-blue-900" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="font-medium text-blue-900 truncate text-sm sm:text-base">
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
                  <button className="p-2 hover:bg-blue-50 rounded-lg transition-colors">
                    <MoreVertical className="w-5 h-5 text-blue-900" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleCopyParagraph}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Parágrafo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExport}>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Player */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
        <AudioPlayer
          src={transcription.fileUrl}
          onTimeUpdate={setCurrentTime}
          onDurationChange={setTotalDuration}
        />
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Segmentos */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-blue-900 mb-4 uppercase tracking-wide">
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
                      ? "border-blue-900 bg-blue-50"
                      : "border-gray-200 hover:border-blue-200 bg-white"
                  }`}
                  onClick={() => setCurrentSegment(segment)}
                >
                  {editingSegmentId === segment.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full p-3 border border-blue-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(segment.id)}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-900 text-white rounded text-xs hover:bg-blue-800"
                        >
                          <Check className="w-3 h-3" />
                          Salvar
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-900 rounded text-xs hover:bg-gray-300"
                        >
                          <X className="w-3 h-3" />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-gray-500">
                          {formatTime(segment.start)}
                        </span>
                        <span className="text-xs px-2 py-1 bg-blue-100 rounded text-blue-900 font-medium">
                          {segment.speaker}
                        </span>
                        {currentTime >= segment.start && currentTime < segment.end && (
                          <span className="text-xs px-2 py-1 bg-blue-500 text-white rounded animate-pulse">
                            Reproduzindo
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-900 mb-3">{segment.text}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditSegment(segment)}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-blue-900 hover:bg-blue-50 rounded"
                        >
                          <Edit2 className="w-3 h-3" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteSegment(segment.id)}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                        >
                          <X className="w-3 h-3" />
                          Deletar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end mb-12">
          <SaveButton transcription={transcription} segments={segments} />
        </div>

        {/* Análise de Criativo */}
        <div className="border-t border-blue-100 pt-12">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="w-5 h-5 text-blue-900" />
            <h2 className="text-sm font-semibold text-blue-900 uppercase tracking-wide">
              Análise de Criativo
            </h2>
          </div>
          <CreativeAnalysis text={transcription.text} segments={segments} />
        </div>
      </main>
    </div>
  );
}
