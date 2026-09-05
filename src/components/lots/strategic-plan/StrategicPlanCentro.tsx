import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Settings2 } from "lucide-react";
import type { StrategicDashboardPayload } from "@/lib/strategic-plan/types";
import { PageHeader } from "@/components/lots/PageHeader";
import { Button } from "@/components/ui/button";
import { ObjetivoHero } from "./ObjetivoHero";
import { ObjetivosHistoricoSection } from "./ObjetivosHistoricoSection";
import { PrimeiroObjetivoOnboarding, ProximoObjetivoPrompt } from "./PrimeiroObjetivoOnboarding";
import { DecisoesPanel } from "./DecisoesPanel";
import { AprendizadosTimeline } from "./AprendizadosTimeline";
import { HipotesesFlow } from "./HipotesesFlow";
import { EstrategiasSection } from "./EstrategiasSection";
import { RoadmapTimeline } from "./RoadmapTimeline";
import { OportunidadesSection } from "./OportunidadesSection";
import { ProximosPassosBlock } from "./ProximosPassosBlock";
import { StrategicPlanManageDrawer } from "./StrategicPlanManageDrawer";
import { addPlanoComment } from "@/lib/strategic-plan.functions";
import type { ReactNode } from "react";

interface StrategicPlanCentroProps {
  data: StrategicDashboardPayload;
  planoId: string;
  clienteNome: string;
  isAdmin?: boolean;
  backLink?: ReactNode;
}

export function StrategicPlanCentro({
  data,
  planoId,
  clienteNome,
  isAdmin,
  backLink,
}: StrategicPlanCentroProps) {
  const [manageOpen, setManageOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const qc = useQueryClient();
  const addCommentFn = useServerFn(addPlanoComment);
  const commentMut = useMutation({
    mutationFn: (mensagem: string) => addCommentFn({ data: { plano_id: planoId, mensagem } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["strategic-dashboard", planoId] });
    },
  });

  const objetivoAtual = data.objetivoAtual;
  const estrategiasDoObjetivo = objetivoAtual?.estrategias ?? data.estrategias;

  return (
    <div className="min-w-0 space-y-6 pb-10" id="objetivos">
      {backLink}

      <PageHeader
        eyebrow="Plano Estratégico"
        title={data.plano.titulo}
        description="Planejamento contínuo — evolua por objetivos, preserve o histórico."
        actions={
          <Button
            variant="outline"
            size="sm"
            className="h-10 w-full gap-1.5 sm:h-9 sm:w-auto"
            onClick={() => setManageOpen(true)}
          >
            <Settings2 className="h-3.5 w-3.5" />
            Gerenciar
          </Button>
        }
      />

      <ObjetivoHero planoTitulo={data.plano.titulo} objetivo={objetivoAtual} />

      {data.needsPrimeiroObjetivo && (
        <PrimeiroObjetivoOnboarding
          planoId={planoId}
          clienteNome={clienteNome}
          onComplete={() => setShowOnboarding(false)}
        />
      )}

      {data.suggestProximoObjetivo && !showOnboarding && (
        <ProximoObjetivoPrompt planoId={planoId} onStart={() => setShowOnboarding(true)} />
      )}

      {showOnboarding && !data.needsPrimeiroObjetivo && (
        <PrimeiroObjetivoOnboarding
          planoId={planoId}
          clienteNome={clienteNome}
          onComplete={() => setShowOnboarding(false)}
        />
      )}

      {objetivoAtual && (
        <>
          <EstrategiasSection
            estrategias={estrategiasDoObjetivo.map((e) => ({
              ...e,
              editorialStats: data.estrategias.find((s) => s.id === e.id)?.editorialStats ?? {
                estrategia_id: e.id,
                total: 0,
                publicados: 0,
                aprovados: 0,
                aguardando: 0,
                em_producao: 0,
                rascunho: 0,
              },
            }))}
            isAdmin={isAdmin}
            objetivoTitulo={objetivoAtual.titulo}
          />
          <HipotesesFlow hipoteses={data.hipoteses} />
          <RoadmapTimeline marcos={data.roadmap} />
          <OportunidadesSection oportunidades={data.oportunidades} />
        </>
      )}

      <DecisoesPanel decisoes={data.decisoes} title="Últimas decisões" />
      <ProximosPassosBlock passos={data.proximosPassos} />
      <AprendizadosTimeline aprendizados={data.aprendizados} />
      <ObjetivosHistoricoSection objetivos={data.objetivos} />

      <StrategicPlanManageDrawer
        open={manageOpen}
        onOpenChange={setManageOpen}
        planoId={planoId}
        plano={data.plano}
        data={data}
        objetivoAtualId={objetivoAtual?.id ?? null}
        estrategias={estrategiasDoObjetivo}
        isAdmin={isAdmin}
        onComment={(msg) => commentMut.mutate(msg)}
      />
    </div>
  );
}
