import { Suspense } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { WorkspaceWidgetShell, WidgetSkeleton } from "./WorkspaceWidgetShell";
import { getClientTimeline } from "@/modules/agency-os/agency-os.server";
import { agencyOsKeys } from "@/modules/agency-os/query-keys";
import { groupTimelineEvents } from "@/modules/agency-os/services/group-timeline-events";
import { Check } from "lucide-react";

const timelineQuery = (clientId: number) =>
  queryOptions({
    queryKey: agencyOsKeys.clientTimeline(clientId),
    queryFn: () => getClientTimeline({ data: { id: clientId } }),
  });

export function TimelineWidget({ clientId }: { clientId: number }) {
  return (
    <Suspense
      fallback={
        <WorkspaceWidgetShell title="Timeline" description="Histórico automático">
          <WidgetSkeleton rows={4} />
        </WorkspaceWidgetShell>
      }
    >
      <TimelineWidgetContent clientId={clientId} />
    </Suspense>
  );
}

function TimelineWidgetContent({ clientId }: { clientId: number }) {
  const { data: events } = useSuspenseQuery(timelineQuery(clientId));
  const groups = groupTimelineEvents(events);

  return (
    <WorkspaceWidgetShell title="Timeline" description="Histórico automático">
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.period}>
              <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {group.period}
              </p>
              <ul className="space-y-2">
                {group.items.map((item, idx) => (
                  <li
                    key={item.kind === "single" ? item.event!.id : `agg-${idx}`}
                    className="flex items-start gap-2 rounded-lg px-1 py-1 text-sm hover:bg-muted/30"
                  >
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success/12 text-[color:var(--success)]">
                      <Check className="h-3 w-3" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      {item.kind === "aggregate" ? (
                        <p className="font-medium text-foreground">
                          {item.aggregateCount} {item.aggregateLabel}
                        </p>
                      ) : (
                        <>
                          <p className="font-medium text-foreground">{item.event!.title}</p>
                          {item.event!.summary && (
                            <p className="text-xs text-muted-foreground">{item.event!.summary}</p>
                          )}
                        </>
                      )}
                      <time className="text-[10px] text-muted-foreground" dateTime={item.latestAt}>
                        {formatDistanceToNow(parseISO(item.latestAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </time>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </WorkspaceWidgetShell>
  );
}
