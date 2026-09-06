import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/lots/PageHeader";
import { SectionCard } from "@/components/lots/SectionCard";
import { EmptyState } from "@/components/lots/EmptyState";
import { ApprovalPanelSkeleton } from "@/components/lots/approval/shared/ApprovalPanelSkeleton";
import { KanbanBoardView } from "@/components/lots/approval/kanban/KanbanBoard";
import { ClientCardDetailDrawer } from "@/components/lots/approval/card/ClientCardDetailDrawer";
import { buildPillarMap } from "@/modules/approval/services/group-cards-by-date";
import {
  ApprovalWorkspaceTabs,
  type ApprovalTab,
} from "@/components/lots/approval/shared/ApprovalWorkspaceTabs";
import { ApprovalCalendar } from "@/components/lots/approval/calendar/ApprovalCalendar";
import { EditorialPillarsPanel } from "@/components/lots/approval/pillars/EditorialPillarsPanel";
import { LibraryPanel } from "@/components/lots/approval/library/LibraryPanel";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClientScope } from "@/modules/client/context";
import {
  checkScopedPortalAccessFn,
  getScopedKanbanBoardFn,
  listScopedEditorialPillarsFn,
} from "@/modules/client/scoped-portal.functions";

function invalidateScopedViews(
  qc: ReturnType<typeof useQueryClient>,
  scopeQueryKey: string,
  cardId?: string,
) {
  if (cardId) qc.invalidateQueries({ queryKey: ["client-content-card", scopeQueryKey, cardId] });
  qc.invalidateQueries({ queryKey: ["client-aprovacoes", "kanban", scopeQueryKey] });
  qc.invalidateQueries({ queryKey: ["approval", "calendar", scopeQueryKey] });
  qc.invalidateQueries({ queryKey: ["editorial-pillars", scopeQueryKey] });
  qc.invalidateQueries({ queryKey: ["story-plan", scopeQueryKey] });
  qc.invalidateQueries({ queryKey: ["approval", "library", scopeQueryKey] });
}

export function ClientApprovalWorkspace() {
  const scope = useClientScope();
  const qc = useQueryClient();
  const accessFn = useServerFn(checkScopedPortalAccessFn);
  const boardFn = useServerFn(getScopedKanbanBoardFn);
  const pillarsFn = useServerFn(listScopedEditorialPillarsFn);
  const [tab, setTab] = useState<ApprovalTab>("calendar");
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  const accessQ = useQuery({
    queryKey: ["client-aprovacoes", "access", scope.scopeQueryKey],
    queryFn: () => accessFn({ data: scope.scopeInput }),
    retry: 1,
  });

  const isStaffPreview = accessQ.data?.role === "slug_context";
  const portalReady = accessQ.data?.role === "cliente" || isStaffPreview;
  const canMutate = accessQ.data?.role === "cliente";

  const boardQ = useQuery({
    queryKey: ["client-aprovacoes", "kanban", scope.scopeQueryKey],
    queryFn: () => boardFn({ data: { scope: scope.scopeInput } }),
    enabled: portalReady && tab === "kanban",
  });

  const pillarsQ = useQuery({
    queryKey: ["editorial-pillars", scope.scopeQueryKey],
    queryFn: () => pillarsFn({ data: { scope: scope.scopeInput } }),
    enabled: portalReady,
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

  if (accessQ.isLoading) return <ApprovalPanelSkeleton rows={4} />;

  if (accessQ.isError) {
    const msg =
      accessQ.error instanceof Error
        ? accessQ.error.message
        : "Não foi possível validar o acesso ao portal.";
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Social"
          title="Conteúdos"
          description="Não foi possível abrir o workspace do cliente."
        />
        <SectionCard title="Acesso">
          <p className="text-sm text-destructive">
            Não foi possível abrir seus conteúdos. Entre novamente ou fale com a agência para
            liberar o acesso.
          </p>
          {msg ? <p className="mt-2 text-xs text-muted-foreground">{msg}</p> : null}
        </SectionCard>
      </div>
    );
  }

  if (!isStaffPreview && accessQ.data?.role === "staff_redirect") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Social"
          title="Conteúdos"
          description="Este ambiente é destinado a clientes. Use o painel administrativo para produção."
        />
        <SectionCard title="Acesso administrativo">
          <p className="mb-4 text-sm text-muted-foreground">
            Você está autenticado como equipe interna. O workflow de produção fica em Conteúdos
            (admin).
          </p>
          <Button asChild>
            <Link to="/admin/aprovacoes">Ir para Conteúdos (admin)</Link>
          </Button>
        </SectionCard>
      </div>
    );
  }

  if (!portalReady) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Social" title="Conteúdos" description="Aguardando permissão…" />
        <ApprovalPanelSkeleton rows={4} />
      </div>
    );
  }

  const description = isStaffPreview
    ? `Visualização do cliente ${scope.clienteNome ?? scope.clienteSlug} — somente leitura.`
    : "Calendário, fila e aprovação de conteúdos — acompanhe e valide o que a agência preparou.";

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Social" title="Conteúdos" description={description} />

      <ApprovalWorkspaceTabs value={tab} onChange={setTab} variant="client" />

      {tab === "kanban" && boardQ.isLoading && <ApprovalPanelSkeleton rows={6} />}

      {tab === "kanban" && boardQ.isError && (
        <p className="text-sm text-destructive">
          Não foi possível carregar a fila.
          {boardQ.error instanceof Error ? ` ${boardQ.error.message}` : ""}
        </p>
      )}

      {tab === "kanban" && !boardQ.isLoading && !boardQ.isError && totalCards === 0 && (
        <SectionCard eyebrow="Workflow" title="Seu pipeline">
          <EmptyState
            icon={ClipboardList}
            title="Nenhum conteúdo no momento"
            description="Quando a agência enviar materiais para aprovação, eles aparecerão aqui no Kanban."
          />
        </SectionCard>
      )}

      {tab === "kanban" && boardQ.data && totalCards > 0 && (
        <KanbanBoardView
          board={boardQ.data}
          pillarMap={pillarMap}
          thumbMap={thumbMap}
          onOpenCard={setOpenCardId}
          readOnly
        />
      )}

      {tab === "calendar" && (
        <ApprovalCalendar
          pillarMap={pillarMap}
          onOpenCard={setOpenCardId}
          readOnly
          clientMode
          ready={portalReady}
        />
      )}

      {tab === "pillars" && <EditorialPillarsPanel readOnly clientMode ready={portalReady} />}

      {tab === "library" && <LibraryPanel readOnly clientMode ready={portalReady} />}

      {openCardId && (
        <ClientCardDetailDrawer
          cardId={openCardId}
          onClose={() => setOpenCardId(null)}
          onMutated={() => invalidateScopedViews(qc, scope.scopeQueryKey, openCardId)}
          allowMutations={canMutate}
        />
      )}
    </div>
  );
}
