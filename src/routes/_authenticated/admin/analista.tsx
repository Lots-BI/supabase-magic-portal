import { createFileRoute, isRedirect, redirect } from "@tanstack/react-router";
import { AdminReportAnalystPage } from "@/components/lots/operational-report/AdminReportAnalystPage";
import { checkIsAdmin } from "@/lib/admin.functions";
import { adminTitle } from "@/lib/brand";
import { isPlatformOwnerEmail } from "@/lib/platform-owner";

export const Route = createFileRoute("/_authenticated/admin/analista")({
  beforeLoad: async ({ context }) => {
    if (isPlatformOwnerEmail(context.user?.email)) return;
    try {
      const { isAdmin } = await checkIsAdmin();
      if (!isAdmin) throw redirect({ to: "/admin" });
    } catch (error) {
      if (isRedirect(error)) throw error;
      throw redirect({ to: "/admin" });
    }
  },
  head: () => ({ meta: [{ title: adminTitle("Analista") }] }),
  component: AdminReportAnalystPage,
});
