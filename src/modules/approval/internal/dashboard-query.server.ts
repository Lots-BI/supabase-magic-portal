import type { SupabaseClient } from "@supabase/supabase-js";
import {
  dashboardRepository,
  type DashboardScope,
} from "../repositories/dashboard.repository.server";
import { mapContentCardEventRow } from "../repositories/row-mappers";
import type { OpsDashboardData } from "../dashboard/types/dashboard";
import {
  aggregateStageAverages,
  countByStatusValue,
  WORKFLOW_METRICS_FRAMEWORK,
} from "../dashboard/services/build-ops-dashboard";

export async function getOpsDashboard(
  supabase: SupabaseClient,
  scope?: DashboardScope,
): Promise<OpsDashboardData> {
  const [byStatus, byClient, byResponsavel, overdueCount, publishedThisWeek] = await Promise.all([
    dashboardRepository.countByStatus(supabase, scope),
    dashboardRepository.countByClient(supabase, scope),
    dashboardRepository.countByResponsavel(supabase, scope),
    dashboardRepository.countOverdue(supabase, scope),
    dashboardRepository.countPublishedThisWeek(supabase, scope),
  ]);

  const totalCards = byStatus.reduce((sum, r) => sum + r.count, 0);
  const publishedCount = countByStatusValue(byStatus, "publicado");
  const archivedCount = countByStatusValue(byStatus, "arquivado");
  const awaitingApproval = countByStatusValue(byStatus, "aguardando_aprovacao");
  const changesRequested =
    countByStatusValue(byStatus, "alteracoes_roteiro") +
    countByStatusValue(byStatus, "alteracoes_design");

  const cardIds = await dashboardRepository.listCardIdsForMetrics(supabase, scope);
  const rawEvents = await dashboardRepository.listEventsForCardIds(supabase, cardIds);
  const eventsByCard = new Map<string, ReturnType<typeof mapContentCardEventRow>[]>();
  for (const row of rawEvents) {
    const event = mapContentCardEventRow(row);
    const list = eventsByCard.get(event.card_id) ?? [];
    list.push(event);
    eventsByCard.set(event.card_id, list);
  }

  const stageAverages = aggregateStageAverages(eventsByCard);

  return {
    totalCards,
    byStatus,
    byClient,
    byResponsavel,
    publishedCount,
    archivedCount,
    overdueCount,
    publishedThisWeek,
    awaitingApproval,
    changesRequested,
    stageAverages,
    metricsFramework: WORKFLOW_METRICS_FRAMEWORK,
  };
}
