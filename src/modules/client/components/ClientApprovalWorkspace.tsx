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
import { StoryPlanSheet } from "@/components/lots/approval/stories/StoryPlanSheet";
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
  const [tab, setTab] = useState<ApprovalTab>("kanban");
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  const isSlugMode = scope.mode === "slug_context";

  const accessQ = useQuery({
    queryKey: ["client-aprovacoes", "access", scope.scopeQueryKey],
    queryFn: () => accessFn({ data: scope.scopeInput }),
  });

  const portalReady = accessQ.data?.role === "cliente" || accessQ.data?.role === "slug_context";

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

  if (!isSlugMode && accessQ.data?.role === "staff_redirect") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Conteúdo"
          title="Aprovações"
          description="Este ambiente é destinado a clientes. Use o painel administrativo para produção."
        />
        <SectionCard title="Acesso administrativo">
          <p className="mb-4 text-sm text-muted-foreground">
            Você está autenticado como equipe interna. O Kanban de produção fica em Aprovações
            (admin).
          </p>
          <Button asChild>
            <Link to="/admin/aprovacoes">Ir para Aprovações (admin)</Link>
          </Button>
        </SectionCard>
      </div>
    );
  }

  const description = isSlugMode
    ? `Visualização do cliente ${scope.clienteNome ?? scope.clienteSlug} — somente leitura.`
    : "Estratégia editorial, calendário e pipeline de aprovação — somente leitura.";

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Conteúdo" title="Aprovações" description={description} />

      <ApprovalWorkspaceTabs value={tab} onChange={setTab} />

      {tab === "kanban" && boardQ.isLoading && <ApprovalPanelSkeleton rows={6} />}

      {tab === "kanban" && !boardQ.isLoading && totalCards === 0 && (
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
        <ApprovalCalendar pillarMap={pillarMap} onOpenCard={setOpenCardId} readOnly clientMode />
      )}

      {tab === "pillars" && <EditorialPillarsPanel readOnly clientMode />}

      {tab === "stories" && <StoryPlanSheet readOnly clientMode onOpenCard={setOpenCardId} />}

      {tab === "library" && <LibraryPanel readOnly clientMode />}

      {openCardId && (
        <ClientCardDetailDrawer
          cardId={openCardId}
          onClose={() => setOpenCardId(null)}
          onMutated={() => invalidateScopedViews(qc, scope.scopeQueryKey, openCardId)}
        />
      )}
    </div>
  );
}
