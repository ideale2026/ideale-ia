import { useRef } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import type { Category } from "@/hooks/useCategories";

interface Props {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelect: (id: string | null) => void;
}

export default function MobileCategoryChips({ categories, selectedCategoryId, onSelect }: Props) {
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);

  // Find parent of selected (if selected is a child)
  const selectedParent = selectedCategoryId
    ? categories.find((cat) => cat.children?.some((c) => c.id === selectedCategoryId))
    : null;

  const activeParentId = selectedParent
    ? selectedParent.id
    : selectedCategoryId && categories.find((c) => c.id === selectedCategoryId)
    ? selectedCategoryId
    : null;

  const activeParent = activeParentId ? categories.find((c) => c.id === activeParentId) : null;
  const subcategories = activeParent?.children ?? [];

  const handleParentClick = (cat: Category) => {
    const hasChildren = (cat.children?.length ?? 0) > 0;
    if (hasChildren) {
      // Select parent and show subcategory row
      if (activeParentId === cat.id && !selectedParent) {
        // clicking the active parent that has no sub selected → deselect
        onSelect(null);
      } else {
        onSelect(cat.id);
      }
    } else {
      onSelect(selectedCategoryId === cat.id ? null : cat.id);
    }
  };

  return (
    <div className="mb-4 space-y-2 lg:hidden">
      {/* Row 1 – Parent categories */}
      <div
        ref={row1Ref}
        className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5"
        style={{ scrollbarWidth: "none" }}
      >
        {/* "Todos" chip */}
        <button
          onClick={() => onSelect(null)}
          className={cn(
            "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
            selectedCategoryId === null
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-foreground border-border hover:border-primary hover:text-primary"
          )}
        >
          Todos
        </button>

        {categories.map((cat) => {
          const isActive =
            activeParentId === cat.id ||
            (selectedCategoryId === cat.id && !selectedParent);

          return (
            <button
              key={cat.id}
              onClick={() => handleParentClick(cat)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:border-primary hover:text-primary"
              )}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Row 2 – Subcategories (only when a parent with children is selected) */}
      {subcategories.length > 0 && (
        <div
          ref={row2Ref}
          className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5"
          style={{ scrollbarWidth: "none" }}
        >
          {/* "Ver todos de X" chip */}
          <button
            onClick={() => onSelect(activeParentId)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
              selectedCategoryId === activeParentId
                ? "bg-secondary text-secondary-foreground border-secondary"
                : "bg-muted text-muted-foreground border-border hover:border-primary hover:text-primary"
            )}
          >
            Todos
          </button>

          {subcategories.map((sub) => {
            const isSubActive = selectedCategoryId === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => onSelect(isSubActive ? activeParentId : sub.id)}
                className={cn(
                  "shrink-0 flex items-center gap-1 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
                  isSubActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-border hover:border-primary hover:text-primary"
                )}
              >
                {sub.name}
                {isSubActive && <X className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
