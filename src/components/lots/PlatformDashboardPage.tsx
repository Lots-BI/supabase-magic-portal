// ============================================================================
// Lots BI · PlatformDashboardPage
// Wrapper de página — resolve cliente (slug → nome canônico), gerencia período
// e injeta no PlatformDashboard genérico.
// ============================================================================

import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useMemo, useState } from "react";
import { PageHeader } from "@/components/lots/PageHeader";
import { PeriodPicker } from "@/components/lots/PeriodPicker";
import { PlatformDashboard } from "@/components/lots/PlatformDashboard";
import { PlatformSwitcher } from "@/components/lots/PlatformSwitcher";
import { DashboardSkeleton } from "@/components/lots/DashboardSkeleton";
import { resolvePeriod, type PeriodInput } from "@/lib/period";
import type { PlatformDef } from "@/lib/platforms/types";
import { clienteRefQuery } from "@/routes/_authenticated/cliente.$cliente";
import { ClientePlatformSyncButton } from "@/components/lots/ClientePlatformSyncButton";
import { isClienteSyncPlatform } from "@/modules/dashboards/cliente-sync-platform";
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
      <div className="lots-surface p-6 text-sm text-muted-foreground">
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
            {ref.cadastroId != null && isClienteSyncPlatform(def.key) ? (
              <ClientePlatformSyncButton cadastroClienteId={ref.cadastroId} platform={def.key} />
            ) : null}
          </div>
        }
      />
      <PlatformDashboard def={def} cliente={ref.queryName} period={period} />
    </div>
  );
}
