import { createFileRoute } from "@tanstack/react-router";
import { adminTitle } from "@/lib/brand";
import { AdminDiretrizesPage } from "@/components/brandbook/AdminDiretrizesPage";

export const Route = createFileRoute("/_authenticated/admin/brandbook")({
  head: () => ({ meta: [{ title: adminTitle("Diretrizes da Marca") }] }),
  component: AdminDiretrizesPage,
});
