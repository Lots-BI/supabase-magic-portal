import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { brandTitle } from "@/lib/brand";
import { PlatformNewsPage } from "@/components/lots/platform-news/PlatformNewsPage";
import { checkIsAdmin } from "@/lib/admin.functions";
import { markAllClientReleasesSeen } from "@/lib/platform-news/announce-new-releases";

export const Route = createFileRoute("/_authenticated/novidades")({
  head: () => ({ meta: [{ title: brandTitle("Novidades") }] }),
  loader: async ({ context }) => {
    const result = await context.queryClient.fetchQuery({
      queryKey: ["me", "isAdmin"],
      queryFn: () => checkIsAdmin(),
    });
    return { isAdmin: !!result?.isAdmin };
  },
  component: NovidadesPage,
});

function NovidadesPage() {
  const { isAdmin } = Route.useLoaderData();
  useEffect(() => {
    markAllClientReleasesSeen();
  }, []);
  return <PlatformNewsPage audience={isAdmin ? "admin" : "client"} />;
}
