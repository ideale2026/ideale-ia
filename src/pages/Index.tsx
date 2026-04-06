import { useState } from "react";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import MobileCategoryChips from "@/components/MobileCategoryChips";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

const Index = () => {
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: categories, isLoading: categoriesLoading } = useCategories();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCategoryClick = (id: string, hasChildren: boolean) => {
    if (hasChildren) toggleExpand(id);
    setSelectedCategoryId((prev) => (prev === id ? null : id));
  };

  const getFilterIds = (): string[] | null => {
    if (!selectedCategoryId || !categories) return null;
    for (const cat of categories) {
      if (cat.id === selectedCategoryId) {
        if (cat.children?.length) {
          return [cat.id, ...cat.children.map((c) => c.id)];
        }
        return [cat.id];
      }
      const child = cat.children?.find((c) => c.id === selectedCategoryId);
      if (child) return [child.id];
    }
    return null;
  };

  const filterIds = getFilterIds();
  const filteredProducts = filterIds
    ? products?.filter((p) => p.category_id && filterIds.includes(p.category_id))
    : products;

  const selectedLabel = (() => {
    if (!selectedCategoryId || !categories) return null;
    for (const cat of categories) {
      if (cat.id === selectedCategoryId) return cat.name;
      const child = cat.children?.find((c) => c.id === selectedCategoryId);
      if (child) return `${cat.name} › ${child.name}`;
    }
    return null;
  })();

  const CategorySidebar = () => (
    <aside className="w-full">
      <div className="border border-border rounded-sm overflow-hidden">
        <div className="bg-primary px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary-foreground">
            Categorias
          </h2>
        </div>
        <nav className="divide-y divide-border">
          {categoriesLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="px-4 py-2.5">
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))
            : categories?.map((cat) => {
                const isExpanded = expandedCategories.has(cat.id);
                const isSelected = selectedCategoryId === cat.id;
                const hasChildren = (cat.children?.length ?? 0) > 0;

                return (
                  <div key={cat.id}>
                    <button
                      onClick={() => handleCategoryClick(cat.id, hasChildren)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-2.5 text-left text-sm transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-foreground hover:bg-secondary hover:text-primary"
                      )}
                    >
                      <span>{cat.name}</span>
                      {hasChildren ? (
                        isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                        )
                      ) : null}
                    </button>
                    {hasChildren && isExpanded && (
                      <div className="bg-muted/40 border-t border-border">
                        {cat.children!.map((sub) => {
                          const isSubSelected = selectedCategoryId === sub.id;
                          return (
                            <button
                              key={sub.id}
                              onClick={() => handleCategoryClick(sub.id, false)}
                              className={cn(
                                "w-full text-left px-8 py-2 text-sm transition-colors",
                                isSubSelected
                                  ? "bg-primary text-primary-foreground font-semibold"
                                  : "text-muted-foreground hover:bg-secondary hover:text-primary"
                              )}
                            >
                              {sub.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
        </nav>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6">
        {/* Mobile: title */}
        <h1
          className="text-xl font-bold text-foreground mb-3 lg:hidden"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {selectedLabel ?? "Produtos"}
        </h1>

        {/* Mobile: skeleton chips while loading */}
        {categoriesLoading && (
          <div className="flex gap-2 overflow-x-auto mb-4 lg:hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-20 rounded-full shrink-0" />
            ))}
          </div>
        )}

        {/* Mobile: horizontal scrollable category chips */}
        {categories && (
          <MobileCategoryChips
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelect={setSelectedCategoryId}
          />
        )}

        <div className="flex gap-6">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block w-56 shrink-0">
            <CategorySidebar />
          </div>

          {/* Product grid */}
          <div className="flex-1 min-w-0">
            {/* Desktop: Page title + filter info */}
            <div className="hidden lg:flex items-baseline justify-between mb-5">
              <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                {selectedLabel ?? "Produtos"}
              </h1>
              <div className="flex items-center gap-3">
                {selectedLabel && (
                  <button
                    onClick={() => setSelectedCategoryId(null)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" /> Limpar filtro
                  </button>
                )}
                <span className="text-sm text-muted-foreground">
                  Exibindo {filteredProducts?.length ?? 0} produto{(filteredProducts?.length ?? 0) !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Mobile: product count */}
            <p className="text-xs text-muted-foreground mb-3 lg:hidden">
              {filteredProducts?.length ?? 0} produto{(filteredProducts?.length ?? 0) !== 1 ? "s" : ""}
            </p>

            {productsLoading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="aspect-square w-full rounded-sm" />
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                ))}
              </div>
            ) : filteredProducts && filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    price={product.price}
                    imageUrl={product.image_url}
                    categoryName={product.categories?.name}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-lg text-muted-foreground">Nenhum produto encontrado</p>
                {selectedLabel && (
                  <button
                    onClick={() => setSelectedCategoryId(null)}
                    className="mt-3 text-sm text-primary underline underline-offset-4"
                  >
                    Ver todos os produtos
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
