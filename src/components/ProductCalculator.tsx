import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator, Minus, Plus, Heart } from "lucide-react";
import { useProductCalculator } from "@/hooks/useProductCalculator";
import { useProject } from "@/contexts/ProjectContext";
import { toast } from "sonner";

interface ProductCalculatorProps {
  productId: string;
  strategySlug: string | undefined | null;
  strategyName: string | undefined | null;
  metadata: Record<string, unknown> | null;
  price: number;
  productName: string;
  imageUrl: string | null;
  categorySlug?: string | null;
}

function formatCurrency(value: number) {
  return value.toFixed(2).replace(".", ",");
}

const ProductCalculator = ({
  productId,
  strategySlug,
  strategyName,
  metadata,
  price,
  productName,
  imageUrl,
  categorySlug,
}: ProductCalculatorProps) => {
  const { addProduct, setIsOpen, hasProduct } = useProject();
  const { inputs, setInput, result, strategySlug: slug } = useProductCalculator(
    strategySlug,
    metadata,
    price
  );

  const handleSaveToProject = () => {
    addProduct({ productId, productName, price, imageUrl });
    setIsOpen(true);
    toast.success("Salvo no seu projeto!", {
      description: productName,
    });
  };

  const renderInputs = () => {
    switch (slug) {
      case "WALLPAPER_ROLL":
      case "ROLL_COVERAGE":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="height" className="text-sm text-muted-foreground">
                Altura (m)
              </Label>
              <Input
                id="height"
                type="number"
                min={0}
                step={0.01}
                placeholder="Ex: 2.80"
                value={inputs.height || ""}
                onChange={(e) => setInput("height", parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="width" className="text-sm text-muted-foreground">
                Largura (m)
              </Label>
              <Input
                id="width"
                type="number"
                min={0}
                step={0.01}
                placeholder="Ex: 5.00"
                value={inputs.width || ""}
                onChange={(e) => setInput("width", parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        );

      case "FLOORING_AREA":
        return (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={inputs.areaMode === "dimensions" ? "default" : "outline"}
                size="sm"
                onClick={() => setInput("areaMode", "dimensions")}
              >
                A × L
              </Button>
              <Button
                type="button"
                variant={inputs.areaMode === "direct" ? "default" : "outline"}
                size="sm"
                onClick={() => setInput("areaMode", "direct")}
              >
                m² direto
              </Button>
            </div>

            {inputs.areaMode === "direct" ? (
              <div className="space-y-2">
                <Label htmlFor="area" className="text-sm text-muted-foreground">
                  Área Total (m²)
                </Label>
                <Input
                  id="area"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="Ex: 12.50"
                  value={inputs.area || ""}
                  onChange={(e) => setInput("area", parseFloat(e.target.value) || 0)}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height" className="text-sm text-muted-foreground">
                    Altura (m)
                  </Label>
                  <Input
                    id="height"
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="Ex: 3.00"
                    value={inputs.height || ""}
                    onChange={(e) => setInput("height", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="width" className="text-sm text-muted-foreground">
                    Largura (m)
                  </Label>
                  <Input
                    id="width"
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="Ex: 4.00"
                    value={inputs.width || ""}
                    onChange={(e) => setInput("width", parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            )}
          </div>
        );

      case "SIMPLE_UNIT":
        return (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Quantidade</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setInput("quantity", Math.max(1, inputs.quantity - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="min-w-[3rem] text-center text-xl font-semibold text-foreground">
                {inputs.quantity}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setInput("quantity", inputs.quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="rounded-xl border bg-card p-6 shadow-[var(--card-shadow)]">
      <div className="mb-5 flex items-center gap-2">
        <Calculator className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
          Calculadora de Quantidade
        </h3>
      </div>

      {strategyName && (
        <p className="mb-4 text-xs uppercase tracking-wider text-muted-foreground">
          Estratégia: {strategyName}
        </p>
      )}

      <div className="space-y-6">
        {renderInputs()}

        {result && (
          <div className="space-y-4 rounded-lg bg-secondary/70 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Quantidade sugerida</span>
              <span className="text-2xl font-bold text-foreground">
                {result.suggestedQuantity}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  {categorySlug === "ripados"
                    ? result.suggestedQuantity === 1 ? "painel" : "painéis"
                    : result.suggestedQuantity === 1 ? "unidade" : "unidades"}
                </span>
              </span>
            </div>

            {result.totalArea > 0 && (
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Área total</span>
                <span className="font-medium text-foreground">
                  {result.totalArea.toFixed(2).replace(".", ",")} m²
                </span>
              </div>
            )}

            <div className="border-t pt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-muted-foreground">Valor Total</span>
                <span
                  className="text-2xl font-bold text-primary"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  R$ {formatCurrency(result.totalPrice)}
                </span>
              </div>
            </div>

            <Button
              className="w-full gap-2"
              size="lg"
              variant={hasProduct(productId) ? "secondary" : "default"}
              onClick={handleSaveToProject}
            >
              <Heart className={hasProduct(productId) ? "h-4 w-4 fill-destructive text-destructive" : "h-4 w-4"} />
              {hasProduct(productId) ? "Salvo no Projeto ✓" : "❤️ Salvar no Meu Projeto"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCalculator;
