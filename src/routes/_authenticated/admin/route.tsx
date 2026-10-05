import { createFileRoute, Outlet, redirect, isRedirect } from "@tanstack/react-router";
import { checkIsAdmin } from "@/lib/admin.functions";
import { checkIsOrgOperator } from "@/modules/access/organization.server";
import { checkIsStaff } from "@/modules/approval/cards/cards.server";
import { isPlatformOwnerEmail } from "@/lib/platform-owner";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context, location }) => {
    const user = context.user;
    const isAprovacoes =
      location.pathname === "/admin/aprovacoes" ||
      location.pathname.startsWith("/admin/aprovacoes/");

    if (isAprovacoes) {
      if (isPlatformOwnerEmail(user?.email)) return;
      try {
        const { isStaff } = await checkIsStaff();
        if (isStaff) return;
      } catch {
        /* fall through to admin check */
      }
    }

    if (isPlatformOwnerEmail(user?.email)) return;

    try {
      const [{ isAdmin }, org] = await Promise.all([checkIsAdmin(), checkIsOrgOperator()]);
      if (!isAdmin && !org.isOrgOperator) throw redirect({ to: "/dashboard" });
    } catch (err) {
      if (isRedirect(err)) throw err;
      throw redirect({ to: "/dashboard" });
    }
  },
  pendingComponent: AdminPending,
  component: () => <Outlet />,
});

function AdminPending() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-sm text-muted-foreground">Carregando painel admin…</p>
    </div>
  );
}
