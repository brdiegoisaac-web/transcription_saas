import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogIn, Mail, Github } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

export default function Login() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // Se já está autenticado, redirecionar para home
  useEffect(() => {
    if (!loading && user) {
      setLocation("/");
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full" />
        </div>
      </div>
    );
  }

  const loginUrl = getLoginUrl();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 mb-4">
            <span className="text-2xl font-bold text-white">C</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Criato</h1>
          <p className="text-gray-600">Transcreva áudio e vídeo com IA em segundos</p>
        </div>

        {/* Card de Login */}
        <Card className="p-8 shadow-lg border-0">
          {/* Opção de Login com Manus OAuth */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Faça login na sua conta</h2>
            <a href={loginUrl}>
              <Button className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold gap-2 mb-4">
                <LogIn className="w-5 h-5" />
                Entrar com Manus
              </Button>
            </a>
          </div>

          {/* Divisor */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">ou continue com</span>
            </div>
          </div>

          {/* Opções de Login Social (Placeholders) */}
          <div className="space-y-3 mb-6">
            <Button
              variant="outline"
              className="w-full h-11 border-gray-300 hover:bg-gray-50 gap-2"
              disabled
              title="Em breve"
            >
              <Mail className="w-5 h-5" />
              Email
            </Button>
            <Button
              variant="outline"
              className="w-full h-11 border-gray-300 hover:bg-gray-50 gap-2"
              disabled
              title="Em breve"
            >
              <Github className="w-5 h-5" />
              GitHub
            </Button>
          </div>

          {/* Informações de Privacidade */}
          <p className="text-xs text-gray-500 text-center">
            Ao fazer login, você concorda com nossos{" "}
            <a href="#" className="text-blue-600 hover:underline">
              Termos de Serviço
            </a>{" "}
            e{" "}
            <a href="#" className="text-blue-600 hover:underline">
              Política de Privacidade
            </a>
          </p>
        </Card>

        {/* Benefícios */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600 mb-1">99+</div>
            <p className="text-xs text-gray-600">Idiomas suportados</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600 mb-1">⚡</div>
            <p className="text-xs text-gray-600">Processamento rápido</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600 mb-1">🔒</div>
            <p className="text-xs text-gray-600">Dados seguros</p>
          </div>
        </div>
      </div>
    </div>
  );
}
