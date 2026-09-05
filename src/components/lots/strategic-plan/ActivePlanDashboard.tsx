import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { CheckCircle2, ExternalLink, FileSignature, Layers, Wallet } from "lucide-react";
import type { PlanData } from "@/lib/strategic-plan/types";
import { PageHeader } from "@/components/lots/PageHeader";
import { SectionCard } from "@/components/lots/SectionCard";
import { Button } from "@/components/ui/button";

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ActivePlanDashboard({
  clienteNome,
  clienteSlug,
  planData,
  planApprovedAt,
  operacionalPlanoId,
  approving,
  onApprove,
}: {
  clienteNome: string;
  clienteSlug: string;
  planData: PlanData | null;
  planApprovedAt: string | null;
  operacionalPlanoId: string | null;
  approving?: boolean;
  onApprove: () => void;
}) {
  const approved = !!planApprovedAt;
  const fee = planData?.feeAgencia ?? 0;
  const trafego = planData?.verbaTrafego ?? 0;
  const infra = planData?.custosInfra ?? 0;
  const total = fee + trafego + infra;

  if (!planData) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Plano Estratégico"
          title={clienteNome}
          description="Centro operacional já disponível. A proposta comercial ainda não foi publicada neste fluxo."
        />
        {operacionalPlanoId && (
          <SectionCard title="Centro Estratégico">
            <p className="mb-4 text-sm text-muted-foreground">
              Abra o painel operacional com objetivos, hipóteses e roadmap.
            </p>
            <Button asChild size="sm" className="gap-1.5">
              <Link
                to="/cliente/$cliente/plano-estrategico/$planoId"
                params={{ cliente: clienteSlug, planoId: operacionalPlanoId }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir Centro Estratégico
              </Link>
            </Button>
          </SectionCard>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Plano Estratégico"
        title="Seu plano está pronto"
        description={`Proposta sob medida para ${clienteNome}.`}
        actions={
          operacionalPlanoId ? (
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link
                to="/cliente/$cliente/plano-estrategico/$planoId"
                params={{ cliente: clienteSlug, planoId: operacionalPlanoId }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Centro operacional
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title="O que faremos"
          description="Estratégia unificada — Social, Tráfego e Desenvolvimento."
        >
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers className="h-4 w-4" />
            </div>
            <div className="min-w-0 space-y-3">
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {planData.resumoEstrategia}
              </p>
              {planData.itensEntrega && planData.itensEntrega.length > 0 && (
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {planData.itensEntrega.map((item) => (
                    <li key={item} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Orçamento Mensal" description="Divisão clara dos investimentos.">
          <div className="space-y-3">
            <BudgetRow icon={<Wallet className="h-3.5 w-3.5" />} label="Fee da agência" value={fee} />
            <BudgetRow label="Verba de tráfego" value={trafego} />
            <BudgetRow label="Custos de infra / dev" value={infra} />
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                <span>Total estimado</span>
                <span>{formatBRL(total)}</span>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Ação do Cliente"
        description={
          approved
            ? "Plano aprovado. Em breve este fluxo poderá acionar contrato ou pagamento."
            : "Revise o escopo e aprove para seguirmos com a execução."
        }
      >
        {approved ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>
              Plano aprovado em{" "}
              {new Date(planApprovedAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
              .
            </span>
          </div>
        ) : (
          <Button
            size="sm"
            className="gap-1.5"
            disabled={approving}
            onClick={onApprove}
          >
            <FileSignature className="h-3.5 w-3.5" />
            {approving ? "Registrando…" : "Aprovar Plano / Assinar"}
          </Button>
        )}
      </SectionCard>
    </div>
  );
}

function BudgetRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-medium text-foreground tabular-nums">{formatBRL(value)}</span>
    </div>
  );
}
