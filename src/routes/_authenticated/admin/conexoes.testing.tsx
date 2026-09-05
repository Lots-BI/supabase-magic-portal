import { createFileRoute } from "@tanstack/react-router";
import { adminTitle } from "@/lib/brand";
import { HomologationTestingCenter } from "@/components/lots/platform-hub/HomologationTestingCenter";

export const Route = createFileRoute("/_authenticated/admin/conexoes/testing")({
  head: () => ({ meta: [{ title: adminTitle("Testing Center") }] }),
  component: TestingPage,
});

function TestingPage() {
  return <HomologationTestingCenter />;
}
