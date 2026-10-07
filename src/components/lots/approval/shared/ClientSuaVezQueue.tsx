import type { ContentCard } from "@/modules/approval/types/content-card";
import type { ClientRevisionFlags } from "@/modules/approval/services/workflow-stamps";
import { ContentPosterCard } from "@/components/lots/approval/shared/ContentPosterCard";

export function ClientSuaVezQueue({
  cards,
  thumbMap,
  revisions,
  onOpenCard,
}: {
  cards: ContentCard[];
  thumbMap?: Record<string, string | null>;
  revisions?: Record<string, ClientRevisionFlags>;
  onOpenCard: (id: string) => void;
}) {
  if (cards.length === 0) return null;

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <ContentPosterCard
          key={card.id}
          card={card}
          thumbnailUrl={thumbMap?.[card.id] ?? card.capa_url}
          size="hero"
          audience="client"
          revision={revisions?.[card.id]}
          onOpen={() => onOpenCard(card.id)}
        />
      ))}
    </section>
  );
}
