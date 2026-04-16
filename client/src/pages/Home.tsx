import { useState } from "react";
import { Upload, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import TranscriptionEditor from "@/components/TranscriptionEditor";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  ALL_SUPPORTED_FORMATS,
  SUPPORTED_MIME_TYPES,
  MAX_FILE_SIZE,
  MAX_DURATION,
  formatSizeInMB,
  formatDuration,
  isFormatSupported,
} from "@/lib/audioFormats";

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

function HistoryButton() {
  const [, setLocation] = useLocation();
  return (
    <Button variant="outline" size="sm" onClick={() => setLocation("/history")}>
      Histórico
    </Button>
  );
}

function ProfileButton() {
  const [, setLocation] = useLocation();
  return (
    <Button variant="outline" size="sm" onClick={() => setLocation("/profile")}>
      Perfil
    </Button>
  );
}

export default function Home() {
  const [currentView, setCurrentView] = useState<"upload" | "editor">("upload");
  const [isLoading, setIsLoading] = useState(false);
  const [transcription, setTranscription] = useState<Transcription | null>(null);
  const [fileName, setFileName] = useState("");
  const [inputLanguage, setInputLanguage] = useState<"pt" | "en" | "es">("pt");
  const [outputLanguage, setOutputLanguage] = useState<"pt" | "en" | "es">("pt");
  const [uploadProgress, setUploadProgress] = useState(0);
  const transcribeMutation = trpc.transcription.transcribeFile.useMutation();

  const languageOptions = [
    { code: "pt", label: "Português" },
    { code: "en", label: "Inglês" },
    { code: "es", label: "Espanhol" },
  ];

  // Processar arquivo de áudio/vídeo
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setFileName(file.name);
    setUploadProgress(0);

    try {
      // Validar tamanho do arquivo
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`Arquivo muito grande. Máximo: ${formatSizeInMB(MAX_FILE_SIZE)}MB`);
      }

      // Validar formato de áudio/vídeo
      if (!isFormatSupported(file.name)) {
        throw new Error(
          `Formato não suportado. Formatos aceitos:\n\nÁudio: mp3, wav, m4a, aac, ogg, opus, flac, wma\n\nVídeo: mp4, mov, avi, mkv, webm, flv, wmv`
        );
      }

      // Validar tipo MIME (permitir tipos desconhecidos se extensão for válida)
      if (file.type && !SUPPORTED_MIME_TYPES.includes(file.type)) {
        console.warn(`Tipo MIME desconhecido: ${file.type}, mas extensão é válida`);
      }

      setUploadProgress(20);

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

      setUploadProgress(40);

      // Validar duração máxima
      if (duration > MAX_DURATION) {
        throw new Error(`Áudio muito longo. Máximo: ${formatDuration(MAX_DURATION)}`);
      }

      if (!duration || duration === 0) {
        throw new Error("Não foi possível determinar a duração do áudio");
      }

      setUploadProgress(80);

      // Chamar API de transcrição real usando FormData
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", file.name);
      formData.append("inputLanguage", inputLanguage);
      formData.append("outputLanguage", outputLanguage);
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Upload Error Response]", response.status, errorText);
        throw new Error(`Erro ao fazer upload: ${response.status} - ${response.statusText}`);
      }
      
      let transcriptionResult;
      try {
        transcriptionResult = await response.json();
      } catch (parseError) {
        console.error("[Parse Error]", parseError);
        throw new Error("Erro ao processar resposta do servidor");
      }

      setUploadProgress(95);

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
      setUploadProgress(100);
      toast.success("Áudio transcrito com sucesso!");
    } catch (error) {
      console.error("[handleFileUpload Error]", error);
      
      let errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      
      if (errorMessage.includes("fetch failed")) {
        errorMessage = "Erro de conexao com o servidor. Tente novamente.";
      } else if (errorMessage.includes("413")) {
        errorMessage = "Arquivo muito grande. Maximo: 100MB";
      } else if (errorMessage.includes("timeout")) {
        errorMessage = "Transcricao demorou muito. Tente com arquivo menor.";
      }
      
      toast.error(`Erro ao processar arquivo: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
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
            <HistoryButton />
            <ProfileButton />
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
          <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
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
              <div className="p-8 md:p-12">
                <label className="flex flex-col items-center justify-center cursor-pointer">
                  <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                  <span className="text-lg font-semibold text-foreground mb-2">
                    Arraste e solte seu arquivo aqui
                  </span>
                  <span className="text-sm text-muted-foreground mb-4">
                    ou clique para selecionar
                  </span>
                  <span className="text-xs text-muted-foreground text-center mb-2">
                    Máximo: {formatSizeInMB(MAX_FILE_SIZE)}MB • Duração: até {formatDuration(MAX_DURATION)}
                  </span>
                  <input
                    type="file"
                    accept={ALL_SUPPORTED_FORMATS.map((fmt) => `.${fmt}`).join(",")}
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

            {/* Supported Formats Info */}
            <Card className="bg-card/50 border border-border/50 p-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Formatos Suportados</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Áudio</p>
                    <p className="text-sm text-foreground">
                      MP3, WAV, M4A, AAC, OGG, Opus, FLAC, WMA, ALAC
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Vídeo</p>
                    <p className="text-sm text-foreground">
                      MP4, MOV, AVI, MKV, WebM, FLV, WMV, 3GP, OGV
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Progress Bar */}
            {isLoading && uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {uploadProgress < 20
                      ? "Validando arquivo..."
                      : uploadProgress < 40
                      ? "Lendo duração..."
                      : uploadProgress < 60
                      ? "Preparando upload..."
                      : uploadProgress < 80
                      ? "Enviando para transcrição..."
                      : uploadProgress < 95
                      ? "Transcrevendo com IA..."
                      : "Finalizando..."}
                  </span>
                  <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center gap-3 py-8">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  Processando {fileName}...
                </span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
