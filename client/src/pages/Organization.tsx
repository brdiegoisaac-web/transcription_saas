import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

interface Category {
  id: number;
  name: string;
  description?: string;
  createdAt: Date;
}

interface Competitor {
  id: number;
  name: string;
  description?: string;
  website?: string;
  adAccountUrl?: string;
  notes?: string;
  createdAt: Date;
}

function CategoryCard({ category, competitors, onAddCompetitor, onDeleteCompetitor }: any) {
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    website: "",
    adAccountUrl: "",
    notes: "",
  });

  const createMutation = trpc.competitors.createCompetitor.useMutation();

  const handleAddCompetitor = async () => {
    if (!formData.name.trim()) {
      toast.error("Nome do concorrente é obrigatório");
      return;
    }

    try {
      await createMutation.mutateAsync({
        categoryId: category.id,
        name: formData.name,
        description: formData.description || undefined,
        website: formData.website || undefined,
        adAccountUrl: formData.adAccountUrl || undefined,
        notes: formData.notes || undefined,
      });

      toast.success("Concorrente adicionado!");
      setFormData({ name: "", description: "", website: "", adAccountUrl: "", notes: "" });
      setShowForm(false);
      onAddCompetitor();
    } catch (error) {
      toast.error("Erro ao adicionar concorrente");
    }
  };

  return (
    <Card className="p-6 mb-4">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground">{category.name}</h3>
          {category.description && (
            <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{competitors.length} concorrentes</Badge>
          <button className="p-2 hover:bg-secondary rounded transition">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-6 space-y-4">
          {competitors.map((competitor: Competitor) => (
            <div
              key={competitor.id}
              className="flex items-start justify-between p-4 bg-secondary/50 rounded-lg border border-border"
            >
              <div className="flex-1">
                <h4 className="font-medium text-foreground">{competitor.name}</h4>
                {competitor.description && (
                  <p className="text-sm text-muted-foreground mt-1">{competitor.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {competitor.website && (
                    <a
                      href={competitor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Site <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {competitor.adAccountUrl && (
                    <a
                      href={competitor.adAccountUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Anúncios <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                {competitor.notes && (
                  <p className="text-xs text-muted-foreground mt-2 italic">"{competitor.notes}"</p>
                )}
              </div>
              <button
                onClick={() => onDeleteCompetitor(competitor.id)}
                className="p-2 hover:bg-destructive/10 rounded transition text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {showForm ? (
            <div className="p-4 bg-secondary/50 rounded-lg border border-border space-y-3">
              <input
                type="text"
                placeholder="Nome do concorrente"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <input
                type="text"
                placeholder="Descrição (opcional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <input
                type="url"
                placeholder="Website (opcional)"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <input
                type="url"
                placeholder="URL da conta de anúncios (opcional)"
                value={formData.adAccountUrl}
                onChange={(e) => setFormData({ ...formData, adAccountUrl: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <textarea
                placeholder="Notas (opcional)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddCompetitor}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Adicionando..." : "Adicionar"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(true)}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Concorrente
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

export default function Competitors() {
  const [, setLocation] = useLocation();
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");

  const categoriesQuery = trpc.competitors.listCategories.useQuery();
  const competitorsQuery = trpc.competitors.listCompetitors.useQuery(
    { categoryId: 0 },
    { enabled: false }
  );
  const createCategoryMutation = trpc.competitors.createCategory.useMutation();

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }

    try {
      await createCategoryMutation.mutateAsync({
        name: categoryName,
        description: categoryDescription || undefined,
      });

      toast.success("Categoria criada!");
      setCategoryName("");
      setCategoryDescription("");
      setShowCategoryForm(false);
      categoriesQuery.refetch();
    } catch (error) {
      toast.error("Erro ao criar categoria");
    }
  };

  const categories = categoriesQuery.data || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation("/")} className="flex items-center gap-3 hover:opacity-80 transition">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <h1 className="text-xl font-bold text-foreground">Transcription SaaS</h1>
            </button>
          </div>
          <nav className="flex items-center gap-6">
            <button
              onClick={() => setLocation("/history")}
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              Histórico
            </button>
            <button
              onClick={() => setLocation("/competitors")}
              className="text-sm font-semibold text-foreground"
            >
              Concorrentes
            </button>
            <button
              onClick={() => setLocation("/profile")}
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              Perfil
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Organização de Criativos</h1>
              <p className="text-gray-600">Organize seus criativos por concorrente e categoria para melhor análise</p>
            </div>
            <Button
              onClick={() => setShowCategoryForm(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Nova Categoria
            </Button>
          </div>

          {showCategoryForm && (
            <Card className="p-6 mb-8">
              <h3 className="text-lg font-semibold text-foreground mb-4">Nova Categoria</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Nome da categoria (ex: E-commerce, SaaS, Fintech)"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <textarea
                  placeholder="Descrição (opcional)"
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateCategory}
                    disabled={createCategoryMutation.isPending}
                  >
                    {createCategoryMutation.isPending ? "Criando..." : "Criar Categoria"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCategoryForm(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {categoriesQuery.isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando categorias...</p>
            </div>
          ) : categories.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">Nenhuma categoria criada ainda</p>
              <Button onClick={() => setShowCategoryForm(true)}>
                Criar Primeira Categoria
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  competitors={[]}
                  onAddCompetitor={() => categoriesQuery.refetch()}
                  onDeleteCompetitor={() => categoriesQuery.refetch()}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
