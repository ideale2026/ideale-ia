import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  children?: Category[];
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, parent_id")
        .order("name", { ascending: true });
      if (error) throw error;

      // Build hierarchy
      const all = data as Category[];
      const roots = all.filter((c) => !c.parent_id);
      roots.forEach((root) => {
        root.children = all.filter((c) => c.parent_id === root.id);
      });
      return roots;
    },
  });
}
