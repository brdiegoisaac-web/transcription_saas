import { useState } from "react";
import { Upload, Link as LinkIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import TranscriptionEditor from "@/components/TranscriptionEditor";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Transcription {
  id: string;
  text: string;
  segments: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
    speaker: string;
  }>;
  fileName: string;
  createdAt: Date;
  fileUrl?: string;
}

export default function Home() {
  const [currentView, setCurrentView] = useState<"upload" | "editor">("upload");
  const [isLoading, setIsLoading] = useState(false);
  const [transcription, setTranscription] = useState<Transcription | null>(null);
  const [fileName, setFileName] = useState("");
  const [inputLanguage, setInputLanguage] = useState<"pt" | "en" | "es">("pt");
  const [outputLanguage, setOutputLanguage] = useState<"pt" | "en" | "es">("pt");
  const transcribeMutation = trpc.transcription.transcribeFile.useMutation();
  const youTubeMutation = trpc.transcription.transcribeYouTube.useMutation();

  const languageOptions = [
    { code: "pt", label: "Português" },
    { code: "en", label: "Inglês" },
    { code: "es", label: "Espanhol" },
  ];

  // Processar arquivo de áudio/vídeo
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setFileName(file.name);

    try {
      // Criar URL do arquivo para reprodução
      const fileUrl = URL.createObjectURL(file);

      // Obter duração do áudio/vídeo
      const audio = new Audio();
      audio.src = fileUrl;

      let duration = 0;
      audio.addEventListener(
        "loadedmetadata",
        () => {
          duration = audio.duration;
        },
        { once: true }
      );

      // Aguardar carregamento dos metadados
      await new Promise<void>((resolve) => {
        if (audio.duration && audio.duration > 0) {
          duration = audio.duration;
          resolve();
          return;
        }

        const handleLoadedMetadata = () => {
          duration = audio.duration || 0;
          audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
          resolve();
        };

        audio.addEventListener("loadedmetadata", handleLoadedMetadata);

        setTimeout(() => {
          audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
          resolve();
        }, 5000);
      });

      // Se ainda não temos duração, usar um valor padrão
      if (!duration || duration === 0) {
        duration = 30; // 30 segundos como padrão
      }

      // Ler arquivo como base64
      const reader = new FileReader();
      const audioBase64 = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(",")[1];
          resolve(base64);
        };
        reader.readAsDataURL(file);
      });

      // Chamar API de transcrição real
      const transcriptionResult = await transcribeMutation.mutateAsync({
        audioBase64,
        fileName: file.name,
        inputLanguage,
        outputLanguage,
      });

      if (!transcriptionResult.success || !transcriptionResult.data) {
        throw new Error(transcriptionResult.error || "Erro ao transcrever áudio");
      }

      const mockTranscription: Transcription = {
        id: Math.random().toString(36).substr(2, 9),
        fileName: file.name,
        text: transcriptionResult.data.text,
        segments: transcriptionResult.data.segments,
        createdAt: new Date(),
      };

      // Passar o URL do arquivo para o editor
      setTranscription({ ...mockTranscription, fileUrl });
      setCurrentView("editor");
      toast.success("Áudio transcrito com sucesso!");
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao processar arquivo");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkSubmit = async (link: string) => {
    setIsLoading(true);
    setFileName(link);

    try {
      // Chamar API de transcrição do YouTube
      const result = await youTubeMutation.mutateAsync({
        youtubeUrl: link,
        inputLanguage,
        outputLanguage,
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || "Erro ao transcrever vídeo do YouTube");
      }

      const transcription: Transcription = {
        id: Math.random().toString(36).substr(2, 9),
        fileName: link,
        text: result.data.text,
        segments: result.data.segments,
        createdAt: new Date(),
      };

      setTranscription(transcription);
      setCurrentView("editor");
      toast.success("Vídeo do YouTube transcrito com sucesso!");
    } catch (error) {
      console.error("Erro ao processar link do YouTube:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao transcrever vídeo do YouTube");
    } finally {
      setIsLoading(false);
    }
  };

  if (currentView === "editor" && transcription) {
    return (
      <TranscriptionEditor
        transcription={transcription}
        onBack={() => {
          setCurrentView("upload");
          setTranscription(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">Transcription SaaS</h1>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition">
              Preços
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition">
              Suporte
            </a>
            <Button variant="outline" size="sm">
              Entrar
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-16 md:py-24">
        <div className="max-w-3xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Transcreva Áudio e Vídeo com IA
            </h2>
            <p className="text-lg text-muted-foreground mb-2">
              Converta qualquer arquivo de áudio ou vídeo em texto preciso em segundos.
            </p>
            <p className="text-sm text-muted-foreground">
              Suporta 99+ idiomas • Identificação de falantes • Exportação em múltiplos formatos
            </p>
          </div>

          {/* Language Selection */}
          <div className="mb-8 grid grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Idioma do Áudio
              </label>
              <select
                value={inputLanguage}
                onChange={(e) => setInputLanguage(e.target.value as "pt" | "en" | "es")}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
              >
                {languageOptions.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Idioma de Saída
              </label>
              <select
                value={outputLanguage}
                onChange={(e) => setOutputLanguage(e.target.value as "pt" | "en" | "es")}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
              >
                {languageOptions.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Upload Area */}
          <div className="space-y-6">
            {/* File Upload Card */}
            <Card className="border-2 border-dashed border-border/50 hover:border-primary/50 transition-colors bg-card/50 backdrop-blur-sm">
              <div className="p-12">
                <label className="flex flex-col items-center justify-center cursor-pointer">
                  <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                  <span className="text-lg font-semibold text-foreground mb-2">
                    Arraste e solte seu arquivo aqui
                  </span>
                  <span className="text-sm text-muted-foreground mb-4">
                    ou clique para selecionar
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Suporta MP3, MP4, MOV, WAV, M4A e outros formatos
                  </span>
                  <input
                    type="file"
                    accept="audio/*,video/*"
                    className="hidden"
                    disabled={isLoading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                </label>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
