import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Eye } from "lucide-react";
import { PageHeader } from "@/components/lots/PageHeader";
import { SectionCard } from "@/components/lots/SectionCard";
import { ApprovalPanelSkeleton } from "@/components/lots/approval/shared/ApprovalPanelSkeleton";
import { ClientCardDetailDrawer } from "@/components/lots/approval/card/ClientCardDetailDrawer";
import { buildPillarMap } from "@/modules/approval/services/group-cards-by-date";
import { ApprovalCalendar } from "@/components/lots/approval/calendar/ApprovalCalendar";
import { ClientSuaVezQueue } from "@/components/lots/approval/shared/ClientSuaVezQueue";
import { clientTurnCards, flattenKanbanCards } from "@/modules/approval/services/workflow-stamps";
import { Button } from "@/components/ui/button";
import { useClientScope } from "@/modules/client/context";
import {
  checkScopedPortalAccessFn,
  getScopedKanbanBoardFn,
  listScopedEditorialPillarsFn,
} from "@/modules/client/scoped-portal.functions";
import { listMaterialStatus } from "@/modules/approval/library/content-library.server";

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

export function ClientApprovalWorkspace({ initialCardId }: { initialCardId?: string }) {
  const scope = useClientScope();
  const qc = useQueryClient();
  const accessFn = useServerFn(checkScopedPortalAccessFn);
  const boardFn = useServerFn(getScopedKanbanBoardFn);
  const pillarsFn = useServerFn(listScopedEditorialPillarsFn);
  const [openCardId, setOpenCardId] = useState<string | null>(initialCardId ?? null);

  useEffect(() => {
    if (initialCardId) setOpenCardId(initialCardId);
  }, [initialCardId]);

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
    enabled: portalReady,
  });

  const pillarsQ = useQuery({
    queryKey: ["editorial-pillars", scope.scopeQueryKey],
    queryFn: () => pillarsFn({ data: { scope: scope.scopeInput } }),
    enabled: portalReady,
  });

  const pillarMap = useMemo(() => buildPillarMap(pillarsQ.data ?? []), [pillarsQ.data]);
  const suaVez = useMemo(() => clientTurnCards(flattenKanbanCards(boardQ.data)), [boardQ.data]);

  const thumbMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const card of suaVez) map[card.id] = card.capa_url;
    return map;
  }, [suaVez]);

  if (accessQ.isLoading) return <ApprovalPanelSkeleton rows={4} />;

  if (accessQ.isError) {
    const msg =
      accessQ.error instanceof Error
        ? accessQ.error.message
        : "Não foi possível validar o acesso ao portal.";
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Social" title="Conteúdos" />
        <SectionCard title="Acesso">
          <p className="text-sm text-destructive">{msg}</p>
        </SectionCard>
      </div>
    );
  }

  if (!isStaffPreview && accessQ.data?.role === "staff_redirect") {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Social" title="Conteúdos" />
        <Button asChild>
          <Link to="/admin/aprovacoes">Conteúdos</Link>
        </Button>
      </div>
    );
  }

  if (!portalReady) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Social" title="Conteúdos" />
        <ApprovalPanelSkeleton rows={4} />
      </div>
    );
  }

  const brand = scope.clienteNome ?? scope.clienteSlug ?? "";

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Social"
        title="Conteúdos"
        description={isStaffPreview ? brand : undefined}
      />

      {isStaffPreview && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-foreground">
            <Eye className="h-4 w-4 shrink-0" />
            Pré-visualização exatamente como <strong>{brand}</strong> vê. Ações aqui não são
            registradas.
          </p>
          <Button variant="outline" size="sm" asChild>
            {scope.cadastroClienteId ? (
              <Link to="/admin/aprovacoes" search={{ cliente: scope.cadastroClienteId }}>
                Voltar ao admin
              </Link>
            ) : (
              <Link to="/admin/aprovacoes">Voltar ao admin</Link>
            )}
          </Button>
        </div>
      )}

      {boardQ.isLoading && <ApprovalPanelSkeleton rows={6} />}

      {boardQ.isError && (
        <p className="text-sm text-destructive">
          Não foi possível carregar.
          {boardQ.error instanceof Error ? ` ${boardQ.error.message}` : ""}
        </p>
      )}

      {scope.cadastroClienteId ? (
        <MaterialStatus cadastroClienteId={scope.cadastroClienteId} />
      ) : null}

      {!boardQ.isLoading && !boardQ.isError && suaVez.length > 0 && (
        <ClientSuaVezQueue cards={suaVez} thumbMap={thumbMap} onOpenCard={setOpenCardId} />
      )}

      {!boardQ.isLoading && !boardQ.isError && suaVez.length === 0 && (
        <div className="relative min-h-[52vh]">
          <p className="font-display text-4xl font-semibold tracking-tight">{brand}</p>
          <div className="absolute bottom-0 right-0 w-[min(100%,280px)] scale-90 origin-bottom-right opacity-90">
            <ApprovalCalendar
              pillarMap={pillarMap}
              onOpenCard={setOpenCardId}
              readOnly
              clientMode
              ready={portalReady}
              compact
            />
          </div>
        </div>
      )}

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

function MaterialStatus({ cadastroClienteId }: { cadastroClienteId: number }) {
  const listFn = useServerFn(listMaterialStatus);
  const status = useQuery({
    queryKey: ["material-status", cadastroClienteId],
    queryFn: () => listFn({ data: { cadastroClienteId } }),
  });
  const rows = status.data ?? [];
  if (rows.length === 0) return null;
  return (
    <SectionCard title="Mídias" eyebrow="Biblioteca">
      <ul className="space-y-2 text-sm">
        {rows.map((row) => (
          <li key={row.cardId} className="flex items-center justify-between gap-3">
            <span>{row.titulo}</span>
            <span className={row.baixado ? "text-primary" : "text-muted-foreground"}>
              {row.baixado ? "Baixado" : "Não baixado"}
            </span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
