import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { adminTitle } from "@/lib/brand";
import { getDebugSnapshot, getSystemDiagnostics } from "@/lib/admin.functions";
import { PageHeader } from "@/components/lots/PageHeader";
import { StatCard } from "@/components/lots/StatCard";
import { SectionCard } from "@/components/lots/SectionCard";
import { SystemDiagnosticsPanel } from "@/components/lots/infra/SystemDiagnosticsPanel";
import { Database, Users, CalendarClock, Layers } from "lucide-react";

const clientOrigin = typeof window !== "undefined" ? window.location.origin : null;

const systemQuery = queryOptions({
  queryKey: ["admin", "system-diagnostics", clientOrigin],
  queryFn: () => getSystemDiagnostics({ data: { client_origin: clientOrigin } }),
  staleTime: 30_000,
});

const debugQuery = queryOptions({
  queryKey: ["admin", "debug"],
  queryFn: () => getDebugSnapshot(),
  staleTime: 10_000,
});

export const Route = createFileRoute("/_authenticated/admin/debug/")({
  head: () => ({ meta: [{ title: adminTitle("Painel operacional") }] }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(systemQuery);
    void context.queryClient.ensureQueryData(debugQuery);
  },
  component: DebugPage,
  errorComponent: ({ error }) => (
    <div className="lots-surface p-4 text-sm text-destructive">Erro: {error.message}</div>
  ),
});

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("pt-BR").format(n);
}

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="max-h-[420px] overflow-auto rounded-md border border-border bg-muted/40 p-3 text-[11px] leading-relaxed text-foreground">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function ViewBlock({
  title,
  result,
}: {
  title: string;
  result: { data: any; error: string | null };
}) {
  const rows = Array.isArray(result.data) ? result.data : [];
  return (
    <SectionCard
      title={title}
      description={result.error ? `Erro: ${result.error}` : `${rows.length} linha(s) (limite 20)`}
    >
      {result.error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          {result.error}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">
          Nenhum dado retornado.
        </div>
      ) : (
        <JsonBlock data={rows} />
      )}
    </SectionCard>
  );
}

function DebugPage() {
  const { data: system } = useSuspenseQuery(systemQuery);
  const { data } = useSuspenseQuery(debugQuery);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Diagnóstico"
        title="Painel operacional"
        description="Infraestrutura, autenticação, integrações e camada de dados — acesso restrito a administradores."
      />

      <SystemDiagnosticsPanel data={system} />

      <PageHeader
        eyebrow="Dados"
        title="Camada analítica"
        description="Snapshot bruto de base_metricas e views."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Registros em base_metricas"
          value={fmt(data.total_registros)}
          icon={Database}
          emphasis="hero"
        />
        <StatCard label="Clientes distintos" value={fmt(data.total_clientes)} icon={Users} />
        <StatCard
          label="Última data recebida"
          value={data.ultima_data ?? "—"}
          icon={CalendarClock}
        />
        <StatCard
          label="Plataformas ativas"
          value={fmt(data.por_plataforma.length)}
          icon={Layers}
        />
      </div>

      <SectionCard title="Registros por plataforma">
        {data.por_plataforma.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">
            Nenhum dado encontrado em base_metricas.
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Plataforma</th>
                  <th className="px-3 py-2 text-right">Registros</th>
                </tr>
              </thead>
              <tbody>
                {data.por_plataforma.map((p) => (
                  <tr key={p.plataforma} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{p.plataforma}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(p.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ViewBlock title="vw_overview_cliente" result={data.views.vw_overview_cliente} />
        <ViewBlock title="vw_google_ads_diario" result={data.views.vw_google_ads_diario} />
        <ViewBlock title="vw_meta_ads_diario" result={data.views.vw_meta_ads_diario} />
        <ViewBlock title="vw_ga4_diario" result={data.views.vw_ga4_diario} />
        <ViewBlock title="vw_instagram_diario" result={data.views.vw_instagram_diario} />
      </div>
    </div>
  );
}
