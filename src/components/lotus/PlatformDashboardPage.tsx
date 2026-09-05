// ============================================================================
// Lotus · PlatformDashboardPage
// Wrapper de página — resolve cliente (slug → nome canônico), gerencia período
// e injeta no PlatformDashboard genérico.
// ============================================================================

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/lotus/PageHeader";
import { PeriodPicker } from "@/components/lotus/PeriodPicker";
import { PlatformDashboard } from "@/components/lotus/PlatformDashboard";
import { PlatformSwitcher } from "@/components/lotus/PlatformSwitcher";
import { DashboardSkeleton } from "@/components/lotus/DashboardSkeleton";
import { Button } from "@/components/ui/button";
import { resolvePeriod, type PeriodInput } from "@/lib/period";
import type { PlatformDef } from "@/lib/platforms/types";
import { clienteRefQuery } from "@/routes/_authenticated/cliente.$cliente";
import { syncInstagramProfileFn } from "@/modules/instagram-posts/instagram-posts.server";
import { useParams } from "@tanstack/react-router";

interface Props {
  def: PlatformDef;
}

export function PlatformDashboardPage({ def }: Props) {
  const { cliente: slug } = useParams({ strict: false }) as { cliente: string };
  const [periodInput, setPeriodInput] = useState<PeriodInput>({ preset: "last_30" });
  const period = useMemo(() => resolvePeriod(periodInput), [periodInput]);

  return (
    <Suspense fallback={<DashboardSkeleton kpiCount={4} />}>
      <PlatformResolved
        def={def}
        slug={slug}
        period={period}
        periodInput={periodInput}
        setPeriodInput={setPeriodInput}
      />
    </Suspense>
  );
}

function PlatformResolved({
  def,
  slug,
  period,
  periodInput,
  setPeriodInput,
}: {
  def: PlatformDef;
  slug: string;
  period: ReturnType<typeof resolvePeriod>;
  periodInput: PeriodInput;
  setPeriodInput: (value: PeriodInput) => void;
}) {
  const { data: ref } = useSuspenseQuery(clienteRefQuery(slug));
  if (!ref) {
    return (
      <div className="lotus-surface p-6 text-sm text-muted-foreground">
        Cliente não encontrado para o identificador <strong>{slug}</strong>.
      </div>
    );
  }
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Plataforma"
        title={<PlatformSwitcher currentId={def.key} currentLabel={def.label} />}
        description="Dados coletados para o período selecionado"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PeriodPicker value={periodInput} onChange={setPeriodInput} />
            {def.key === "instagram" && ref.cadastroId != null && (
              <InstagramProfileSyncButton cadastroClienteId={ref.cadastroId} />
            )}
          </div>
        }
      />
      <PlatformDashboard def={def} cliente={ref.queryName} period={period} />
    </div>
  );
}

function InstagramProfileSyncButton({ cadastroClienteId }: { cadastroClienteId: number }) {
  const queryClient = useQueryClient();

  const syncMutation = useMutation({
    mutationFn: () => syncInstagramProfileFn({ data: { cadastroClienteId } }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível puxar métricas");
        return;
      }
      if (result.daysFilled === 0) {
        toast.success("Nenhum dia novo — dados já atualizados");
      } else {
        toast.success(
          `${result.daysFilled} dia(s) preenchido(s) de ${result.daysRequested} faltante(s)`,
        );
      }
      queryClient.invalidateQueries({ queryKey: ["platform-rows", "instagram"] });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={syncMutation.isPending}
      onClick={() => syncMutation.mutate()}
    >
      <RefreshCw
        className={syncMutation.isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"}
        aria-hidden
      />
      Puxar métricas
    </Button>
  );
}
