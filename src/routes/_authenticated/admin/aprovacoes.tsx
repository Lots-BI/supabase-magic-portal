import { adminTitle } from "@/lib/brand";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, BarChart3 } from "lucide-react";
import { z } from "zod";
import { PageHeader } from "@/components/lots/PageHeader";
import { DashboardSkeleton } from "@/components/lots/DashboardSkeleton";
import { Button } from "@/components/ui/button";
import { listClientes } from "@/lib/admin.functions";
import {
  getKanbanBoard,
  moveCard,
  archiveCard,
  listEditorialPillars,
  runPublishDueTickFn,
} from "@/modules/approval/cards/cards.server";
import { buildPillarMap } from "@/modules/approval/services/group-cards-by-date";
import { CardDetailDrawer } from "@/components/lots/approval/card/CardDetailDrawer";
import { CardCreateSheet } from "@/components/lots/approval/card/CardCreateSheet";
import { CalendarCreateSheet } from "@/components/lots/approval/calendar/CalendarCreateSheet";
import {
  ApprovalWorkspaceTabs,
  type ApprovalTab,
} from "@/components/lots/approval/shared/ApprovalWorkspaceTabs";
import { ApprovalEmptyState } from "@/components/lots/approval/shared/ApprovalEmptyState";
import { ApprovalPanelSkeleton } from "@/components/lots/approval/shared/ApprovalPanelSkeleton";
import { ClienteCombobox } from "@/components/lots/approval/shared/ClienteCombobox";
import { ApprovalAgencyQueue } from "@/components/lots/approval/shared/ApprovalAgencyQueue";
import { ApprovalConfirmDialog } from "@/components/lots/approval/shared/ApprovalConfirmDialog";
import { ClipboardList } from "lucide-react";
import type { ContentCardStatus } from "@/modules/approval/types/content-card";
import { isoDay } from "@/modules/approval/services/calendar-date-utils";

const KanbanBoardView = lazy(() =>
  import("@/components/lots/approval/kanban/KanbanBoard").then((m) => ({
    default: m.KanbanBoardView,
  })),
);
const ApprovalCalendar = lazy(() =>
  import("@/components/lots/approval/calendar/ApprovalCalendar").then((m) => ({
    default: m.ApprovalCalendar,
  })),
);
const EditorialPillarsPanel = lazy(() =>
  import("@/components/lots/approval/pillars/EditorialPillarsPanel").then((m) => ({
    default: m.EditorialPillarsPanel,
  })),
);
const LibraryPanel = lazy(() =>
  import("@/components/lots/approval/library/LibraryPanel").then((m) => ({
    default: m.LibraryPanel,
  })),
);
const MaterialInboxPanel = lazy(() =>
  import("@/components/lots/approval/library/MaterialInboxPanel").then((m) => ({
    default: m.MaterialInboxPanel,
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
  const moveFn = useServerFn(moveCard);
  const archiveFn = useServerFn(archiveCard);
  const pillarsFn = useServerFn(listEditorialPillars);
  const publishTickFn = useServerFn(runPublishDueTickFn);
  const restoredRef = useRef(false);

  const clienteId = search.cliente;
  const [tab, setTab] = useState<ApprovalTab>(search.tab ?? "calendar");
  const [openCardId, setOpenCardId] = useState<string | null>(search.card ?? null);
  const [archiveCardId, setArchiveCardId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [calendarCreateDate, setCalendarCreateDate] = useState<string | null>(null);
  const statusByCardRef = useRef<Record<string, ContentCardStatus>>({});

  useEffect(() => {
    if (search.tab && search.tab !== tab) setTab(search.tab);
  }, [search.tab, tab]);

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
        search: { tab: search.tab ?? "calendar", estrategia: search.estrategia, cliente: n },
        replace: true,
      });
    }
  }, [clienteId, navigate, search.estrategia, search.tab]);

  useEffect(() => {
    const now = Date.now();
    if (now - lastPublishTickAt < 60_000) return;
    lastPublishTickAt = now;
    void publishTickFn().catch(() => undefined);
  }, [publishTickFn]);

  const setSearch = (next: { tab?: ApprovalTab; cliente?: number }) => {
    void navigate({
      to: "/admin/aprovacoes",
      search: {
        tab: next.tab ?? search.tab ?? "calendar",
        estrategia: search.estrategia,
        ...(next.cliente != null ? { cliente: next.cliente } : {}),
      },
      replace: true,
    });
  };

  const setTabAndUrl = (next: ApprovalTab) => {
    setTab(next);
    setSearch({ tab: next, cliente: clienteId });
  };

  const setCliente = (id: number | null) => {
    setSearch({ tab: search.tab ?? "calendar", cliente: id ?? undefined });
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
    enabled: !!clienteId && tab === "kanban",
  });

  useEffect(() => {
    if (!boardQ.data) return;
    const map: Record<string, ContentCardStatus> = {};
    for (const col of boardQ.data.columns) {
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

  const pillarMap = useMemo(() => buildPillarMap(pillarsQ.data ?? []), [pillarsQ.data]);

  const thumbMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    if (!boardQ.data) return map;
    for (const col of boardQ.data.columns) {
      for (const card of col.cards) {
        map[card.id] = card.capa_url;
      }
    }
    return map;
  }, [boardQ.data]);

  const totalCards = useMemo(
    () => boardQ.data?.columns.reduce((sum, col) => sum + col.cards.length, 0) ?? 0,
    [boardQ.data],
  );

  const moveMut = useMutation({
    mutationFn: (input: { id: string; status: ContentCardStatus; kanban_ordem: number }) =>
      moveFn({ data: input }),
    onMutate: async (input) => {
      const key = ["approval", "kanban", clienteId];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old: typeof boardQ.data) => {
        if (!old) return old;
        let movedCard = null as (typeof old.columns)[0]["cards"][0] | null;
        const columns = old.columns.map((col) => {
          const filtered = col.cards.filter((c) => {
            if (c.id === input.id) {
              movedCard = { ...c, status: input.status, kanban_ordem: input.kanban_ordem };
              return false;
            }
            return true;
          });
          return { ...col, cards: filtered };
        });
        if (!movedCard) return old;
        return {
          columns: columns.map((col) =>
            col.status === input.status ? { ...col, cards: [...col.cards, movedCard!] } : col,
          ),
        };
      });
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["approval", "kanban", clienteId], ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => {
      if (clienteId) {
        void qc.invalidateQueries({ queryKey: ["approval", "kanban", clienteId] });
      }
    },
  });

  const archiveMut = useMutation({
    mutationFn: (id: string) => archiveFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Conteúdo arquivado.");
      setArchiveCardId(null);
      if (clienteId) invalidateApprovalViews(qc, clienteId);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onCardMutated = () => {
    if (selectedCliente) invalidateApprovalViews(qc, selectedCliente.id, openCardId ?? undefined);
  };

  if (clientesQ.isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Social"
        title="Conteúdos"
        description="Calendário e roteiro → cliente aprova e envia mídias → produção → aprovação final já com horário no Lots."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <ClienteCombobox clientes={clientes} value={clienteId ?? null} onChange={setCliente} />
          {clienteId ? (
            <ApprovalWorkspaceTabs value={tab} onChange={setTabAndUrl} variant="admin" />
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/aprovacoes/dashboard">
              <BarChart3 className="mr-2 h-4 w-4" />
              Dashboard ops
            </Link>
          </Button>
          {selectedCliente && (tab === "kanban" || tab === "calendar") ? (
            <Button
              onClick={() =>
                tab === "calendar" ? setCalendarCreateDate(isoDay(new Date())) : setCreateOpen(true)
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo conteúdo
            </Button>
          ) : null}
        </div>
      </div>

      {!clienteId && <ApprovalAgencyQueue onSelectCliente={(id) => setCliente(id)} />}

      {clienteId && tab === "kanban" && boardQ.isLoading && <ApprovalPanelSkeleton rows={6} />}

      {clienteId && tab === "kanban" && !boardQ.isLoading && boardQ.data && totalCards === 0 && (
        <ApprovalEmptyState
          icon={ClipboardList}
          title="Nenhum conteúdo no pipeline"
          description="Crie o primeiro conteúdo editorial para este cliente."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo conteúdo
            </Button>
          }
        />
      )}

      {clienteId && tab === "kanban" && boardQ.data && totalCards > 0 && (
        <Suspense fallback={<ApprovalPanelSkeleton rows={6} />}>
          <KanbanBoardView
            board={boardQ.data}
            pillarMap={pillarMap}
            thumbMap={thumbMap}
            onMoveCard={(input) => moveMut.mutate(input)}
            onOpenCard={openCard}
            onArchiveCard={setArchiveCardId}
          />
        </Suspense>
      )}

      {clienteId && tab === "calendar" && (
        <Suspense fallback={<ApprovalPanelSkeleton rows={8} />}>
          <ApprovalCalendar
            cadastroClienteId={clienteId}
            estrategiaId={search.estrategia}
            pillarMap={pillarMap}
            onOpenCard={openCard}
            onCreateDay={(iso) => setCalendarCreateDate(iso)}
          />
        </Suspense>
      )}

      {clienteId && tab === "pillars" && (
        <Suspense fallback={<ApprovalPanelSkeleton />}>
          <EditorialPillarsPanel cadastroClienteId={clienteId} />
        </Suspense>
      )}

      {clienteId && tab === "materials" && (
        <Suspense fallback={<ApprovalPanelSkeleton rows={6} />}>
          <MaterialInboxPanel cadastroClienteId={clienteId} />
        </Suspense>
      )}

      {clienteId && tab === "library" && (
        <Suspense fallback={<ApprovalPanelSkeleton rows={6} />}>
          <LibraryPanel cadastroClienteId={clienteId} />
        </Suspense>
      )}

      {openCardId && selectedCliente && (
        <CardDetailDrawer
          cardId={openCardId}
          cadastroClienteId={selectedCliente.id}
          onClose={() => setOpenCardId(null)}
          onMutated={onCardMutated}
        />
      )}

      <ApprovalConfirmDialog
        open={!!archiveCardId}
        onOpenChange={(open) => {
          if (!open) setArchiveCardId(null);
        }}
        title="Arquivar conteúdo?"
        description="O card sai do Kanban e da fila de publicação. Você encontra na Biblioteca, como arquivado."
        confirmLabel="Arquivar"
        onConfirm={() => {
          if (archiveCardId) archiveMut.mutate(archiveCardId);
        }}
        loading={archiveMut.isPending}
      />

      {createOpen && selectedCliente && (
        <CardCreateSheet
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          cliente={selectedCliente}
          onCreated={(cardId) => {
            onCardMutated();
            if (cardId) {
              void navigate({
                to: "/admin/aprovacoes/roteiro/$cardId",
                params: { cardId },
              });
            }
          }}
        />
      )}

      {calendarCreateDate && selectedCliente && (
        <CalendarCreateSheet
          open
          onClose={() => setCalendarCreateDate(null)}
          cadastroClienteId={selectedCliente.id}
          clienteNome={selectedCliente.nome_cliente}
          defaultDate={calendarCreateDate}
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
