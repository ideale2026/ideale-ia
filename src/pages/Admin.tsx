import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProducts } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Trash2, Plus, LogOut, Search, Copy, Download, FolderTree } from "lucide-react";
import { toast } from "sonner";
import AdminImageManager from "@/components/AdminImageManager";
import AdminImporter from "@/components/AdminImporter";
import AdminCategoryManager from "@/components/AdminCategoryManager";

interface ProductFormData {
  name: string;
  price: string;
  description: string;
  category_id: string;
  strategy_id: string;
  calculator_metadata: string;
}

const emptyForm: ProductFormData = {
  name: "", price: "", description: "", category_id: "", strategy_id: "",
  calculator_metadata: "{}",
};

export default function Admin() {
  const { signOut } = useAuth();
  const { data: products, isLoading } = useProducts();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormData>(emptyForm);
  const [categories, setCategories] = useState<{ id: string; name: string; parent_id: string | null }[]>([]);
  const [strategies, setStrategies] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchMeta = () => {
    supabase.from("categories").select("id, name, parent_id").order("name").then(({ data }) => data && setCategories(data));
    supabase.from("calculation_strategies").select("id, name, slug").then(({ data }) => data && setStrategies(data));
  };

  useEffect(() => { fetchMeta(); }, []);

  const filtered = products?.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (product: NonNullable<typeof products>[0]) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      price: String(product.price),
      description: product.description || "",
      category_id: product.category_id || "",
      strategy_id: product.strategy_id,
      calculator_metadata: JSON.stringify(product.calculator_metadata, null, 2),
    });
    setDialogOpen(true);
  };

  const openDuplicate = (product: NonNullable<typeof products>[0]) => {
    setEditingId(null);
    setForm({
      name: `${product.name} (Cópia)`,
      price: String(product.price),
      description: product.description || "",
      category_id: product.category_id || "",
      strategy_id: product.strategy_id,
      calculator_metadata: JSON.stringify(product.calculator_metadata, null, 2),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.strategy_id) {
      toast.error("Preencha nome, preço e estratégia");
      return;
    }

    let metaJson: Record<string, unknown>;
    try {
      metaJson = JSON.parse(form.calculator_metadata);
    } catch {
      toast.error("Metadata JSON inválido");
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name,
      price: parseFloat(form.price),
      description: form.description || null,
      category_id: form.category_id || null,
      strategy_id: form.strategy_id,
      calculator_metadata: metaJson as any,
    };

    if (editingId) {
      const { error } = await supabase.from("products").update(payload).eq("id", editingId);
      if (error) toast.error(error.message);
      else toast.success("Produto atualizado!");
    } else {
      const { error, data } = await supabase.from("products").insert(payload).select("id").single();
      if (error) toast.error(error.message);
      else {
        toast.success("Produto criado! Agora adicione as imagens.");
        setEditingId(data.id);
      }
    }

    setSaving(false);
    setDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este produto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Produto excluído");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    }
  };

  const selectedStrategy = strategies.find((s) => s.id === form.strategy_id);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Painel Administrativo
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { signOut(); navigate("/"); }}>
              <LogOut className="mr-1 h-4 w-4" /> Sair
            </Button>
          </div>
        </div>

        <Tabs defaultValue="produtos">
          <TabsList className="mb-6">
            <TabsTrigger value="produtos">Produtos</TabsTrigger>
            <TabsTrigger value="categorias" className="gap-1">
              <FolderTree className="h-3.5 w-3.5" /> Categorias
            </TabsTrigger>
            <TabsTrigger value="importar" className="gap-1">
              <Download className="h-3.5 w-3.5" /> Importar do Site
            </TabsTrigger>
          </TabsList>

          {/* ── Produtos Tab ── */}
          <TabsContent value="produtos">
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar produtos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={openCreate}>
                <Plus className="mr-1 h-4 w-4" /> Novo Produto
              </Button>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Foto</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden md:table-cell">Categoria</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : filtered?.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum produto encontrado</TableCell></TableRow>
                  ) : (
                    filtered?.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <img src={p.image_url || "/placeholder.svg"} alt="" className="h-10 w-10 rounded object-cover bg-secondary" />
                        </TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{p.categories?.name || "—"}</TableCell>
                        <TableCell>R$ {Number(p.price).toFixed(2).replace(".", ",")}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Editar">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openDuplicate(p)} title="Duplicar">
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} title="Excluir">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ── Categorias Tab ── */}
          <TabsContent value="categorias">
            <AdminCategoryManager />
          </TabsContent>

          {/* ── Importar Tab ── */}
          <TabsContent value="importar">
            <AdminImporter />
          </TabsContent>
        </Tabs>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: "var(--font-display)" }}>
                {editingId ? "Editar Produto" : "Novo Produto"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Preço (R$) *</Label>
                  <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Categoria</Label>
                  <Select
                    value={form.category_id || "none"}
                    onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? "" : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Sem categoria —</SelectItem>
                      {categories
                        .filter((c) => !c.parent_id)
                        .map((parent) => {
                          const subs = categories.filter((c) => c.parent_id === parent.id);
                          return (
                            <div key={parent.id}>
                              <SelectItem value={parent.id} className="font-semibold">
                                {parent.name}
                              </SelectItem>
                              {subs.map((sub) => (
                                <SelectItem key={sub.id} value={sub.id} className="pl-6 text-muted-foreground">
                                  ↳ {sub.name}
                                </SelectItem>
                              ))}
                            </div>
                          );
                        })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>

              {editingId && (
                <AdminImageManager productId={editingId} />
              )}
              {!editingId && (
                <p className="text-xs text-muted-foreground">Salve o produto primeiro para adicionar imagens.</p>
              )}

              <div className="space-y-1">
                <Label>Estratégia de Cálculo *</Label>
                <Select value={form.strategy_id} onValueChange={(v) => setForm({ ...form, strategy_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {strategies.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedStrategy && selectedStrategy.slug !== "SIMPLE_UNIT" && (
                <div className="space-y-1">
                  <Label>
                    Configuração da Fórmula (JSON)
                    <span className="ml-2 text-xs text-muted-foreground">
                      {selectedStrategy.slug === "WALLPAPER_ROLL"
                        ? 'Ex: {"coverage_factor": 4.3}'
                        : 'Ex: {"unit_coverage": 0.14}'}
                    </span>
                  </Label>
                  <Textarea
                    value={form.calculator_metadata}
                    onChange={(e) => setForm({ ...form, calculator_metadata: e.target.value })}
                    rows={3}
                    className="font-mono text-sm"
                  />
                </div>
              )}

              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : editingId ? "Salvar Alterações" : "Criar Produto"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
