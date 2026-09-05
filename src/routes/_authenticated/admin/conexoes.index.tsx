import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { adminTitle } from "@/lib/brand";
import { DashboardSkeleton } from "@/components/lots/DashboardSkeleton";
import { ConnectionsHubView } from "@/components/lots/platform-hub/ConnectionsHubView";
import { getHubOverview } from "@/modules/platform-hub-admin/hub-admin.server";
import { hubAdminKeys } from "@/modules/platform-hub-admin/query-keys";

const overviewQuery = queryOptions({
  queryKey: hubAdminKeys.overview(),
  queryFn: () => getHubOverview(),
});

export const Route = createFileRoute("/_authenticated/admin/conexoes/")({
  head: () => ({ meta: [{ title: adminTitle("Conexões") }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(overviewQuery),
  component: ConexoesPage,
});

function ConexoesPage() {
  return (
    <Suspense fallback={<DashboardSkeleton kpiCount={4} withChart={false} />}>
      <ConexoesContent />
    </Suspense>
  );
}

function ConexoesContent() {
  const { data } = useSuspenseQuery(overviewQuery);
  return (
    <ConnectionsHubView
      overview={data.overview}
      connections={data.connections}
      catalog={data.catalog}
      timeline={data.timeline}
    />
  );
}
