import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";
import WallPreviewModal from "@/components/WallPreviewModal";

interface LikeModalProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  imageUrl?: string | null;
}

export default function LikeModal({ open, onClose, productName, imageUrl }: LikeModalProps) {
  const [showWallPreview, setShowWallPreview] = useState(false);

  const handleAI = () => {
    onClose();
    setShowWallPreview(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-sm p-0 overflow-hidden rounded-xl border-0">
          {/* Header gradient */}
          <div className="bg-gradient-to-br from-primary to-primary/70 px-6 pt-8 pb-6 text-center">
            <div className="text-4xl mb-2">✨</div>
            <h2 className="text-lg font-bold text-primary-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Produto salvo no seu projeto!
            </h2>
            <p className="text-sm text-primary-foreground/80 mt-1 line-clamp-1">
              {productName}
            </p>
          </div>

          {/* Body */}
          <div className="px-6 pt-5 pb-6 space-y-3">
            <p className="text-sm text-center text-muted-foreground mb-4">
              O que você quer fazer agora?
            </p>

            {/* AI button */}
            <Button
              className="w-full h-12 gap-2 text-sm font-semibold"
              variant="outline"
              onClick={handleAI}
            >
              <Sparkles className="h-4 w-4 text-primary" />
              Ver na minha parede com I.A.
            </Button>

            {/* Continue button */}
            <Button
              className="w-full h-12 gap-2 text-sm font-semibold"
              onClick={onClose}
            >
              <ArrowRight className="h-4 w-4" />
              Continuar olhando
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <WallPreviewModal
        open={showWallPreview}
        onClose={() => setShowWallPreview(false)}
        productName={productName}
        productImageUrl={imageUrl ?? null}
      />
    </>
  );
}
