import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ContentCard } from "@/modules/approval/types/content-card";
import type { CalendarView } from "@/modules/approval/services/calendar-date-utils";
import {
  buildMonthDays,
  buildWeekDays,
  isoDay,
  parseIsoDay,
  WEEKDAY_LABELS,
} from "@/modules/approval/services/calendar-date-utils";
import { getCalendarCards } from "@/modules/approval/planning/calendar.server";
import { getClientCalendarCards } from "@/modules/approval/planning/client-planning.server";
import { getScopedCalendarCardsFn } from "@/modules/client/scoped-portal.functions";
import { useOptionalClientScope } from "@/modules/client/context";
import { KANBAN_COLUMN_META } from "../kanban/kanban-meta";
import type { PillarSummary } from "../shared/PillarBadge";
import { ApprovalPanelSkeleton } from "../shared/ApprovalPanelSkeleton";

export function ApprovalCalendar({
  cadastroClienteId,
  estrategiaId,
  pillarMap,
  onOpenCard,
  readOnly = false,
  clientMode = false,
}: {
  cadastroClienteId?: number;
  estrategiaId?: string;
  pillarMap: Record<string, PillarSummary>;
  onOpenCard: (id: string) => void;
  readOnly?: boolean;
  clientMode?: boolean;
}) {
  const staffFn = useServerFn(getCalendarCards);
  const clientFn = useServerFn(getClientCalendarCards);
  const scopedFn = useServerFn(getScopedCalendarCardsFn);
  const portalScope = useOptionalClientScope();

  const [view, setView] = useState<CalendarView>("month");
  const [anchor, setAnchor] = useState(() => isoDay(new Date()));

  const scopeKey = portalScope?.scopeQueryKey ?? (clientMode ? "client" : cadastroClienteId);

  const calendarQ = useQuery({
    queryKey: ["approval", "calendar", scopeKey, estrategiaId ?? null, view, anchor],
    queryFn: () => {
      if (portalScope) {
        return scopedFn({
          data: { scope: portalScope.scopeInput, view, anchor },
        });
      }
      return clientMode
        ? clientFn({ data: { view, anchor } })
        : staffFn({
            data: {
              cadastro_cliente_id: cadastroClienteId!,
              view,
              anchor,
              estrategia_id: estrategiaId,
            },
          });
    },
    enabled: !!portalScope || clientMode || !!cadastroClienteId,
    staleTime: 30_000,
  });

  const byDay = useMemo(() => {
    const raw = calendarQ.data?.byDay ?? {};
    return new Map(Object.entries(raw));
  }, [calendarQ.data?.byDay]);

  const cursor = parseIsoDay(anchor);

  const shift = (delta: number) => {
    const d = parseIsoDay(anchor);
    if (view === "month") d.setMonth(d.getMonth() + delta);
    else if (view === "week") d.setDate(d.getDate() + delta * 7);
    else d.setDate(d.getDate() + delta);
    setAnchor(isoDay(d));
  };

  const title =
    view === "month"
      ? cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
      : view === "week"
        ? `Semana de ${buildWeekDays(cursor)[0]!.toLocaleDateString("pt-BR")}`
        : cursor.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="icon" onClick={() => shift(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={() => shift(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAnchor(isoDay(new Date()))}
          >
            Hoje
          </Button>
        </div>
        <p className="text-sm font-medium capitalize">{title}</p>
        <div className="flex rounded-lg border border-border p-0.5">
          {(["month", "week", "day"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v === "month" ? "Mês" : v === "week" ? "Semana" : "Dia"}
            </button>
          ))}
        </div>
      </div>

      {calendarQ.isLoading && <ApprovalPanelSkeleton rows={8} />}

      {calendarQ.isError && (
        <p className="text-sm text-destructive">Não foi possível carregar o calendário.</p>
      )}

      {calendarQ.data && view === "month" && (
        <MonthGrid cursor={cursor} byDay={byDay} pillarMap={pillarMap} onOpenCard={onOpenCard} />
      )}

      {calendarQ.data && view === "week" && (
        <WeekGrid cursor={cursor} byDay={byDay} pillarMap={pillarMap} onOpenCard={onOpenCard} />
      )}

      {calendarQ.data && view === "day" && (
        <DayList
          iso={anchor}
          cards={byDay.get(anchor) ?? []}
          pillarMap={pillarMap}
          onOpenCard={onOpenCard}
        />
      )}

      {readOnly && <p className="text-xs text-muted-foreground">Visualização somente leitura.</p>}
    </div>
  );
}

function CalendarCardChip({
  card,
  pillarMap,
  onOpen,
}: {
  card: ContentCard;
  pillarMap: Record<string, PillarSummary>;
  onOpen: () => void;
}) {
  const pillar = card.pilar_id ? pillarMap[card.pilar_id] : null;
  const statusMeta = KANBAN_COLUMN_META[card.status];
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-1.5 truncate rounded border border-border bg-card px-1.5 py-0.5 text-left text-[10.5px] font-medium transition-transform hover:-translate-y-px"
      title={card.titulo}
    >
      {pillar && (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: pillar.cor }}
          aria-hidden
        />
      )}
      <span className="truncate">
        {statusMeta.emoji} {card.titulo}
      </span>
    </button>
  );
}

function MonthGrid({
  cursor,
  byDay,
  pillarMap,
  onOpenCard,
}: {
  cursor: Date;
  byDay: Map<string, ContentCard[]>;
  pillarMap: Record<string, PillarSummary>;
  onOpenCard: (id: string) => void;
}) {
  const days = useMemo(() => buildMonthDays(cursor), [cursor]);
  const todayIso = isoDay(new Date());

  return (
    <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-border">
      {WEEKDAY_LABELS.map((w) => (
        <div
          key={w}
          className="border-b border-r border-border bg-muted/30 px-2 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground last:border-r-0"
        >
          {w}
        </div>
      ))}
      {days.map((d, idx) => {
        const inMonth = d.getMonth() === cursor.getMonth();
        const iso = isoDay(d);
        const posts = byDay.get(iso) ?? [];
        const isToday = iso === todayIso;
        return (
          <div
            key={idx}
            className={cn(
              "min-h-[100px] border-b border-r border-border p-1.5 last:border-r-0",
              !inMonth && "bg-muted/20",
              inMonth && "bg-background",
            )}
          >
            <span
              className={cn(
                "inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[11px] font-semibold tabular-nums",
                !inMonth && "text-muted-foreground/50",
                isToday && "bg-primary text-primary-foreground",
              )}
            >
              {d.getDate()}
            </span>
            <div className="mt-1 space-y-1">
              {posts.slice(0, 3).map((card) => (
                <CalendarCardChip
                  key={card.id}
                  card={card}
                  pillarMap={pillarMap}
                  onOpen={() => onOpenCard(card.id)}
                />
              ))}
              {posts.length > 3 && (
                <p className="px-1 text-[10px] text-muted-foreground">+{posts.length - 3}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekGrid({
  cursor,
  byDay,
  pillarMap,
  onOpenCard,
}: {
  cursor: Date;
  byDay: Map<string, ContentCard[]>;
  pillarMap: Record<string, PillarSummary>;
  onOpenCard: (id: string) => void;
}) {
  const days = useMemo(() => buildWeekDays(cursor), [cursor]);
  return (
    <div className="grid gap-3 md:grid-cols-7">
      {days.map((d) => {
        const iso = isoDay(d);
        const cards = byDay.get(iso) ?? [];
        return (
          <div key={iso} className="rounded-xl border border-border p-2">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              {WEEKDAY_LABELS[d.getDay()]} {d.getDate()}
            </p>
            <div className="space-y-1">
              {cards.length === 0 && <p className="text-[11px] text-muted-foreground">—</p>}
              {cards.map((card) => (
                <CalendarCardChip
                  key={card.id}
                  card={card}
                  pillarMap={pillarMap}
                  onOpen={() => onOpenCard(card.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayList({
  iso,
  cards,
  pillarMap,
  onOpenCard,
}: {
  iso: string;
  cards: ContentCard[];
  pillarMap: Record<string, PillarSummary>;
  onOpenCard: (id: string) => void;
}) {
  if (cards.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Nenhum conteúdo em {iso}.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {cards.map((card) => {
        const pillar = card.pilar_id ? pillarMap[card.pilar_id] : null;
        return (
          <li key={card.id}>
            <button
              type="button"
              onClick={() => onOpenCard(card.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left hover:shadow-sm"
            >
              {pillar && (
                <span
                  className="h-8 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: pillar.cor }}
                />
              )}
              <div className="min-w-0">
                <p className="font-medium">{card.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  {KANBAN_COLUMN_META[card.status].emoji} {card.plataforma}
                  {card.hora_publicacao ? ` · ${card.hora_publicacao.slice(0, 5)}` : ""}
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
