import { useEffect } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  approveAlinhamentoPlan,
  getAlinhamentoJourney,
  submitAlinhamentoQuiz,
} from "@/lib/strategic-plan.functions";
import type { QuizData } from "@/lib/strategic-plan/types";
import { EmptyState } from "@/components/lots/EmptyState";
import { Compass } from "lucide-react";
import { toast } from "sonner";
import { QuizForm } from "./QuizForm";
import { PendingPlan } from "./PendingPlan";
import { ActivePlanDashboard } from "./ActivePlanDashboard";

export function StrategicPlanJourney({
  slug,
  clienteNome,
  cadastroId,
}: {
  slug: string;
  clienteNome: string;
  cadastroId: number | null;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const journeyFn = useServerFn(getAlinhamentoJourney);
  const submitFn = useServerFn(submitAlinhamentoQuiz);
  const approveFn = useServerFn(approveAlinhamentoPlan);

  const enabled = cadastroId != null;
  const { data: journey } = useSuspenseQuery({
    queryKey: ["strategic-plan", "alinhamento", cadastroId ?? "none"],
    queryFn: async () => {
      if (cadastroId == null) {
        return {
          hasCompletedQuiz: false,
          quizData: null,
          hasActivePlan: false,
          planData: null,
          planApprovedAt: null,
          alinhamento: null,
          uiState: "quiz" as const,
          legadoPlanoId: null,
        };
      }
      return journeyFn({ data: { cadastro_cliente_id: cadastroId } });
    },
  });

  const operacionalId = journey.alinhamento?.plano_id ?? journey.legadoPlanoId ?? null;

  useEffect(() => {
    if (!enabled) return;
    if (journey.uiState === "active" && !journey.planData && operacionalId) {
      void navigate({
        to: "/cliente/$cliente/plano-estrategico/$planoId",
        params: { cliente: slug, planoId: operacionalId },
        replace: true,
      });
    }
  }, [enabled, journey.uiState, journey.planData, operacionalId, slug, navigate]);

  const submitMut = useMutation({
    mutationFn: (quiz_data: QuizData) =>
      submitFn({ data: { cadastro_cliente_id: cadastroId!, quiz_data } }),
    onSuccess: () => {
      toast.success("Alinhamento enviado");
      void qc.invalidateQueries({ queryKey: ["strategic-plan", "alinhamento", cadastroId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao enviar"),
  });

  const approveMut = useMutation({
    mutationFn: () => approveFn({ data: { cadastro_cliente_id: cadastroId! } }),
    onSuccess: () => {
      toast.success("Plano aprovado");
      void qc.invalidateQueries({ queryKey: ["strategic-plan", "alinhamento", cadastroId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao aprovar"),
  });

  if (!enabled) {
    return (
      <EmptyState
        icon={Compass}
        title="Cliente sem cadastro completo"
        description="Associe este cliente em Admin → Clientes antes de iniciar o alinhamento estratégico."
      />
    );
  }

  if (journey.uiState === "quiz") {
    return (
      <QuizForm
        clienteNome={clienteNome}
        submitting={submitMut.isPending}
        onSubmit={(data) => submitMut.mutate(data)}
      />
    );
  }

  if (journey.uiState === "pending") {
    return <PendingPlan clienteNome={clienteNome} />;
  }

  if (!journey.planData && operacionalId) {
    return <div className="lots-skeleton h-48 w-full rounded-xl" />;
  }

  return (
    <ActivePlanDashboard
      clienteNome={clienteNome}
      clienteSlug={slug}
      planData={journey.planData}
      planApprovedAt={journey.planApprovedAt}
      operacionalPlanoId={operacionalId}
      approving={approveMut.isPending}
      onApprove={() => approveMut.mutate()}
    />
  );
}
