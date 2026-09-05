import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { AgencyTimelineEvent } from "@/modules/agency-os";
import type { RankedFeedItem } from "@/modules/agency-os/intelligence/types";
import {
  groupTimelineEvents,
  type TimelineGroupItem,
} from "@/modules/agency-os/services/group-timeline-events";
import { AlertTriangle, Check } from "lucide-react";

export function IntelligentFeed({
  events,
  rankedFeed,
  className,
}: {
  events?: AgencyTimelineEvent[];
  rankedFeed?: RankedFeedItem[];
  className?: string;
}) {
  const orderedEvents = rankedFeed?.map((r) => r.event) ?? events ?? [];

  if (orderedEvents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma atividade recente. Ações na Central aparecerão aqui automaticamente.
      </p>
    );
  }

  const criticalIds = new Set(rankedFeed?.filter((r) => r.critical).map((r) => r.event.id) ?? []);
  const groups = groupTimelineEvents(orderedEvents);

  return (
    <div className={cn("space-y-6", className)}>
      {groups.map((group) => (
        <div key={group.period}>
          <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {group.period}
          </p>
          <ul className="space-y-2">
            {group.items.map((item, idx) => (
              <FeedRow
                key={rowKey(item, idx)}
                item={item}
                critical={item.kind === "single" && criticalIds.has(item.event!.id)}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function rowKey(item: TimelineGroupItem, idx: number) {
  return item.kind === "single" ? item.event!.id : `agg-${item.aggregateLabel}-${idx}`;
}

function FeedRow({ item, critical }: { item: TimelineGroupItem; critical?: boolean }) {
  if (item.kind === "aggregate") {
    return (
      <li className="flex items-start gap-2.5 rounded-lg px-1 py-1 text-sm">
        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <Check className="h-3 w-3" aria-hidden />
        </span>
        <p className="font-medium text-foreground">
          {item.aggregateCount} {item.aggregateLabel}
        </p>
      </li>
    );
  }

  const event = item.event!;
  return (
    <li
      className={cn(
        "flex items-start gap-2.5 rounded-lg px-1 py-1 text-sm transition-colors hover:bg-muted/40",
        critical && "bg-danger/5",
      )}
    >
      <span
        className={cn(
          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full",
          critical
            ? "bg-danger/12 text-[color:var(--danger)]"
            : "bg-success/12 text-[color:var(--success)]",
        )}
      >
        {critical ? (
          <AlertTriangle className="h-3 w-3" aria-hidden />
        ) : (
          <Check className="h-3 w-3" aria-hidden />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-foreground">
          <span className="font-medium">{event.title}</span>
          {event.cliente_nome && (
            <span className="text-muted-foreground"> · {event.cliente_nome}</span>
          )}
        </p>
        {event.summary && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{event.summary}</p>
        )}
        <time
          className="mt-0.5 block text-[10.5px] text-muted-foreground/80"
          dateTime={event.created_at}
        >
          {formatDistanceToNow(parseISO(event.created_at), { addSuffix: true, locale: ptBR })}
        </time>
      </div>
    </li>
  );
}
