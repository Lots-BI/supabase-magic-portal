import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { z } from "zod";
import { adminTitle } from "@/lib/brand";
import { DashboardSkeleton } from "@/components/lots/DashboardSkeleton";
import { ConnectionDetailView } from "@/components/lots/platform-hub/ConnectionDetailView";
import { getHubConnectionDetail } from "@/modules/platform-hub-admin/hub-admin.server";
import { hubAdminKeys } from "@/modules/platform-hub-admin/query-keys";

export const Route = createFileRoute("/_authenticated/admin/conexoes/$connectionId")({
  head: () => ({ meta: [{ title: adminTitle("Conexão") }] }),
  params: { parse: (p) => z.object({ connectionId: z.string().uuid() }).parse(p) },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      queryOptions({
        queryKey: hubAdminKeys.connection(params.connectionId),
        queryFn: () => getHubConnectionDetail({ data: { connectionId: params.connectionId } }),
      }),
    ),
  component: ConnectionPage,
});

function ConnectionPage() {
  return (
    <Suspense fallback={<DashboardSkeleton kpiCount={2} withChart={false} />}>
      <ConnectionContent />
    </Suspense>
  );
}

function ConnectionContent() {
  const { connectionId } = Route.useParams();
  const { data } = useSuspenseQuery(
    queryOptions({
      queryKey: hubAdminKeys.connection(connectionId),
      queryFn: () => getHubConnectionDetail({ data: { connectionId } }),
    }),
  );
  return <ConnectionDetailView detail={data} />;
}
