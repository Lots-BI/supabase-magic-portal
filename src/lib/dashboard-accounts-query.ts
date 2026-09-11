import { queryOptions } from "@tanstack/react-query";
import { listDashboardAccountsFn } from "@/modules/dashboards/dashboard-accounts.server";

export const dashboardAccountsQuery = queryOptions({
  queryKey: ["dashboard-accounts"],
  queryFn: () => listDashboardAccountsFn(),
  staleTime: 60_000,
});
