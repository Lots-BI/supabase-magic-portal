import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getHubAgencyAlerts } from "@/modules/platform-hub-admin/hub-admin.server";
import { hubAdminKeys } from "@/modules/platform-hub-admin/query-keys";
import { getApprovalOpsDashboard } from "@/modules/approval/dashboard/dashboard.server";

/** Contagens leves para badges da sidebar admin (Marco 3). */
export function useAdminNavBadges(enabled: boolean) {
  const alertsQuery = useQuery({
    queryKey: [...hubAdminKeys.all, "agency-alerts", "nav"],
    queryFn: () => getHubAgencyAlerts(),
    staleTime: 60_000,
    enabled,
  });

  const approvalsQuery = useQuery({
    queryKey: ["approval", "ops-dashboard", "nav-badge"],
    queryFn: () => getApprovalOpsDashboard({ data: {} }),
    staleTime: 60_000,
    enabled,
  });

  return useMemo(() => {
    const alerts = alertsQuery.data;
    const conexoesCount = alerts
      ? new Set([
          ...alerts.unhealthy.map((c) => c.id),
          ...alerts.degraded.map((c) => c.id),
          ...alerts.staleSync.map((c) => c.id),
        ]).size
      : 0;

    const aprovacoesCount = approvalsQuery.data?.awaitingApproval ?? 0;

    return {
      conexoes: conexoesCount > 0 ? conexoesCount : undefined,
      aprovacoes: aprovacoesCount > 0 ? aprovacoesCount : undefined,
      isLoading: alertsQuery.isLoading || approvalsQuery.isLoading,
    };
  }, [alertsQuery.data, alertsQuery.isLoading, approvalsQuery.data, approvalsQuery.isLoading]);
}
