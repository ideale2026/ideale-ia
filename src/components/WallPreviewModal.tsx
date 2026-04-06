import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Sparkles, Upload, X, Download, RotateCcw, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface WallPreviewModalProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  productImageUrl: string | null;
}

export default function WallPreviewModal({
  open,
  onClose,
  productName,
  productImageUrl,
}: WallPreviewModalProps) {
  const [wallFile, setWallFile] = useState<File | null>(null);
  const [wallPreviewUrl, setWallPreviewUrl] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Envie apenas imagens (JPG, PNG, WEBP)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 10MB.");
      return;
    }
    setWallFile(file);
    setWallPreviewUrl(URL.createObjectURL(file));
    setGeneratedImage(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  };

  const handleGenerate = async () => {
    if (!wallFile || !productImageUrl) return;

    setIsLoading(true);
    try {
      // Convert wall image to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Strip the data:image/xxx;base64, prefix
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(wallFile);
      });

      const { data, error } = await supabase.functions.invoke("generate-wall-preview", {
        body: {
          wallImageBase64: base64,
          wallMimeType: wallFile.type,
          productImageUrl,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.imageUrl) throw new Error("Nenhuma imagem retornada");

      setGeneratedImage(data.imageUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao gerar visualização";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const a = document.createElement("a");
    a.href = generatedImage;
    a.download = `preview-${productName.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  };

  const handleReset = () => {
    setWallFile(null);
    setWallPreviewUrl(null);
    setGeneratedImage(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-xl border-0 max-h-[90vh] overflow-y-auto">
        <VisuallyHidden>
          <DialogTitle>Ver na minha parede com I.A.</DialogTitle>
          <DialogDescription>Envie uma foto da sua parede para visualizar o produto aplicado</DialogDescription>
        </VisuallyHidden>
        {/* Header */}
        <div className="bg-gradient-to-br from-primary to-primary/70 px-6 pt-7 pb-5 text-center">
          <div className="flex justify-center mb-2">
            <Sparkles className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="text-base font-bold text-primary-foreground">
            Ver na minha parede com I.A.
          </h2>
          <p className="text-xs text-primary-foreground/80 mt-1 line-clamp-1">{productName}</p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Step indicators */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={`flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold ${wallFile ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>1</span>
            <span className={wallFile ? "text-foreground font-medium" : ""}>Foto da parede</span>
            <div className="flex-1 h-px bg-border" />
            <span className={`flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold ${generatedImage ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>2</span>
            <span className={generatedImage ? "text-foreground font-medium" : ""}>Resultado</span>
          </div>

          {/* Result view */}
          {generatedImage ? (
            <div className="space-y-3">
              <div className="rounded-lg overflow-hidden border border-border">
                <img src={generatedImage} alt="Visualização gerada" className="w-full object-cover" />
              </div>
              <p className="text-xs text-center text-muted-foreground">
                ✨ Visualização gerada com I.A. — resultado ilustrativo
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleReset}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Tentar outra foto
                </Button>
                <Button size="sm" className="flex-1 gap-1.5" onClick={handleDownload}>
                  <Download className="h-3.5 w-3.5" />
                  Baixar imagem
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Products preview row */}
              {productImageUrl && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                  <img
                    src={productImageUrl}
                    alt={productName}
                    className="h-14 w-14 rounded-md object-cover shrink-0 border border-border"
                  />
                  <div>
                    <p className="text-xs font-semibold text-foreground line-clamp-1">{productName}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Produto a ser aplicado</p>
                  </div>
                </div>
              )}

              {/* Upload area */}
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Foto da sua parede ou ambiente:</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileChange(file);
                  }}
                />

                {wallPreviewUrl ? (
                  <div className="relative rounded-lg overflow-hidden border border-border">
                    <img src={wallPreviewUrl} alt="Sua parede" className="w-full max-h-52 object-cover" />
                    <button
                      onClick={() => { setWallFile(null); setWallPreviewUrl(null); }}
                      className="absolute top-2 right-2 bg-background/80 rounded-full p-1 hover:bg-background transition-colors"
                    >
                      <X className="h-4 w-4 text-foreground" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => inputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Toque para enviar</p>
                        <p className="text-xs text-muted-foreground mt-0.5">ou tire uma foto agora</p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">JPG, PNG, WEBP — máx. 10MB</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Generate button */}
              <Button
                className="w-full h-12 gap-2 font-semibold"
                disabled={!wallFile || isLoading}
                onClick={handleGenerate}
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Gerando visualização...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Gerar visualização com I.A.
                  </>
                )}
              </Button>

              {isLoading && (
                <p className="text-[11px] text-center text-muted-foreground">
                  ⏳ Isso pode levar de 15 a 30 segundos…
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
