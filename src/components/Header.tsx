import { Link } from "react-router-dom";
import { Phone, Mail, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProject } from "@/contexts/ProjectContext";

const Header = () => {
  const { count, setIsOpen } = useProject();

  return (
    <header className="sticky top-0 z-50">
      {/* Top promo bar */}
      <div className="bg-destructive text-destructive-foreground text-xs py-2">
        <div className="container flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 overflow-x-auto whitespace-nowrap">
            <span>🔥 3% de Desconto em compras no PIX!</span>
            <span>💳 Parcelamento em até 10x sem juros!</span>
            <span>🚚 Frete grátis acima de R$499,90 para Sul e Sudeste!</span>
          </div>
          <div className="hidden md:flex items-center gap-4 shrink-0">
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" /> 31 99317-5711
            </span>
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" /> idealepapeis@gmail.com
            </span>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="border-b bg-background shadow-sm">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span
              className="text-2xl font-bold tracking-wide"
              style={{
                fontFamily: "var(--font-display)",
                background: "var(--navy-gradient)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Ideale
            </span>
            <span className="hidden text-xs text-muted-foreground uppercase tracking-widest sm:block">
              Papéis de Parede
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="relative gap-2 text-foreground hover:bg-secondary rounded-sm"
              onClick={() => setIsOpen(true)}
            >
              <ClipboardList className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Enviar Escolhas
              </span>
              {count > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {count}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
