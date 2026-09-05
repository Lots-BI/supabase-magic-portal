import { useCallback, useEffect, useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFavorites, isFavorite, toggleFavorite } from "@/lib/knowledge-center/storage";

interface FavoriteButtonProps {
  slug: string;
  className?: string;
}

export function FavoriteButton({ slug, className }: FavoriteButtonProps) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(isFavorite(slug));
  }, [slug]);

  const onClick = useCallback(() => {
    toggleFavorite(slug);
    setActive(getFavorites().includes(slug));
  }, [slug]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      className={cn(
        "lots-focus inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary-300 hover:text-foreground",
        active && "border-primary-300 bg-primary/10 text-primary-600 dark:text-primary-300",
        className,
      )}
    >
      <Star className={cn("h-4 w-4", active && "fill-current")} />
    </button>
  );
}
