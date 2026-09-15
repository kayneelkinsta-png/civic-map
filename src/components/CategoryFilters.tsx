import type { Category } from "@/lib/civic";
import { cn } from "@/lib/utils";

export function CategoryFilters({
  categories,
  selected,
  onToggle,
  onClear,
}: {
  categories: Category[];
  selected: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button
        type="button"
        onClick={onClear}
        className={cn(
          "civic-float shrink-0 px-3.5 py-2 text-sm font-medium transition-colors",
          selected.length === 0 ? "bg-primary text-primary-foreground" : "text-foreground",
        )}
      >
        All
      </button>
      {categories.map((c) => {
        const active = selected.includes(c.id);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onToggle(c.id)}
            aria-pressed={active}
            className={cn(
              "civic-float flex shrink-0 items-center gap-1.5 px-3.5 py-2 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-foreground",
            )}
          >
            <span aria-hidden>{c.emoji}</span>
            {c.name.split(" / ")[0]}
          </button>
        );
      })}
    </div>
  );
}
