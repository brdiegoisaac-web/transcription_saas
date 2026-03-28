import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { ArrowLeft, User, Mail, LogOut, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Profile() {
  const { user, loading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simular salvamento (integrar com API real depois)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Perfil atualizado com sucesso!");
      setIsEditing(false);
    } catch (error) {
      toast.error("Erro ao atualizar perfil");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Simular exclusão (integrar com API real depois)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Conta deletada com sucesso");
      logout();
      setLocation("/");
    } catch (error) {
      toast.error("Erro ao deletar conta");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-40 bg-background/95 backdrop-blur">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="flex-shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-semibold text-foreground text-lg">Meu Perfil</h1>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        {/* Card de Informações Pessoais */}
        <Card className="p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Informações Pessoais</h2>
              <p className="text-sm text-muted-foreground">Gerencie seus dados de perfil</p>
            </div>
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                Editar
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-4 pb-4 border-b border-border">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{user.name || "Usuário"}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            {/* Formulário */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Nome</label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing}
                  className="w-full"
                  placeholder="Seu nome completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!isEditing}
                  className="w-full"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            {/* Botões de Ação */}
            {isEditing && (
              <div className="flex gap-2 pt-4 border-t border-border">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Card de Segurança */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Segurança</h2>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start gap-2" disabled title="Em breve">
              <Mail className="w-4 h-4" />
              Alterar Senha
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" disabled title="Em breve">
              <span className="text-lg">🔐</span>
              Autenticação de Dois Fatores
            </Button>
          </div>
        </Card>

        {/* Card de Ações */}
        <Card className="p-6 border-red-200">
          <h2 className="text-xl font-semibold text-foreground mb-4">Ações Perigosas</h2>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Fazer Logout
            </Button>

            {!showDeleteConfirm ? (
              <Button
                variant="destructive"
                className="w-full justify-start gap-2"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4" />
                Deletar Conta e Dados
              </Button>
            ) : (
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-900 mb-3 font-semibold">
                  Tem certeza? Esta ação não pode ser desfeita. Todos os seus dados serão deletados permanentemente.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="gap-2"
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Deletar Permanentemente
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
