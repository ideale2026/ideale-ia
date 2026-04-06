import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { cn } from "@/lib/utils";
import LikeModal from "@/components/LikeModal";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  categoryName?: string;
}

const ProductCard = ({ id, name, price, imageUrl, categoryName }: ProductCardProps) => {
  const { addProduct, hasProduct } = useProject();
  const [showModal, setShowModal] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);
  const liked = hasProduct(id);

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    addProduct({ productId: id, productName: name, price, imageUrl, categoryName });

    // Heart pulse animation
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 600);

    setShowModal(true);
  };

  return (
    <>
      <Card className="group overflow-hidden border-border transition-all duration-200 hover:shadow-[var(--warm-shadow)] hover:-translate-y-0.5 rounded-sm">
        <Link to={`/product/${id}`}>
          <div className="aspect-square overflow-hidden bg-secondary relative">
            <img
              src={imageUrl || "/placeholder.svg"}
              alt={name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {liked && (
              <div className="absolute top-2 right-2 bg-white/90 rounded-full p-1 shadow">
                <Heart className="h-3.5 w-3.5 fill-destructive text-destructive" />
              </div>
            )}
          </div>
        </Link>
        <CardContent className="p-3">
          {categoryName && (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {categoryName}
            </span>
          )}
          <Link to={`/product/${id}`}>
            <h3 className="mt-1 text-sm font-medium text-foreground leading-snug line-clamp-2">
              {name}
            </h3>
          </Link>
          <p className="mt-1.5 text-base font-bold text-primary">
            R$ {price.toFixed(2).replace(".", ",")}
          </p>
          <p className="text-[11px] text-muted-foreground">
            com Pix
          </p>
          <div className="mt-2.5">
            <Button
              size="sm"
              variant={liked ? "secondary" : "default"}
              className={cn(
                "w-full h-9 text-xs font-semibold rounded-sm gap-1.5 transition-all",
                heartAnim && "scale-95"
              )}
              onClick={handleLike}
            >
              <Heart
                className={cn(
                  "h-3.5 w-3.5 transition-all duration-300",
                  liked ? "fill-destructive text-destructive" : "",
                  heartAnim && "scale-125"
                )}
              />
              {liked ? "Curtido ✓" : "❤️ Gostei"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <LikeModal
        open={showModal}
        onClose={() => setShowModal(false)}
        productName={name}
        imageUrl={imageUrl}
      />
    </>
  );
};

export default ProductCard;
