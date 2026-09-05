import { createFileRoute } from "@tanstack/react-router";
import { SobreLotsBIPage } from "@/components/lots/SobreLotsBIPage";
import { brandTitle } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/sobre")({
  head: () => ({ meta: [{ title: brandTitle("O que é") }] }),
  component: SobrePage,
});

function SobrePage() {
  return <SobreLotsBIPage />;
}
