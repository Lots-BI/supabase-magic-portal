import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getAlinhamentoJourney,
  publishAlinhamentoPlan,
} from "@/lib/strategic-plan.functions";
import { Field, TextArea, TextInput } from "@/components/lots/FormField";
import { SectionCard } from "@/components/lots/SectionCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/** Painel admin para publicar a proposta comercial a partir do quiz enviado. */
export function PublishAlinhamentoPanel({
  cadastroClienteId,
  clienteNome,
}: {
  cadastroClienteId: number;
  clienteNome: string;
}) {
  const qc = useQueryClient();
  const journeyFn = useServerFn(getAlinhamentoJourney);
  const publishFn = useServerFn(publishAlinhamentoPlan);

  const { data: journey, isLoading } = useQuery({
    queryKey: ["strategic-plan", "alinhamento", cadastroClienteId],
    queryFn: () => journeyFn({ data: { cadastro_cliente_id: cadastroClienteId } }),
  });

  const [resumo, setResumo] = useState("");
  const [fee, setFee] = useState("");
  const [trafego, setTrafego] = useState("");
  const [infra, setInfra] = useState("");
  const [itens, setItens] = useState("");

  const publishMut = useMutation({
    mutationFn: () =>
      publishFn({
        data: {
          cadastro_cliente_id: cadastroClienteId,
          plan_data: {
            resumoEstrategia: resumo.trim(),
            feeAgencia: Number(fee) || 0,
            verbaTrafego: Number(trafego) || 0,
            custosInfra: Number(infra) || 0,
            itensEntrega: itens
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean),
          },
        },
      }),
    onSuccess: () => {
      toast.success("Plano publicado para o cliente");
      void qc.invalidateQueries({ queryKey: ["strategic-plan", "alinhamento", cadastroClienteId] });
      void qc.invalidateQueries({ queryKey: ["strategic-plan", "admin"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao publicar"),
  });

  if (isLoading) {
    return <div className="lots-skeleton h-32 w-full rounded-xl" />;
  }

  if (!journey?.hasCompletedQuiz) {
    return (
      <p className="text-sm text-muted-foreground">
        {clienteNome} ainda não enviou o questionário de alinhamento.
      </p>
    );
  }

  if (journey.hasActivePlan && journey.planData) {
    return (
      <p className="text-sm text-muted-foreground">
        Proposta já publicada
        {journey.planApprovedAt ? " e aprovada pelo cliente." : ", aguardando aprovação."}
      </p>
    );
  }

  return (
    <SectionCard
      title={`Publicar plano · ${clienteNome}`}
      description="Preencha a proposta comercial. O cliente passa do estado de espera para o painel do plano."
    >
      <div className="space-y-3">
        {journey.quizData && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">Resumo do alinhamento</p>
            <p>Objetivo: {journey.quizData.objetivoPrincipal}</p>
            <p className="mt-1 line-clamp-3">{journey.quizData.momentoNegocio}</p>
            <p className="mt-1">Verba ads: {journey.quizData.verbaAdsMensal}</p>
          </div>
        )}
        <Field label="O que faremos" required hint="Resumo da estratégia unificada.">
          <TextArea
            value={resumo}
            onChange={(e) => setResumo(e.target.value)}
            rows={4}
            placeholder="Ex.: Reestruturação de Landing Page + campanhas de fundo de funil + linha editorial…"
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Fee agência (R$)">
            <TextInput
              type="number"
              min={0}
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              placeholder="3500"
            />
          </Field>
          <Field label="Verba tráfego (R$)">
            <TextInput
              type="number"
              min={0}
              value={trafego}
              onChange={(e) => setTrafego(e.target.value)}
              placeholder="4000"
            />
          </Field>
          <Field label="Infra / Dev (R$)">
            <TextInput
              type="number"
              min={0}
              value={infra}
              onChange={(e) => setInfra(e.target.value)}
              placeholder="200"
            />
          </Field>
        </div>
        <Field label="Itens de entrega" hint="Um por linha (opcional).">
          <TextArea
            value={itens}
            onChange={(e) => setItens(e.target.value)}
            rows={3}
            placeholder={"Landing page\nCampanhas Meta Ads\nLinha editorial"}
          />
        </Field>
        <Button
          size="sm"
          disabled={publishMut.isPending || resumo.trim().length < 20}
          onClick={() => publishMut.mutate()}
        >
          {publishMut.isPending ? "Publicando…" : "Publicar plano para o cliente"}
        </Button>
      </div>
    </SectionCard>
  );
}
