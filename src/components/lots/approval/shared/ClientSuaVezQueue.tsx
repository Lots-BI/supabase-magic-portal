import { useState } from "react";
import type { ContentCard } from "@/modules/approval/types/content-card";
import { ContentPosterCard } from "@/components/lots/approval/shared/ContentPosterCard";
import { cn } from "@/lib/utils";

export function ClientSuaVezQueue({
  cards,
  thumbMap,
  onOpenCard,
}: {
  cards: ContentCard[];
  thumbMap?: Record<string, string | null>;
  onOpenCard: (id: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const safeIndex = Math.min(index, Math.max(0, cards.length - 1));
  const current = cards[safeIndex];
  if (!current) return null;

  return (
    <section className="flex flex-col items-center gap-4">
      <ContentPosterCard
        card={current}
        thumbnailUrl={thumbMap?.[current.id] ?? current.capa_url}
        size="hero"
        onOpen={() => onOpenCard(current.id)}
      />
      {cards.length > 1 ? (
        <div className="flex items-center gap-2">
          {cards.map((card, i) => (
            <button
              key={card.id}
              type="button"
              aria-label={card.titulo}
              onClick={() => setIndex(i)}
              className={cn(
                "h-2 rounded-full transition-all",
                i === safeIndex ? "w-6 bg-foreground" : "w-2 bg-muted-foreground/40",
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
