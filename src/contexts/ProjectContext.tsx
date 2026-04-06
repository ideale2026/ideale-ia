import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export interface ProjectProduct {
  productId: string;
  productName: string;
  price: number;
  imageUrl: string | null;
  categoryName?: string;
}

interface ProjectContextType {
  products: ProjectProduct[];
  addProduct: (p: ProjectProduct) => void;
  removeProduct: (productId: string) => void;
  clearProject: () => void;
  hasProduct: (productId: string) => boolean;
  count: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  nome: string;
  setNome: (v: string) => void;
  telefone: string;
  setTelefone: (v: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const STORAGE_KEY = "ideale_project";

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<ProjectProduct[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");

  // Capture URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const n = params.get("nome") || params.get("name") || "";
    const t = params.get("telefone") || params.get("phone") || params.get("tel") || "";
    if (n) setNome(decodeURIComponent(n));
    if (t) setTelefone(decodeURIComponent(t));
  }, []);

  // Persist to localStorage whenever products change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    } catch {
      // ignore
    }
  }, [products]);

  const addProduct = useCallback((p: ProjectProduct) => {
    setProducts((prev) => {
      if (prev.find((x) => x.productId === p.productId)) return prev;
      return [...prev, p];
    });
  }, []);

  const removeProduct = useCallback((productId: string) => {
    setProducts((prev) => prev.filter((p) => p.productId !== productId));
  }, []);

  const clearProject = useCallback(() => {
    setProducts([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  const hasProduct = useCallback((productId: string) => {
    return products.some((p) => p.productId === productId);
  }, [products]);

  return (
    <ProjectContext.Provider value={{
      products, addProduct, removeProduct, clearProject, hasProduct,
      count: products.length, isOpen, setIsOpen,
      nome, setNome, telefone, setTelefone,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}
