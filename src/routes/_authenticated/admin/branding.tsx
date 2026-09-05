import { createFileRoute } from "@tanstack/react-router";
import { BrandGuide } from "@/components/lots/branding/BrandGuide";
import { adminTitle } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/admin/branding")({
  head: () => ({ meta: [{ title: adminTitle("Branding") }] }),
  component: AdminBrandingPage,
});

function AdminBrandingPage() {
  return <BrandGuide />;
}
