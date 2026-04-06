import { useState } from "react";
import { useProductImages } from "@/hooks/useProductImages";
import { cn } from "@/lib/utils";

interface Props {
  productId: string;
  fallbackUrl: string | null;
  productName: string;
}

export default function ProductImageGallery({ productId, fallbackUrl, productName }: Props) {
  const { data: images } = useProductImages(productId);
  const [activeIndex, setActiveIndex] = useState(0);

  const imageList = images?.length
    ? images
    : fallbackUrl
      ? [{ id: "fallback", image_url: fallbackUrl, display_order: 0, product_id: productId }]
      : [];

  const activeImage = imageList[activeIndex]?.image_url || "/placeholder.svg";

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="overflow-hidden rounded-xl bg-secondary aspect-square">
        <img
          src={activeImage}
          alt={productName}
          className="h-full w-full object-cover"
        />
      </div>

      {/* Thumbnails */}
      {imageList.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {imageList.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActiveIndex(i)}
              className={cn(
                "h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-secondary transition-all",
                i === activeIndex
                  ? "border-primary ring-1 ring-primary/30"
                  : "border-transparent opacity-70 hover:opacity-100"
              )}
            >
              <img src={img.image_url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
