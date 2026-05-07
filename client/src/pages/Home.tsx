import { useState } from "react";
import { Upload, Loader2, AlertCircle, Zap, Globe, FileText } from "lucide-react";
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

function OrganizationButton() {
  const [, setLocation] = useLocation();
  return (
    <Button variant="outline" size="sm" onClick={() => setLocation("/organization")} className="hover-shadow">
      Organização
    </Button>
  );
}

function ProfileButton() {
  const [, setLocation] = useLocation();
  return (
    <Button variant="outline" size="sm" onClick={() => setLocation("/profile")} className="hover-shadow">
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

      // Se ainda não temos duração, usar um valor padrão
      if (!duration || duration === 0) {
        duration = 30; // 30 segundos como padrão
      }

      // Validar duração máxima
      if (duration > MAX_DURATION) {
        throw new Error(
          `Arquivo muito longo. Máximo: ${formatDuration(MAX_DURATION)} (seu arquivo: ${formatDuration(Math.ceil(duration))})`
        );
      }

      setUploadProgress(40);

      // Fazer upload para o servidor
      const formData = new FormData();
      formData.append("file", file);
      formData.append("inputLanguage", inputLanguage);
      formData.append("outputLanguage", outputLanguage);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Erro ao fazer upload");
      }

      setUploadProgress(60);

      setUploadProgress(80);

      // Converter arquivo para base64
      const reader = new FileReader();
      const audioBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Chamar API de transcrição
      const result = await transcribeMutation.mutateAsync({
        audioBase64,
        fileName: file.name,
        inputLanguage,
        outputLanguage,
      });

      setUploadProgress(100);

      // Processar resultado
      if (result.success && result.data) {
        setTranscription({
          id: crypto.randomUUID(),
          text: result.data.text,
          segments: result.data.segments,
          fileName: file.name,
          createdAt: new Date(),
        });
      } else {
        throw new Error(result.error || "Erro ao transcrever");
      }

      setCurrentView("editor");
      toast.success("Transcrição concluída com sucesso!");
    } catch (error) {
      let errorMessage = "Erro ao processar arquivo";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      if (errorMessage.includes("timeout")) {
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
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-md hover-scale">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Criato</h1>
          </div>
          <nav className="flex items-center gap-4">
            <OrganizationButton />
            <ProfileButton />
            <Button size="sm" className="bg-gradient-to-r from-primary to-accent hover:shadow-lg transition-all duration-200">
              Entrar
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16 space-y-6">
            <div className="inline-block px-4 py-2 bg-accent/10 rounded-full border border-accent/20">
              <p className="text-sm font-medium text-accent">✨ Powered by AI</p>
            </div>
            
            <h2 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent leading-tight">
              Transcreva Áudio e Vídeo com IA
            </h2>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Converta qualquer arquivo de áudio ou vídeo em texto preciso em segundos. Suporte a 99+ idiomas com identificação automática de falantes.
            </p>

            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground pt-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent" />
                <span>Processamento Rápido</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-accent" />
                <span>99+ Idiomas</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent" />
                <span>Múltiplos Formatos</span>
              </div>
            </div>
          </div>

          {/* Language Selection */}
          <div className="mb-10 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-foreground">
                Idioma do Áudio
              </label>
              <select
                value={inputLanguage}
                onChange={(e) => setInputLanguage(e.target.value as "pt" | "en" | "es")}
                className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {languageOptions.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-foreground">
                Idioma de Saída
              </label>
              <select
                value={outputLanguage}
                onChange={(e) => setOutputLanguage(e.target.value as "pt" | "en" | "es")}
                className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200 shadow-sm hover:shadow-md"
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
            <Card className="border-2 border-dashed border-border/50 hover:border-primary/50 transition-all duration-300 bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm hover:shadow-lg">
              <div className="p-12 md:p-16">
                <label className="flex flex-col items-center justify-center cursor-pointer group">
                  <div className="p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full mb-6 group-hover:shadow-lg transition-all duration-300">
                    <Upload className="w-8 h-8 text-accent" />
                  </div>
                  <span className="text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    Arraste e solte seu arquivo
                  </span>
                  <span className="text-muted-foreground mb-4">
                    ou clique para selecionar
                  </span>
                  <span className="text-xs text-muted-foreground text-center">
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
            <Card className="bg-gradient-to-br from-card/50 to-card/30 border border-border/50 p-8 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-foreground">Formatos Suportados</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-accent rounded-full"></div>
                      <p className="text-sm font-semibold text-foreground">Áudio</p>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      MP3, WAV, M4A, AAC, OGG, Opus, FLAC, WMA, ALAC
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-accent rounded-full"></div>
                      <p className="text-sm font-semibold text-foreground">Vídeo</p>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      MP4, MOV, AVI, MKV, WebM, FLV, WMV, 3GP, OGV
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Progress Bar */}
            {isLoading && uploadProgress > 0 && (
              <div className="space-y-3 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Processando...</p>
                  <p className="text-sm text-muted-foreground">{uploadProgress}%</p>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Error Message */}
            {transcribeMutation.isPending && (
              <Card className="bg-primary/5 border border-primary/20 p-4 flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <p className="text-sm text-foreground">Transcrevendo seu arquivo...</p>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
