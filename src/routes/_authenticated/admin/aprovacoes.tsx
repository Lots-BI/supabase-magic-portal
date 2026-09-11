import { adminTitle } from "@/lib/brand";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, BarChart3 } from "lucide-react";
import { z } from "zod";
import { PageHeader } from "@/components/lots/PageHeader";
import { DashboardSkeleton } from "@/components/lots/DashboardSkeleton";
import { Button } from "@/components/ui/button";
import { listClientes } from "@/lib/admin.functions";
import {
  getKanbanBoard,
  listEditorialPillars,
  runPublishDueTickFn,
} from "@/modules/approval/cards/cards.server";
import { buildPillarMap } from "@/modules/approval/services/group-cards-by-date";
import { CardDetailDrawer } from "@/components/lots/approval/card/CardDetailDrawer";
import { CalendarCreateSheet } from "@/components/lots/approval/calendar/CalendarCreateSheet";
import { ApprovalPanelSkeleton } from "@/components/lots/approval/shared/ApprovalPanelSkeleton";
import { ClienteCombobox } from "@/components/lots/approval/shared/ClienteCombobox";
import { ApprovalAgencyQueue } from "@/components/lots/approval/shared/ApprovalAgencyQueue";
import { AgencyNowStrip } from "@/components/lots/approval/shared/AgencyNowStrip";
import { ContentInsightsPanel } from "@/components/lots/approval/insights/ContentInsightsPanel";
import type { ContentCardStatus } from "@/modules/approval/types/content-card";
import { isoDay } from "@/modules/approval/services/calendar-date-utils";
import { agencyTurnCards, flattenKanbanCards } from "@/modules/approval/services/workflow-stamps";
import type { KanbanBoard } from "@/modules/approval/services/build-kanban-board";
import { buildContentInsights } from "@/modules/approval/services/build-content-insights";
import { listInstagramPostsFn } from "@/modules/instagram-posts/instagram-posts.server";
import type { IgMediaRow } from "@/modules/instagram-posts/types";

const EMPTY_POSTS: IgMediaRow[] = [];

const ApprovalCalendar = lazy(() =>
  import("@/components/lots/approval/calendar/ApprovalCalendar").then((m) => ({
    default: m.ApprovalCalendar,
  })),
);

const LAST_CLIENT_KEY = "lots.admin.aprovacoes.cliente";
let lastPublishTickAt = 0;

const aprovacoesSearchSchema = z.object({
  tab: z.enum(["calendar", "kanban", "materials", "library", "pillars"]).optional(),
  estrategia: z.string().uuid().optional(),
  cliente: z.coerce.number().int().positive().optional().catch(undefined),
  card: z.string().uuid().optional().catch(undefined),
});

function invalidateApprovalViews(
  qc: ReturnType<typeof useQueryClient>,
  clienteId: number,
  cardId?: string,
) {
  if (cardId) qc.invalidateQueries({ queryKey: ["content-card", cardId] });
  qc.invalidateQueries({ queryKey: ["approval", "kanban", clienteId] });
  qc.invalidateQueries({ queryKey: ["approval", "calendar", clienteId] });
  qc.invalidateQueries({ queryKey: ["editorial-pillars", clienteId] });
  qc.invalidateQueries({ queryKey: ["approval", "library", clienteId] });
  qc.invalidateQueries({ queryKey: ["approval", "materials", clienteId] });
  qc.invalidateQueries({ queryKey: ["approval", "ops-dashboard"] });
  qc.invalidateQueries({ queryKey: ["approval", "insights", clienteId] });
}

function workspacePathForStatus(_cardId: string, status: ContentCardStatus): string | null {
  if (
    status === "roteiro" ||
    status === "alteracoes_roteiro" ||
    status === "aguardando_aprovacao"
  ) {
    return "roteiro";
  }
  if (status === "producao" || status === "alteracoes_design") return "producao";
  if (status === "agendado" || status === "aguardando_aprovacao_final" || status === "publicado") {
    return "agendar";
  }
  return null;
}

export const Route = createFileRoute("/_authenticated/admin/aprovacoes")({
  head: () => ({ meta: [{ title: adminTitle("Conteúdos") }] }),
  validateSearch: aprovacoesSearchSchema,
  component: AprovacoesAdminPage,
});

function AprovacoesAdminPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const listClientesFn = useServerFn(listClientes);
  const boardFn = useServerFn(getKanbanBoard);
  const pillarsFn = useServerFn(listEditorialPillars);
  const publishTickFn = useServerFn(runPublishDueTickFn);
  const listPostsFn = useServerFn(listInstagramPostsFn);
  const restoredRef = useRef(false);

  const clienteId = search.cliente;
  const [openCardId, setOpenCardId] = useState<string | null>(search.card ?? null);
  const [calendarCreateDate, setCalendarCreateDate] = useState<string | null>(null);
  const statusByCardRef = useRef<Record<string, ContentCardStatus>>({});

  useEffect(() => {
    if (search.card) setOpenCardId(search.card);
  }, [search.card]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (clienteId) {
      window.localStorage.setItem(LAST_CLIENT_KEY, String(clienteId));
      restoredRef.current = true;
      return;
    }
    if (restoredRef.current) return;
    restoredRef.current = true;
    const last = window.localStorage.getItem(LAST_CLIENT_KEY);
    const n = last ? Number(last) : NaN;
    if (Number.isInteger(n) && n > 0) {
      void navigate({
        to: "/admin/aprovacoes",
        search: { estrategia: search.estrategia, cliente: n },
        replace: true,
      });
    }
  }, [clienteId, navigate, search.estrategia]);

  useEffect(() => {
    const now = Date.now();
    if (now - lastPublishTickAt < 60_000) return;
    lastPublishTickAt = now;
    void publishTickFn().catch(() => undefined);
  }, [publishTickFn]);

  const setCliente = (id: number | null) => {
    void navigate({
      to: "/admin/aprovacoes",
      search: {
        estrategia: search.estrategia,
        ...(id != null ? { cliente: id } : {}),
      },
      replace: true,
    });
  };

  const openCard = (id: string, status?: ContentCardStatus) => {
    const resolved = status ?? statusByCardRef.current[id];
    if (resolved) statusByCardRef.current[id] = resolved;
    const kind = resolved ? workspacePathForStatus(id, resolved) : null;
    if (kind === "roteiro") {
      void navigate({ to: "/admin/aprovacoes/roteiro/$cardId", params: { cardId: id } });
      return;
    }
    if (kind === "producao") {
      void navigate({ to: "/admin/aprovacoes/producao/$cardId", params: { cardId: id } });
      return;
    }
    if (kind === "agendar") {
      void navigate({ to: "/admin/aprovacoes/agendar/$cardId", params: { cardId: id } });
      return;
    }
    setOpenCardId(id);
  };

  const clientesQ = useQuery({
    queryKey: ["admin", "clientes"],
    queryFn: () => listClientesFn(),
    staleTime: 60_000,
  });

  const clientes = useMemo(
    () => (clientesQ.data ?? []).filter((c: { ativo?: boolean }) => c.ativo !== false),
    [clientesQ.data],
  );

  const selectedCliente = useMemo(() => {
    if (!clienteId) return null;
    return clientes.find((c: { id: number }) => c.id === clienteId) ?? null;
  }, [clientes, clienteId]);

  const boardQ = useQuery({
    queryKey: ["approval", "kanban", clienteId],
    queryFn: () => boardFn({ data: { cadastro_cliente_id: clienteId! } }),
    enabled: !!clienteId,
  });

  useEffect(() => {
    if (!boardQ.data) return;
    const map: Record<string, ContentCardStatus> = {};
    for (const col of (boardQ.data as KanbanBoard).columns) {
      for (const card of col.cards) map[card.id] = card.status;
    }
    statusByCardRef.current = { ...statusByCardRef.current, ...map };
  }, [boardQ.data]);

  const pillarsQ = useQuery({
    queryKey: ["editorial-pillars", clienteId],
    queryFn: () =>
      pillarsFn({
        data: { cadastro_cliente_id: clienteId!, include_archived: true },
      }),
    enabled: !!clienteId,
    staleTime: 30_000,
  });

  const from90 = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return isoDay(d);
  }, []);

  const insightsQ = useQuery({
    queryKey: ["approval", "insights", clienteId, from90],
    queryFn: () =>
      listPostsFn({
        data: {
          cadastroClienteId: clienteId!,
          from: from90,
          to: isoDay(new Date()),
        },
      }),
    enabled: !!clienteId,
    staleTime: 60_000,
  });

  const pillarMap = useMemo(() => buildPillarMap(pillarsQ.data ?? []), [pillarsQ.data]);
  const nowCards = useMemo(() => agencyTurnCards(flattenKanbanCards(boardQ.data)), [boardQ.data]);
  const thumbMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const card of nowCards) map[card.id] = card.capa_url;
    return map;
  }, [nowCards]);
  const insightPosts =
    (insightsQ.data as { posts?: IgMediaRow[] } | undefined)?.posts ?? EMPTY_POSTS;
  const peakHour = useMemo(() => buildContentInsights(insightPosts).peakHour, [insightPosts]);

  const onCardMutated = () => {
    if (selectedCliente) invalidateApprovalViews(qc, selectedCliente.id, openCardId ?? undefined);
  };

  if (clientesQ.isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <PageHeader eyebrow="Social" title="Conteúdos" />

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <ClienteCombobox clientes={clientes} value={clienteId ?? null} onChange={setCliente} />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/aprovacoes/dashboard">
              <BarChart3 className="mr-2 h-4 w-4" />
              Dashboard ops
            </Link>
          </Button>
          {selectedCliente ? (
            <Button
              className="hidden md:inline-flex"
              onClick={() => setCalendarCreateDate(isoDay(new Date()))}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo
            </Button>
          ) : null}
        </div>
      </div>

      {!clienteId && <ApprovalAgencyQueue onSelectCliente={(id) => setCliente(id)} />}

      {clienteId && boardQ.isLoading && <ApprovalPanelSkeleton rows={3} />}
      {clienteId && !boardQ.isLoading && (
        <AgencyNowStrip cards={nowCards} thumbMap={thumbMap} onOpenCard={openCard} />
      )}

      {clienteId ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <Suspense fallback={<ApprovalPanelSkeleton rows={8} />}>
            <ApprovalCalendar
              cadastroClienteId={clienteId}
              estrategiaId={search.estrategia}
              pillarMap={pillarMap}
              onOpenCard={openCard}
              onCreateDay={(iso) => setCalendarCreateDate(iso)}
            />
          </Suspense>
          <ContentInsightsPanel
            posts={insightPosts}
            onOpenCard={(id) => openCard(id)}
            onOpenPermalink={(url) => window.open(url, "_blank", "noopener,noreferrer")}
          />
        </div>
      ) : null}

      {selectedCliente ? (
        <Button
          type="button"
          size="icon"
          className="fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full shadow-lg md:hidden"
          onClick={() => setCalendarCreateDate(isoDay(new Date()))}
        >
          <Plus className="h-6 w-6" />
        </Button>
      ) : null}

      {openCardId && selectedCliente && (
        <CardDetailDrawer
          cardId={openCardId}
          cadastroClienteId={selectedCliente.id}
          onClose={() => setOpenCardId(null)}
          onMutated={onCardMutated}
        />
      )}

      {calendarCreateDate && selectedCliente && (
        <CalendarCreateSheet
          open
          onClose={() => setCalendarCreateDate(null)}
          cadastroClienteId={selectedCliente.id}
          clienteNome={selectedCliente.nome_cliente}
          defaultDate={calendarCreateDate}
          suggestedTime={peakHour}
          onCreated={(cardId) => {
            onCardMutated();
            void navigate({
              to: "/admin/aprovacoes/roteiro/$cardId",
              params: { cardId },
            });
          }}
        />
      )}
    </div>
  );
}
