import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Send, MapPin, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { z } from "zod";

const cepMask = (v: string) => {
  const digits = v.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
};

const phoneMask = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const addressSchema = z.object({
  nome: z.string().trim().min(3, "Nome obrigatório"),
  cep: z.string().regex(/^\d{5}-?\d{3}$/, "CEP inválido"),
  rua: z.string().trim().min(2, "Rua obrigatória"),
  numero: z.string().trim().min(1, "Número obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().trim().min(2, "Bairro obrigatório"),
  cidade: z.string().trim().min(2, "Cidade obrigatória"),
  estado: z.string().trim().length(2, "UF obrigatória"),
  telefone: z.string().min(14, "Telefone inválido"),
});

type AddressForm = z.infer<typeof addressSchema>;

function formatCurrency(v: number) {
  return v.toFixed(2).replace(".", ",");
}

const WHATSAPP_NUMBER = "5500000000000"; // placeholder

export default function CartDrawer() {
  const { items, removeItem, clearCart, total, isOpen, setIsOpen } = useCart();
  const budgetItems = items.filter((i) => !i.isInterestOnly);
  const interestItems = items.filter((i) => i.isInterestOnly);
  const [address, setAddress] = useState<AddressForm>({
    nome: "", cep: "", rua: "", numero: "", complemento: "",
    bairro: "", cidade: "", estado: "", telefone: "",
  });
  const [cepLoading, setCepLoading] = useState(false);

  const setField = (key: keyof AddressForm, value: string) =>
    setAddress((p) => ({ ...p, [key]: value }));

  const handleFetchCep = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast.error("CEP não encontrado!");
        return;
      }
      setAddress((p) => ({
        ...p,
        rua: data.logradouro || p.rua,
        bairro: data.bairro || p.bairro,
        cidade: data.localidade || p.cidade,
        estado: data.uf || p.estado,
      }));
      toast.success("Endereço encontrado!");
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      toast.error("Erro ao buscar CEP.");
    } finally {
      setCepLoading(false);
    }
  };

  const validation = addressSchema.safeParse(address);
  const isValid = validation.success && items.length > 0;
  const hasBudgetItems = budgetItems.length > 0;

  const handleSendWhatsApp = () => {
    if (!isValid) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const budgetLines = budgetItems.length > 0
      ? budgetItems
          .map(
            (item, i) =>
              `${i + 1}. ${item.productName}\n   - ${item.details}\n   - Qtd: ${item.quantity}\n   - Subtotal: R$ ${formatCurrency(item.totalPrice)}`
          )
          .join("\n--------------------------------\n")
      : "";

    const interestLines = interestItems.length > 0
      ? interestItems.map((item) => `- ${item.productName} (Cliente precisa de ajuda)`).join("\n")
      : "";

    const msg = `📦 *NOVO PEDIDO IDEALE* 📦

👤 *Cliente:* ${address.nome}
📞 *Tel:* ${address.telefone}

📍 *Endereço de Entrega:*
${address.rua}, ${address.numero}${address.complemento ? ` - ${address.complemento}` : ""}
${address.bairro} - ${address.cidade}/${address.estado}
CEP: ${address.cep}
${budgetLines ? `
🛒 *Resumo do Pedido:*
--------------------------------
${budgetLines}
--------------------------------` : ""}
${interestLines ? `
❤️ *Produtos de Interesse (Sem medidas):*
${interestLines}` : ""}

💰 *Total Estimado (Sem Frete): R$ ${formatCurrency(total)}*

*Aguardando cálculo de frete pelo atendente.*`;

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    clearCart();
    setIsOpen(false);
    toast.success("Pedido enviado via WhatsApp!");
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle style={{ fontFamily: "var(--font-display)" }}>
            Seu Orçamento
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {items.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">Nenhum item no orçamento.</p>
          ) : (
            <div className="space-y-4 py-4">
              {/* Budget items */}
              {budgetItems.length > 0 && (
                <>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">🛒 Seu Orçamento</h4>
                  {budgetItems.map((item) => (
                    <div key={item.productId} className="flex gap-3 rounded-lg border bg-card p-3">
                      {item.imageUrl && (
                        <img src={item.imageUrl} alt="" className="h-16 w-16 rounded-md object-cover bg-secondary" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">{item.details}</p>
                        <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                        <p className="text-sm font-semibold text-primary">R$ {formatCurrency(item.totalPrice)}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(item.productId)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </>
              )}

              {/* Interest items */}
              {interestItems.length > 0 && (
                <>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mt-2">
                    <Heart className="h-3.5 w-3.5" /> Itens de Interesse
                  </h4>
                  {interestItems.map((item) => (
                    <div key={item.productId} className="flex gap-3 rounded-lg border border-dashed bg-card p-3">
                      {item.imageUrl && (
                        <img src={item.imageUrl} alt="" className="h-12 w-12 rounded-md object-cover bg-secondary" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{item.productName}</p>
                        <Badge variant="secondary" className="mt-1 text-xs">Aguardando Consultor</Badge>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(item.productId)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </>
              )}

              {hasBudgetItems && (
                <div className="flex justify-between rounded-lg bg-secondary p-3">
                  <span className="font-medium text-foreground">Total Estimado</span>
                  <span className="text-lg font-bold text-primary" style={{ fontFamily: "var(--font-display)" }}>
                    R$ {formatCurrency(total)}
                  </span>
                </div>
              )}
            </div>
          )}

          {items.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="space-y-4 pb-6">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                    Dados de Entrega
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nome Completo *</Label>
                    <Input value={address.nome} onChange={(e) => setField("nome", e.target.value)} placeholder="Seu nome completo" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">CEP *</Label>
                      <Input
                        value={address.cep}
                        onChange={(e) => setField("cep", cepMask(e.target.value))}
                        onBlur={handleFetchCep}
                        placeholder="00000-000"
                        maxLength={9}
                      />
                      {cepLoading && <p className="text-xs text-muted-foreground">Buscando...</p>}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Telefone / WhatsApp *</Label>
                      <Input
                        value={address.telefone}
                        onChange={(e) => setField("telefone", phoneMask(e.target.value))}
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Rua *</Label>
                      <Input value={address.rua} onChange={(e) => setField("rua", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Número *</Label>
                      <Input value={address.numero} onChange={(e) => setField("numero", e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Complemento</Label>
                    <Input value={address.complemento} onChange={(e) => setField("complemento", e.target.value)} placeholder="Apto, Bloco..." />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Bairro *</Label>
                      <Input value={address.bairro} onChange={(e) => setField("bairro", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cidade *</Label>
                      <Input value={address.cidade} onChange={(e) => setField("cidade", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">UF *</Label>
                      <Input value={address.estado} onChange={(e) => setField("estado", e.target.value.toUpperCase())} maxLength={2} placeholder="SP" />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </ScrollArea>

        {items.length > 0 && (
          <div className="border-t pt-4">
            <Button
              className="w-full gap-2"
              size="lg"
              disabled={!isValid}
              onClick={handleSendWhatsApp}
            >
              <Send className="h-4 w-4" />
              Enviar Pedido via WhatsApp
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
