import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, Globe, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

// ── Source categories from idealepapeis.com.br ─────────────────────────────

const SOURCE_CATEGORIES = [
  {
    group: "Papéis de Parede",
    items: [
      { label: "Todos os Papéis de Parede", url: "https://ideale.lovable.app/papeis-de-parede/", strategySlug: "WALLPAPER_ROLL", meta: { coverage_factor: 4.3 } },
      { label: "↳ Geométricos", url: "https://ideale.lovable.app/papeis-de-parede/colecao-1/", strategySlug: "WALLPAPER_ROLL", meta: { coverage_factor: 4.3 } },
      { label: "↳ Linhos", url: "https://ideale.lovable.app/papeis-de-parede/colecao-2/", strategySlug: "WALLPAPER_ROLL", meta: { coverage_factor: 4.3 } },
      { label: "↳ Lisos", url: "https://ideale.lovable.app/papeis-de-parede/colecao-3/", strategySlug: "WALLPAPER_ROLL", meta: { coverage_factor: 4.3 } },
      { label: "↳ Tipo Mica", url: "https://ideale.lovable.app/papeis-de-parede/tipo-mica/", strategySlug: "WALLPAPER_ROLL", meta: { coverage_factor: 4.3 } },
      { label: "↳ Listrados", url: "https://ideale.lovable.app/papeis-de-parede/listrados/", strategySlug: "WALLPAPER_ROLL", meta: { coverage_factor: 4.3 } },
      { label: "↳ Tijolinho", url: "https://ideale.lovable.app/papeis-de-parede/tijolinho/", strategySlug: "WALLPAPER_ROLL", meta: { coverage_factor: 4.3 } },
      { label: "↳ Amadeirados", url: "https://ideale.lovable.app/papeis-de-parede/amadeirados/", strategySlug: "WALLPAPER_ROLL", meta: { coverage_factor: 4.3 } },
      { label: "↳ Infantil", url: "https://ideale.lovable.app/papeis-de-parede/infantil/", strategySlug: "WALLPAPER_ROLL", meta: { coverage_factor: 4.3 } },
      { label: "↳ Floral", url: "https://ideale.lovable.app/papeis-de-parede/floral/", strategySlug: "WALLPAPER_ROLL", meta: { coverage_factor: 4.3 } },
      { label: "↳ Marmorizados", url: "https://ideale.lovable.app/papeis-de-parede/marmorizados/", strategySlug: "WALLPAPER_ROLL", meta: { coverage_factor: 4.3 } },
      { label: "↳ Cimento Queimado", url: "https://ideale.lovable.app/papeis-de-parede/cimento-queimado/", strategySlug: "WALLPAPER_ROLL", meta: { coverage_factor: 4.3 } },
      { label: "↳ Damasco", url: "https://ideale.lovable.app/papeis-de-parede/damasco/", strategySlug: "WALLPAPER_ROLL", meta: { coverage_factor: 4.3 } },
      { label: "↳ Brancos Premium", url: "https://ideale.lovable.app/papeis-de-parede/brancos-premium/", strategySlug: "WALLPAPER_ROLL", meta: { coverage_factor: 4.3 } },
    ],
  },
  {
    group: "Painéis Ripados",
    items: [
      { label: "Todos os Painéis Ripados", url: "https://ideale.lovable.app/paineis-ripados/", strategySlug: "SIMPLE_UNIT", meta: {} },
      { label: "↳ Interno", url: "https://ideale.lovable.app/paineis-ripados/interno/", strategySlug: "SIMPLE_UNIT", meta: {} },
      { label: "↳ Externo", url: "https://ideale.lovable.app/paineis-ripados/externo/", strategySlug: "SIMPLE_UNIT", meta: {} },
    ],
  },
  {
    group: "Outros",
    items: [
      { label: "Pisos Vinílicos", url: "https://ideale.lovable.app/pisos-vinilicos/", strategySlug: "SIMPLE_UNIT", meta: {} },
      { label: "Jardins Artificiais", url: "https://ideale.lovable.app/jardins-artificiais/", strategySlug: "SIMPLE_UNIT", meta: {} },
      { label: "Placas Adesivas", url: "https://ideale.lovable.app/placas-adesivas/", strategySlug: "SIMPLE_UNIT", meta: {} },
      { label: "Rolos Adesivos", url: "https://ideale.lovable.app/rolos-adesivos/", strategySlug: "SIMPLE_UNIT", meta: {} },
    ],
  },
];

const ALL_SOURCE_ITEMS = SOURCE_CATEGORIES.flatMap((g) => g.items);

// ── Types ──────────────────────────────────────────────────────────────────

interface ListedProduct {
  name: string;
  url: string;
  slug: string;
  selected: boolean;
}

interface ImportResult {
  name: string;
  success: boolean;
  error?: string;
}

type Stage = "idle" | "listing" | "listed" | "importing" | "done";

export default function AdminImporter() {
  const queryClient = useQueryClient();

  // ── DB data ──────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [strategies, setStrategies] = useState<{ id: string; name: string; slug: string }[]>([]);

  useEffect(() => {
    supabase.from("categories").select("id, name, slug").then(({ data }) => data && setCategories(data));
    supabase.from("calculation_strategies").select("id, name, slug").then(({ data }) => data && setStrategies(data));
  }, []);

  // ── Selection ────────────────────────────────────────────────────────────
  const [sourceUrl, setSourceUrl] = useState("");
  const [targetCategoryId, setTargetCategoryId] = useState("none");
  const [targetStrategyId, setTargetStrategyId] = useState("");

  // When source changes, pre-fill strategy
  const handleSourceChange = (url: string) => {
    setSourceUrl(url);
    const src = ALL_SOURCE_ITEMS.find((i) => i.url === url);
    if (src) {
      const strat = strategies.find((s) => s.slug === src.strategySlug);
      if (strat) setTargetStrategyId(strat.id);
    }
  };

  // ── Stage / Progress ─────────────────────────────────────────────────────
  const [stage, setStage] = useState<Stage>("idle");
  const [listedProducts, setListedProducts] = useState<ListedProduct[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0, label: "" });
  const [results, setResults] = useState<ImportResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  // ── Step 1: List ─────────────────────────────────────────────────────────
  const handleList = async () => {
    if (!sourceUrl) { toast.error("Selecione uma categoria de origem"); return; }
    if (!targetStrategyId) { toast.error("Selecione a estratégia de cálculo"); return; }

    setStage("listing");
    setListedProducts([]);

    try {
      const { data, error } = await supabase.functions.invoke("scrape-ideale", {
        body: { action: "list", url: sourceUrl },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const products: ListedProduct[] = (data.products || []).map((p: { name: string; url: string; slug: string }) => ({
        ...p,
        selected: true,
      }));

      if (products.length === 0) {
        toast.warning("Nenhum produto encontrado nessa categoria.");
        setStage("idle");
        return;
      }

      setListedProducts(products);
      setStage("listed");
      toast.success(`${products.length} produtos encontrados!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao listar produtos";
      toast.error(msg);
      setStage("idle");
    }
  };

  // ── Step 2: Import ────────────────────────────────────────────────────────
  const handleImport = async () => {
    const selected = listedProducts.filter((p) => p.selected);
    if (selected.length === 0) { toast.error("Selecione ao menos um produto"); return; }

    const src = ALL_SOURCE_ITEMS.find((i) => i.url === sourceUrl);
    const strategy = strategies.find((s) => s.id === targetStrategyId);

    if (!strategy) { toast.error("Estratégia não encontrada"); return; }

    setStage("importing");
    setProgress({ current: 0, total: selected.length, label: "" });
    const importResults: ImportResult[] = [];

    for (let i = 0; i < selected.length; i++) {
      const listed = selected[i];
      setProgress({ current: i + 1, total: selected.length, label: listed.name });

      try {
        // 1. Scrape product details
        const { data: scrapeData, error: scrapeErr } = await supabase.functions.invoke("scrape-ideale", {
          body: { action: "scrape", url: listed.url },
        });

        if (scrapeErr) throw new Error(scrapeErr.message);
        if (scrapeData?.error) throw new Error(scrapeData.error);

        const prod = scrapeData.product;
        const metaJson = src?.meta ?? {};

        // 2. Insert product into DB
        const { data: insertedProduct, error: insertErr } = await supabase
          .from("products")
          .insert({
            name: prod.name,
            price: prod.price || 0,
            description: prod.description || null,
            category_id: targetCategoryId === "none" ? null : targetCategoryId || null,
            strategy_id: targetStrategyId,
            calculator_metadata: metaJson,
            image_url: prod.images?.[0] || null,
          })
          .select("id")
          .single();

        if (insertErr) throw new Error(insertErr.message);

        const productId = insertedProduct.id;

        // 3. Upload images to storage & insert into product_images
        if (prod.images && prod.images.length > 0) {
          const { data: uploadData } = await supabase.functions.invoke("scrape-ideale", {
            body: { action: "upload-images", productId, imageUrls: prod.images },
          });

          const hostedUrls: string[] = uploadData?.uploadedUrls || prod.images;

          for (let j = 0; j < hostedUrls.length; j++) {
            await supabase.from("product_images").insert({
              product_id: productId,
              image_url: hostedUrls[j],
              display_order: j,
            });
          }

          // Update main image_url with first hosted image
          if (hostedUrls[0]) {
            await supabase.from("products").update({ image_url: hostedUrls[0] }).eq("id", productId);
          }
        }

        importResults.push({ name: prod.name, success: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        importResults.push({ name: listed.name, success: false, error: msg });
        console.error(`Failed to import ${listed.name}:`, msg);
      }
    }

    setResults(importResults);
    setStage("done");
    queryClient.invalidateQueries({ queryKey: ["products"] });

    const success = importResults.filter((r) => r.success).length;
    const failed = importResults.filter((r) => !r.success).length;
    if (failed === 0) {
      toast.success(`${success} produtos importados com sucesso!`);
    } else {
      toast.warning(`${success} importados, ${failed} falharam.`);
    }
  };

  // ── Toggle all / single ──────────────────────────────────────────────────
  const toggleAll = (checked: boolean) => {
    setListedProducts((prev) => prev.map((p) => ({ ...p, selected: checked })));
  };

  const toggleOne = (slug: string, checked: boolean) => {
    setListedProducts((prev) =>
      prev.map((p) => (p.slug === slug ? { ...p, selected: checked } : p))
    );
  };

  const selectedCount = listedProducts.filter((p) => p.selected).length;
  const progressPct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Globe className="h-5 w-5 text-primary" />
        <div>
          <h2 className="font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Importar do Site Ideale
          </h2>
          <p className="text-sm text-muted-foreground">
            Mapeie e importe produtos diretamente de ideale.lovable.app
          </p>
        </div>
      </div>

  {/* Configuration panel */}
      {(stage === "idle" || stage === "listed") && (
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <h3 className="text-sm font-medium">Configuração da Importação</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Source category */}
            <div className="space-y-1">
              <Label>Categoria de Origem *</Label>
              <Select value={sourceUrl} onValueChange={handleSourceChange} disabled={stage === "listed"}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {SOURCE_CATEGORIES.map((group) => (
                    <div key={group.group}>
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {group.group}
                      </div>
                      {group.items.map((item) => (
                        <SelectItem key={item.url} value={item.url}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target category in our DB */}
            <div className="space-y-1">
              <Label>Categoria no Sistema</Label>
              <Select value={targetCategoryId} onValueChange={setTargetCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="(sem categoria)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Strategy */}
            <div className="space-y-1">
              <Label>Estratégia de Cálculo *</Label>
              <Select value={targetStrategyId} onValueChange={setTargetStrategyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {strategies.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleList} disabled={!sourceUrl || !targetStrategyId}>
            <Globe className="mr-2 h-4 w-4" /> Mapear Produtos
          </Button>
        </div>
      )}

      {/* Loading state for listing */}
      {stage === "listing" && (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Buscando produtos em todas as páginas da categoria...</p>
          <p className="text-xs">Isso pode levar alguns segundos</p>
        </div>
      )}

      {/* Product list */}
      {stage === "listed" && listedProducts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                id="select-all"
                checked={selectedCount === listedProducts.length}
                onCheckedChange={(c) => toggleAll(!!c)}
              />
              <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                Selecionar todos ({listedProducts.length} produtos)
              </label>
            </div>
            <Badge variant="secondary">{selectedCount} selecionados</Badge>
          </div>

          <div className="rounded-lg border max-h-[400px] overflow-y-auto">
            {listedProducts.map((p) => (
              <div
                key={p.slug}
                className="flex items-center gap-3 px-4 py-2.5 border-b last:border-0 hover:bg-muted/30"
              >
                <Checkbox
                  id={p.slug}
                  checked={p.selected}
                  onCheckedChange={(c) => toggleOne(p.slug, !!c)}
                />
                <label htmlFor={p.slug} className="flex-1 text-sm cursor-pointer truncate">
                  {p.name}
                </label>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary shrink-0"
                >
                  Ver ↗
                </a>
              </div>
            ))}
          </div>

          <Button
            className="w-full"
            onClick={handleImport}
            disabled={selectedCount === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Importar {selectedCount} produto{selectedCount !== 1 ? "s" : ""}
          </Button>
        </div>
      )}

      {/* Import progress */}
      {stage === "importing" && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{progress.label}</p>
              <p className="text-xs text-muted-foreground">
                Produto {progress.current} de {progress.total}
              </p>
            </div>
            <span className="text-sm font-mono text-muted-foreground shrink-0">{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            Aguarde — raspando dados e enviando fotos para o armazenamento…
          </p>
        </div>
      )}

      {/* Results */}
      {stage === "done" && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Importação concluída
            </h3>
            <div className="flex gap-2">
              <Badge variant="secondary">
                {results.filter((r) => r.success).length} OK
              </Badge>
              {results.filter((r) => !r.success).length > 0 && (
                <Badge variant="destructive">
                  {results.filter((r) => !r.success).length} falhas
                </Badge>
              )}
            </div>
          </div>

          {/* Failed list */}
          {results.some((r) => !r.success) && (
            <div className="space-y-1">
              <button
                className="text-xs text-muted-foreground flex items-center gap-1"
                onClick={() => setShowResults((v) => !v)}
              >
                {showResults ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Ver falhas
              </button>
              {showResults && (
                <div className="rounded border bg-destructive/5 p-2 space-y-1 max-h-40 overflow-y-auto">
                  {results.filter((r) => !r.success).map((r) => (
                    <div key={r.name} className="flex items-start gap-2 text-xs">
                      <AlertCircle className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
                      <span className="font-medium">{r.name}:</span>
                      <span className="text-muted-foreground">{r.error}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setStage("idle");
              setListedProducts([]);
              setResults([]);
              setSourceUrl("");
            }}
          >
            Nova importação
          </Button>
        </div>
      )}
    </div>
  );
}
