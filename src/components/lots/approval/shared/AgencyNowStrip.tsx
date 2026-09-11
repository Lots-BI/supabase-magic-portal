import type { ContentCard, ContentCardStatus } from "@/modules/approval/types/content-card";
import { ContentPosterCard } from "./ContentPosterCard";

export function AgencyNowStrip({
  cards,
  thumbMap,
  onOpenCard,
}: {
  cards: ContentCard[];
  thumbMap?: Record<string, string | null>;
  onOpenCard: (id: string, status: ContentCardStatus) => void;
}) {
  if (cards.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cards.map((card) => (
          <ContentPosterCard
            key={card.id}
            card={card}
            thumbnailUrl={thumbMap?.[card.id]}
            onOpen={() => onOpenCard(card.id, card.status)}
          />
        ))}
      </div>
    </section>
  );
}
