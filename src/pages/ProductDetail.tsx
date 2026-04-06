import { useParams, Link } from "react-router-dom";
import { useProduct } from "@/hooks/useProducts";
import Header from "@/components/Header";
import ProductCalculator from "@/components/ProductCalculator";
import ProductImageGallery from "@/components/ProductImageGallery";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ArrowLeft, Heart, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProject } from "@/contexts/ProjectContext";
import { useState } from "react";
import LikeModal from "@/components/LikeModal";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading } = useProduct(id || "");
  const { addProduct, hasProduct } = useProject();
  const [showModal, setShowModal] = useState(false);

  const handleInterest = () => {
    if (!product) return;
    addProduct({
      productId: product.id,
      productName: product.name,
      price: Number(product.price),
      imageUrl: product.image_url,
      categoryName: product.categories?.name,
    });
    setShowModal(true);
  };

  const liked = product ? hasProduct(product.id) : false;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-10">
          <div className="grid gap-10 md:grid-cols-2">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-10 w-1/3" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container flex flex-col items-center justify-center py-20">
          <h2 className="text-2xl font-bold text-foreground">Produto não encontrado</h2>
          <Link to="/" className="mt-4 text-primary underline">
            Voltar ao catálogo
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-10">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao catálogo
        </Link>

        <div className="grid gap-10 md:grid-cols-2">
          {/* Image */}
          <ProductImageGallery
            productId={product.id}
            fallbackUrl={product.image_url}
            productName={product.name}
          />

          {/* Info */}
          <div className="flex flex-col gap-6">
            {product.categories?.name && (
              <Badge variant="secondary" className="w-fit text-xs uppercase tracking-wider">
                {product.categories.name}
              </Badge>
            )}

            <h1 className="text-3xl font-bold text-foreground md:text-4xl">
              {product.name}
            </h1>

            <p className="text-3xl font-bold text-primary">
              R$ {Number(product.price).toFixed(2).replace(".", ",")}
            </p>

            {product.description && (
              <p className="leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            )}

            {/* Application Warnings */}
            {product.application_warnings && product.application_warnings.length > 0 && (
              <div className="rounded-lg border bg-secondary/50 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <AlertTriangle className="h-4 w-4 text-accent" />
                  Avisos de Aplicação
                </div>
                <ul className="space-y-1">
                  {product.application_warnings.map((warning, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      • {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Calculator */}
            <ProductCalculator
              productId={product.id}
              strategySlug={product.calculation_strategies?.slug}
              strategyName={product.calculation_strategies?.name}
              metadata={product.calculator_metadata as Record<string, unknown>}
              price={Number(product.price)}
              productName={product.name}
              imageUrl={product.image_url}
              categorySlug={product.categories?.slug}
            />

            {/* Interest button */}
            <Button
              variant={liked ? "secondary" : "default"}
              size="lg"
              className="w-full gap-2"
              onClick={handleInterest}
            >
              <Heart className={liked ? "h-4 w-4 fill-destructive text-destructive" : "h-4 w-4"} />
              {liked ? "Curtido ✓ — Salvo no Projeto" : "❤️ Gostei — Salvar no Projeto"}
            </Button>

            {/* Cross-sell: Installation material */}
            {(product.categories?.slug === "ripados" || product.categories?.slug === "placas") && (
              <div className="flex items-start gap-3 rounded-lg border border-accent/30 bg-accent/10 p-4">
                <Wrench className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <div>
                  <p className="font-semibold text-foreground">Material de Instalação Recomendado</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Para este produto, recomendamos o uso de <strong className="text-foreground">Cola PU</strong> para garantir fixação e durabilidade.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <LikeModal
        open={showModal}
        onClose={() => setShowModal(false)}
        productName={product.name}
        imageUrl={product.image_url}
      />
    </div>
  );
};

export default ProductDetail;
