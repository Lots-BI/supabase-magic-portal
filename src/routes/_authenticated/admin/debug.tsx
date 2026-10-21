import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { isPlatformOwnerEmail } from "@/lib/platform-owner";
import { checkIsAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/debug")({
  beforeLoad: async ({ context }) => {
    const user = (context as { user?: { email?: string | null } }).user;
    if (isPlatformOwnerEmail(user?.email)) return;
    const { isAdmin } = await checkIsAdmin();
    if (!isAdmin) throw redirect({ to: "/admin" });
  },
  component: () => <Outlet />,
});
