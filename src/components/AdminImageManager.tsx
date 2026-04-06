import { useRef } from "react";
import { useProductImages, useUploadProductImage, useDeleteProductImage, useReorderProductImages } from "@/hooks/useProductImages";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  productId: string;
}

export default function AdminImageManager({ productId }: Props) {
  const { data: images, isLoading } = useProductImages(productId);
  const uploadMutation = useUploadProductImage();
  const deleteMutation = useDeleteProductImage();
  const reorderMutation = useReorderProductImages();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !images) return;

    const currentCount = images.length;
    const remaining = 5 - currentCount;

    if (remaining <= 0) {
      toast.error("Máximo de 5 imagens por produto");
      return;
    }

    const toUpload = Array.from(files).slice(0, remaining);

    for (let i = 0; i < toUpload.length; i++) {
      try {
        await uploadMutation.mutateAsync({
          productId,
          file: toUpload[i],
          displayOrder: currentCount + i,
        });
      } catch (err: any) {
        toast.error(`Erro ao enviar: ${err.message}`);
      }
    }
    toast.success(`${toUpload.length} imagem(ns) enviada(s)`);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDelete = async (imageId: string) => {
    try {
      await deleteMutation.mutateAsync({ id: imageId, productId });
      toast.success("Imagem removida");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (!images) return;
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= images.length) return;

    const reordered = images.map((img, i) => ({
      id: img.id,
      display_order: i === index ? images[swapIdx].display_order : i === swapIdx ? images[index].display_order : img.display_order,
    }));

    try {
      await reorderMutation.mutateAsync({ images: reordered, productId });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const isBusy = uploadMutation.isPending || deleteMutation.isPending || reorderMutation.isPending;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          Imagens ({images?.length || 0}/5)
        </p>
        {(images?.length || 0) < 5 && (
          <label className="flex cursor-pointer items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary">
            <Upload className="h-3.5 w-3.5" />
            Adicionar
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
              disabled={isBusy}
            />
          </label>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !images?.length ? (
        <p className="py-3 text-center text-xs text-muted-foreground">Nenhuma imagem</p>
      ) : (
        <div className="space-y-2">
          {images.map((img, i) => (
            <div key={img.id} className="flex items-center gap-2 rounded-md border bg-card p-2">
              <img src={img.image_url} alt="" className="h-14 w-14 shrink-0 rounded object-cover bg-secondary" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">
                  {i === 0 ? "📌 Principal" : `Foto ${i + 1}`}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={i === 0 || isBusy}
                  onClick={() => handleMove(i, "up")}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={i === images.length - 1 || isBusy}
                  onClick={() => handleMove(i, "down")}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={isBusy}
                  onClick={() => handleDelete(img.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isBusy && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Processando...
        </div>
      )}
    </div>
  );
}
