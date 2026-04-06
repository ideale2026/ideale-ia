import { useState, useEffect } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Send, CheckCircle2, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function ProjectDrawer() {
  const { products, removeProduct, clearProject, isOpen, setIsOpen, nome, setNome, telefone, setTelefone, count } = useProject();
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  // Local input state — decoupled from context so typing never triggers
  // a re-evaluation of showContactFields (which would unmount the inputs mid-typing)
  const [localNome, setLocalNome] = useState("");
  const [localTelefone, setLocalTelefone] = useState("");

  // Stable flag set ONCE when the drawer opens — never changes while open
  const [showContactFields, setShowContactFields] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const needsContact = !telefone.trim();
      setShowContactFields(needsContact);
      if (needsContact) {
        setLocalNome(nome);
        setLocalTelefone(telefone);
      }
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Normalise to E.164-style Brazilian number: digits only, with 55 prefix */
  const handleSend = async () => {
    if (products.length === 0) return;

    // Always prefer local fields if contact fields are shown; fallback to context
    const rawTelefone = (localTelefone.trim() || telefone.trim());
    const finalNome   = (localNome.trim()   || nome.trim());

    // Validate required field before firing
    if (!rawTelefone) {
      toast.warning("Por favor, preencha seu WhatsApp para que nossa especialista possa te chamar.", {
        duration: 5000,
      });
      return;
    }

    // Always persist to context
    if (finalNome)   setNome(finalNome);
    if (rawTelefone) setTelefone(rawTelefone);

    const digits = rawTelefone.replace(/\D/g, "");

    // Must have at least 10 digits (DDD + number) before adding country code
    if (digits.length < 10) {
      toast.warning("Por favor, informe um número de WhatsApp válido com DDD.", { duration: 5000 });
      return;
    }

    const finalTelefone = digits.startsWith("55") && digits.length >= 12 ? digits : "55" + digits;

    const produtos_escolhidos = products.map((p) => ({
      nome: p.productName,
      referencia: p.productId,
      preco: `R$ ${p.price.toFixed(2).replace(".", ",")}`,
      categoria: p.categoryName ?? null,
    }));

    setSending(true);
    try {
      const edgeFnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-interest-webhook`;

      const response = await fetch(edgeFnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          telefone: finalTelefone,
          nome: finalNome,
          produtos_escolhidos,
          origem: "app_lovable",
        }),
      });

      if (!response.ok) throw new Error("Erro de rede: " + response.status);

      setSuccess(true);
      clearProject();
    } catch (error) {
      console.error("Erro no webhook:", error);
      toast.error("Falha de conexão. Verifique sua internet e tente novamente.", {
        duration: 5000,
      });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => setSuccess(false), 400);
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className="flex w-full flex-col sm:max-w-md p-0">
        {success ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-6 px-8 text-center">
            <div className="rounded-full bg-primary/10 p-6">
              <CheckCircle2 className="h-14 w-14 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                Projeto enviado! 🎉
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Nossa especialista já recebeu suas escolhas e vai te chamar no WhatsApp em instantes.
              </p>
            </div>
            <Button className="w-full" size="lg" onClick={handleClose}>
              Fechar
            </Button>
          </div>
        ) : (
          <>
            <SheetHeader className="px-5 pt-5 pb-3 border-b">
              <SheetTitle className="flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
                <ClipboardList className="h-5 w-5 text-primary" />
                Meu Projeto
                {count > 0 && (
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    {count} {count === 1 ? "produto" : "produtos"}
                  </span>
                )}
              </SheetTitle>
            </SheetHeader>

            <ScrollArea className="flex-1 px-5">
              {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                  <span className="text-5xl">🛋️</span>
                  <p className="text-muted-foreground text-sm">
                    Você ainda não curtiu nenhum produto.<br />
                    Explore o catálogo e clique em ❤️ Gostei!
                  </p>
                </div>
              ) : (
                <div className="space-y-3 py-4">
                  {products.map((p) => (
                    <div key={p.productId} className="flex gap-3 rounded-xl border bg-card p-3 items-center">
                      <div className="h-16 w-16 rounded-lg overflow-hidden bg-secondary shrink-0">
                        <img
                          src={p.imageUrl || "/placeholder.svg"}
                          alt={p.productName}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        {p.categoryName && (
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                            {p.categoryName}
                          </p>
                        )}
                        <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
                          {p.productName}
                        </p>
                        <p className="text-sm font-bold text-primary mt-0.5">
                          R$ {p.price.toFixed(2).replace(".", ",")}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeProduct(p.productId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {products.length > 0 && (
              <div className="border-t px-5 py-4 space-y-3">
                {!showContactFields && (nome || telefone) && (
                  <div className="rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
                    {nome && <span className="font-medium text-foreground">{nome}</span>}
                    {nome && telefone && " · "}
                    {telefone && <span>{telefone}</span>}
                  </div>
                )}

                {showContactFields && (
                  <div className="space-y-2 rounded-xl border bg-secondary/50 p-3">
                    <p className="text-xs text-muted-foreground font-medium mb-1">
                      Para finalizar, precisamos dos seus dados:
                    </p>
                    <div className="space-y-1">
                      <Label htmlFor="drawer-nome" className="text-xs">
                        Como podemos te chamar? (Nome)
                      </Label>
                      <Input
                        id="drawer-nome"
                        placeholder="Seu nome"
                        value={localNome}
                        onChange={(e) => setLocalNome(e.target.value)}
                        maxLength={100}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="drawer-telefone" className="text-xs">
                        Qual o seu WhatsApp? <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="drawer-telefone"
                        placeholder="(00) 00000-0000"
                        value={localTelefone}
                        onChange={(e) => setLocalTelefone(e.target.value)}
                        maxLength={20}
                        inputMode="tel"
                      />
                    </div>
                  </div>
                )}

                <Button
                  className="w-full h-12 gap-2 text-sm font-semibold"
                  size="lg"
                  onClick={handleSend}
                  disabled={sending}
                >
                  {sending ? (
                    <span className="animate-pulse">Enviando...</span>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      🟢 Enviar Projeto para o Especialista
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
