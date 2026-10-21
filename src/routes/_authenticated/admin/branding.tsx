import { createFileRoute, redirect } from "@tanstack/react-router";
import { BrandGuide } from "@/components/lots/branding/BrandGuide";
import { adminTitle } from "@/lib/brand";
import { isPlatformOwnerEmail } from "@/lib/platform-owner";
import { checkIsAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/branding")({
  head: () => ({ meta: [{ title: adminTitle("Branding") }] }),
  beforeLoad: async ({ context }) => {
    const user = (context as { user?: { email?: string | null } }).user;
    if (isPlatformOwnerEmail(user?.email)) return;
    const { isAdmin } = await checkIsAdmin();
    if (!isAdmin) throw redirect({ to: "/admin" });
  },
  component: AdminBrandingPage,
});

function AdminBrandingPage() {
  return <BrandGuide />;
}
