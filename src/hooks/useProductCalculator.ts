import { useState, useMemo } from "react";

type StrategySlug = "WALLPAPER_ROLL" | "FLOORING_AREA" | "ROLL_COVERAGE" | "SIMPLE_UNIT";

interface CalculatorInputs {
  height: number;
  width: number;
  area: number;
  quantity: number;
  areaMode: "direct" | "dimensions";
}

interface CalculatorResult {
  suggestedQuantity: number;
  totalArea: number;
  totalPrice: number;
}

interface UseProductCalculatorReturn {
  inputs: CalculatorInputs;
  setInput: <K extends keyof CalculatorInputs>(key: K, value: CalculatorInputs[K]) => void;
  result: CalculatorResult | null;
  strategySlug: StrategySlug | null;
}

export function useProductCalculator(
  strategySlug: string | undefined | null,
  metadata: Record<string, unknown> | null,
  price: number
): UseProductCalculatorReturn {
  const [inputs, setInputs] = useState<CalculatorInputs>({
    height: 0,
    width: 0,
    area: 0,
    quantity: 1,
    areaMode: "dimensions",
  });

  const slug = (strategySlug as StrategySlug) || null;

  const setInput = <K extends keyof CalculatorInputs>(key: K, value: CalculatorInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const result = useMemo<CalculatorResult | null>(() => {
    if (!slug) return null;
    const meta = metadata || {};

    switch (slug) {
      case "WALLPAPER_ROLL": {
        const coverageFactor = (meta.coverage_factor as number) || 4.3;
        const area = inputs.height * inputs.width;
        if (area <= 0) return null;
        const qty = Math.ceil(area / coverageFactor);
        return { suggestedQuantity: qty, totalArea: area, totalPrice: qty * price };
      }

      case "FLOORING_AREA": {
        const unitCoverage = (meta.unit_coverage as number) || 0.14;
        const area =
          inputs.areaMode === "direct"
            ? inputs.area
            : inputs.height * inputs.width;
        if (area <= 0) return null;
        const qty = Math.ceil(area / unitCoverage);
        return { suggestedQuantity: qty, totalArea: area, totalPrice: qty * price };
      }

      case "ROLL_COVERAGE": {
        const unitCoverage = (meta.unit_coverage as number) || 1.4;
        const area = inputs.height * inputs.width;
        if (area <= 0) return null;
        const qty = Math.ceil(area / unitCoverage);
        return { suggestedQuantity: qty, totalArea: area, totalPrice: qty * price };
      }

      case "SIMPLE_UNIT": {
        const qty = Math.max(1, Math.floor(inputs.quantity));
        return { suggestedQuantity: qty, totalArea: 0, totalPrice: qty * price };
      }

      default:
        return null;
    }
  }, [slug, metadata, inputs, price]);

  return { inputs, setInput, result, strategySlug: slug };
}
