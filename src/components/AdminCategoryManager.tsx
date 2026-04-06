import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

interface CategoryFormData {
  name: string;
  slug: string;
  parent_id: string;
}

const emptyForm: CategoryFormData = { name: "", slug: "", parent_id: "" };

function toSlug(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminCategoryManager() {
  const queryClient = useQueryClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, parent_id")
      .order("name", { ascending: true });
    if (error) toast.error(error.message);
    else setCategories(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const roots = categories.filter((c) => !c.parent_id);
  const childrenOf = (id: string) => categories.filter((c) => c.parent_id === id);

  const openCreate = (parentId?: string) => {
    setEditingId(null);
    setSlugManuallyEdited(false);
    setForm({ name: "", slug: "", parent_id: parentId || "" });
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setSlugManuallyEdited(true);
    setForm({ name: cat.name, slug: cat.slug, parent_id: cat.parent_id || "" });
    setDialogOpen(true);
  };

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: slugManuallyEdited ? prev.slug : toSlug(name),
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error("Nome e slug são obrigatórios");
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      parent_id: form.parent_id || null,
    };

    if (editingId) {
      const { error } = await supabase.from("categories").update(payload).eq("id", editingId);
      if (error) toast.error(error.message);
      else toast.success("Categoria atualizada!");
    } else {
      const { error } = await supabase.from("categories").insert(payload);
      if (error) toast.error(error.message);
      else toast.success("Categoria criada!");
    }

    setSaving(false);
    setDialogOpen(false);
    fetchCategories();
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const handleDelete = async (id: string) => {
    // Check for subcategories
    const hasChildren = categories.some((c) => c.parent_id === id);
    if (hasChildren) {
      toast.error("Remova as subcategorias antes de excluir esta categoria.");
      return;
    }
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Categoria excluída");
      fetchCategories();
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Gerencie as categorias e subcategorias da loja.
        </p>
        <Button size="sm" onClick={() => openCreate()}>
          <Plus className="mr-1 h-4 w-4" /> Nova Categoria
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="hidden md:table-cell">Tipo</TableHead>
              <TableHead className="w-32">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : roots.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhuma categoria cadastrada
                </TableCell>
              </TableRow>
            ) : (
              roots.map((cat) => {
                const subs = childrenOf(cat.id);
                return (
                  <>
                    {/* Root category row */}
                    <TableRow key={cat.id} className="bg-muted/30">
                      <TableCell className="font-semibold text-foreground">
                        {cat.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {cat.slug}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="default" className="text-xs">Principal</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Adicionar subcategoria"
                            onClick={() => openCreate(cat.id)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Editar"
                            onClick={() => openEdit(cat)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="Excluir">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. Produtos vinculados perderão a categoria.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(cat.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Subcategory rows */}
                    {subs.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="text-sm pl-8 flex items-center gap-1.5">
                          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          {sub.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {sub.slug}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="secondary" className="text-xs">Subcategoria</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Editar"
                              onClick={() => openEdit(sub)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" title="Excluir">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir subcategoria?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. Produtos vinculados perderão a categoria.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(sub.id)}>
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-display)" }}>
              {editingId ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ex: Papéis de Parede"
              />
            </div>

            <div className="space-y-1">
              <Label>
                Slug *
                <span className="ml-2 text-xs text-muted-foreground">
                  (gerado automaticamente a partir do nome)
                </span>
              </Label>
              <Input
                value={form.slug}
                onChange={(e) => {
                  setSlugManuallyEdited(true);
                  setForm((prev) => ({ ...prev, slug: e.target.value }));
                }}
                placeholder="ex: papeis-de-parede"
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label>Categoria pai</Label>
              <Select
                value={form.parent_id || "none"}
                onValueChange={(v) => setForm((prev) => ({ ...prev, parent_id: v === "none" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma (categoria principal)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (categoria principal)</SelectItem>
                  {roots
                    .filter((c) => c.id !== editingId)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editingId ? "Salvar Alterações" : "Criar Categoria"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
