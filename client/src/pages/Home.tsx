import { useState } from "react";
import { Upload, Link as LinkIcon, Loader2, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import TranscriptionEditor from "@/components/TranscriptionEditor";

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
}

export default function Home() {
  const [currentView, setCurrentView] = useState<"upload" | "editor">("upload");
  const [isLoading, setIsLoading] = useState(false);
  const [transcription, setTranscription] = useState<Transcription | null>(null);
  const [fileName, setFileName] = useState("");

  // Simular processamento de transcrição
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setFileName(file.name);

    // Simular delay de processamento
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Dados de exemplo simulando resposta da API Whisper
    const mockTranscription: Transcription = {
      id: Math.random().toString(36).substr(2, 9),
      fileName: file.name,
      text: "Olá e bem-vindo ao nosso podcast sobre criatividade. Hoje vamos falar sobre como as ferramentas de IA estão transformando o processo criativo. Muitos criadores estão usando transcrição de áudio para organizar suas ideias.",
      segments: [
        {
          id: 0,
          start: 0,
          end: 3.5,
          text: "Olá e bem-vindo ao nosso podcast sobre criatividade.",
          speaker: "Apresentador",
        },
        {
          id: 1,
          start: 3.8,
          end: 8.2,
          text: "Hoje vamos falar sobre como as ferramentas de IA estão transformando o processo criativo.",
          speaker: "Apresentador",
        },
        {
          id: 2,
          start: 8.5,
          end: 12.0,
          text: "Muitos criadores estão usando transcrição de áudio para organizar suas ideias.",
          speaker: "Apresentador",
        },
      ],
      createdAt: new Date(),
    };

    setTranscription(mockTranscription);
    setCurrentView("editor");
    setIsLoading(false);
  };

  const handleLinkSubmit = async (link: string) => {
    setIsLoading(true);
    setFileName(link);

    // Simular delay de processamento
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Dados de exemplo simulando resposta da API Whisper para YouTube
    const mockTranscription: Transcription = {
      id: Math.random().toString(36).substr(2, 9),
      fileName: link,
      text: "Este é um vídeo sobre produção de conteúdo criativo. A transcrição foi extraída automaticamente do vídeo do YouTube. Com a IA, você pode transcrever qualquer vídeo em segundos.",
      segments: [
        {
          id: 0,
          start: 0,
          end: 4.0,
          text: "Este é um vídeo sobre produção de conteúdo criativo.",
          speaker: "Criador",
        },
        {
          id: 1,
          start: 4.2,
          end: 8.5,
          text: "A transcrição foi extraída automaticamente do vídeo do YouTube.",
          speaker: "Criador",
        },
        {
          id: 2,
          start: 8.8,
          end: 12.0,
          text: "Com a IA, você pode transcrever qualquer vídeo em segundos.",
          speaker: "Criador",
        },
      ],
      createdAt: new Date(),
    };

    setTranscription(mockTranscription);
    setCurrentView("editor");
    setIsLoading(false);
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

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border/50"></div>
              <span className="text-sm text-muted-foreground">OU</span>
              <div className="flex-1 h-px bg-border/50"></div>
            </div>

            {/* Link Input Card */}
            <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
              <div className="p-8">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <LinkIcon className="w-4 h-4 inline mr-2" />
                      Cole um link de vídeo
                    </label>
                    <input
                      type="text"
                      placeholder="youtube.com | tiktok.com | facebook.com | ..."
                      disabled={isLoading}
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition disabled:opacity-50"
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && e.currentTarget.value) {
                          handleLinkSubmit(e.currentTarget.value);
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Cole o URL de um vídeo do YouTube, TikTok ou Facebook
                    </p>
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={(e) => {
                        const input = (e.currentTarget.parentElement?.parentElement?.querySelector(
                          'input[type="text"]'
                        ) as HTMLInputElement) || null;
                        if (input?.value) handleLinkSubmit(input.value);
                      }}
                      disabled={isLoading}
                      className="gap-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        "Transcrever"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Loading State */}
            {isLoading && (
              <Card className="bg-primary/10 border border-primary/20">
                <div className="p-6 flex items-center gap-4">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <div>
                    <p className="font-semibold text-foreground">Transcrevendo seu arquivo...</p>
                    <p className="text-sm text-muted-foreground">
                      Isso pode levar alguns segundos. Obrigado pela paciência!
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Features Section */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="font-semibold text-foreground mb-2">Rápido</h3>
              <p className="text-sm text-muted-foreground">
                Transcreva um vídeo de 10 minutos em menos de 1 minuto
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="font-semibold text-foreground mb-2">Preciso</h3>
              <p className="text-sm text-muted-foreground">
                99% de precisão em mais de 99 idiomas
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✏️</span>
              </div>
              <h3 className="font-semibold text-foreground mb-2">Editável</h3>
              <p className="text-sm text-muted-foreground">
                Editor interativo com sincronização de áudio
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-16 py-8 bg-card/30 backdrop-blur-sm">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© 2026 Transcription SaaS. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
