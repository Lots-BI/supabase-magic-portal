import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { adminTitle } from "@/lib/brand";
import { getViewsAudit } from "@/lib/admin.functions";
import { PageHeader } from "@/components/lots/PageHeader";
import { SectionCard } from "@/components/lots/SectionCard";
import { StatCard } from "@/components/lots/StatCard";
import { AlertTriangle, CheckCircle2, Database } from "lucide-react";

const auditQuery = queryOptions({
  queryKey: ["admin", "debug", "views"],
  queryFn: () => getViewsAudit(),
  staleTime: 10_000,
});

export const Route = createFileRoute("/_authenticated/admin/debug/views")({
  head: () => ({ meta: [{ title: adminTitle("Auditoria de views") }] }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(auditQuery);
  },
  component: ViewsAuditPage,
});

function JsonBlock({ data, max = 360 }: { data: unknown; max?: number }) {
  return (
    <pre
      className="overflow-auto rounded-md border border-border bg-muted/40 p-3 text-[11px] leading-relaxed text-foreground"
      style={{ maxHeight: max }}
    >
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function Pill({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "err" | "muted";
  children: React.ReactNode;
}) {
  const cls = {
    ok: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    warn: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    err: "border-destructive/40 bg-destructive/10 text-destructive",
    muted: "border-border bg-muted/40 text-muted-foreground",
  }[tone];
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${cls}`}
    >
      {children}
    </span>
  );
}

function ViewsAuditPage() {
  const { data } = useSuspenseQuery(auditQuery);

  const cucAdminRows =
    (data.current_user_clientes.as_admin_authenticated.data as any[] | null) ?? [];
  const cucServiceRows = (data.current_user_clientes.as_service_role.data as any[] | null) ?? [];

  const rootCauseDetected =
    cucServiceRows.length === 0 &&
    Object.values(data.views).every((v) => (v.service.count ?? 0) === 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Diagnóstico"
        title="Auditoria de views analíticas"
        description="Por que as views retornam 0 linhas mesmo com base_metricas populada."
      />

      {/* Diagnóstico de causa raiz */}
      <SectionCard
        title="Causa raiz identificada"
        description="Comparação entre execução com service_role e usuário admin autenticado."
      >
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="space-y-2">
              <p className="font-medium text-foreground">
                Todas as views usam{" "}
                <code className="rounded bg-muted px-1">security_invoker=on</code> e filtram por{" "}
                <code className="rounded bg-muted px-1">current_user_clientes()</code>, que depende
                de <code className="rounded bg-muted px-1">auth.uid()</code>.
              </p>
              <p className="text-muted-foreground">
                Quando consultamos via <strong>service_role</strong> (supabaseAdmin),{" "}
                <code>auth.uid()</code> é <code>null</code> → a função retorna 0 clientes → o{" "}
                <code>WHERE cliente IN (...)</code> dentro de <code>vw_metricas_normalizadas</code>{" "}
                elimina <strong>todos</strong> os registros → todas as views derivadas retornam 0.
              </p>
              <p className="text-muted-foreground">
                Quando consultamos via <strong>admin autenticado</strong>, o ramo{" "}
                <code>has_role(auth.uid(), 'admin')</code> de <code>current_user_clientes()</code>{" "}
                retorna todos os <code>DISTINCT cliente</code> de <code>base_metricas</code> → as
                views retornam dados normalmente.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border p-3">
              <div className="mb-1 flex items-center gap-2">
                <Pill tone={cucServiceRows.length === 0 ? "err" : "ok"}>service_role</Pill>
                <span className="text-xs text-muted-foreground">
                  supabaseAdmin.rpc('current_user_clientes')
                </span>
              </div>
              <div className="text-2xl font-semibold tabular-nums">{cucServiceRows.length}</div>
              <div className="text-xs text-muted-foreground">
                clientes retornados (esperado: 0 — confirma a hipótese)
              </div>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="mb-1 flex items-center gap-2">
                <Pill tone={cucAdminRows.length > 0 ? "ok" : "warn"}>admin autenticado</Pill>
                <span className="text-xs text-muted-foreground">context.supabase.rpc(...)</span>
              </div>
              <div className="text-2xl font-semibold tabular-nums">{cucAdminRows.length}</div>
              <div className="text-xs text-muted-foreground">
                clientes visíveis (esperado: todos)
              </div>
            </div>
          </div>

          {rootCauseDetected && (
            <div className="flex items-start gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="font-medium text-foreground">Hipótese confirmada</p>
                <p className="text-muted-foreground">
                  Os 0 rows reportados em <code>/admin/debug</code> são esperados — aquele painel
                  consulta via service_role. Os dados existem e as views funcionam para usuários
                  autenticados.
                </p>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Proposta de correção */}
      <SectionCard title="Proposta de correção" description="Sem alterar schema nem views.">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground">
          <li>
            Em <code>/admin/debug</code>: trocar <code>supabaseAdmin.from('vw_*')</code> por{" "}
            <code>context.supabase.from('vw_*')</code> (o admin autenticado enxerga tudo via{" "}
            <code>current_user_clientes()</code>).
          </li>
          <li>
            Em todas as telas que consomem views analíticas (dashboard, página do cliente): usar o
            cliente autenticado, nunca o service_role.
          </li>
          <li>
            Manter <code>supabaseAdmin</code> apenas para leituras administrativas que não passam
            pelas views (auth.users, user_roles, client_access, base_metricas crua).
          </li>
          <li>
            (Opcional, futuro) Migrar <code>current_user_clientes()</code> de débito técnico (SELECT
            DISTINCT em base_metricas) para um catálogo dedicado quando a base crescer.
          </li>
        </ol>
      </SectionCard>

      {/* Distinct values em base_metricas */}
      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard
          label="Plataformas distintas"
          value={data.base_metricas.distinct_plataformas.length}
          icon={Database}
        />
        <StatCard
          label="Métricas distintas"
          value={data.base_metricas.distinct_metricas.length}
          icon={Database}
        />
        <StatCard
          label="Clientes distintos"
          value={data.base_metricas.distinct_clientes.length}
          icon={Database}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="DISTINCT plataforma" description="Valores brutos em base_metricas.">
          <JsonBlock data={data.base_metricas.distinct_plataformas} />
        </SectionCard>
        <SectionCard title="DISTINCT metrica" description="Valores brutos em base_metricas.">
          <JsonBlock data={data.base_metricas.distinct_metricas} />
        </SectionCard>
        <SectionCard title="DISTINCT cliente" description="Valores brutos em base_metricas.">
          <JsonBlock data={data.base_metricas.distinct_clientes} />
        </SectionCard>
      </div>

      <SectionCard
        title="Mapeamento de normalização (raw → vw_metricas_normalizadas)"
        description="Como cada plataforma raw é convertida pelo CASE da view."
      >
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Raw (base_metricas.plataforma)</th>
                <th className="px-3 py-2 text-left">Normalizado (filtros das views)</th>
                <th className="px-3 py-2 text-left">View destino</th>
              </tr>
            </thead>
            <tbody>
              {data.base_metricas.normalization_map.map((row) => {
                const viewMap: Record<string, string> = {
                  meta_ads: "vw_meta_ads_diario",
                  google_ads: "vw_google_ads_diario",
                  ga4: "vw_ga4_diario",
                  instagram: "vw_instagram_diario",
                  google_business: "vw_google_business_diario",
                };
                const target = viewMap[row.normalized] ?? "(nenhuma — não cai em view específica)";
                return (
                  <tr key={row.raw} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{row.raw}</td>
                    <td className="px-3 py-2 tabular-nums">{row.normalized}</td>
                    <td className="px-3 py-2 text-muted-foreground">{target}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Auditoria por view */}
      <div className="space-y-4">
        {Object.entries(data.views).map(([name, v]) => {
          const svcZero = (v.service.count ?? 0) === 0;
          const authHas = (v.authed.count ?? 0) > 0;
          return (
            <SectionCard
              key={name}
              title={name}
              description="Service_role (RLS bypass, sem auth.uid) vs admin autenticado."
            >
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Pill tone={svcZero ? "err" : "ok"}>
                    service_role: {v.service.count ?? "—"} linha(s)
                  </Pill>
                  <Pill tone={authHas ? "ok" : "warn"}>
                    admin autenticado: {v.authed.count ?? "—"} linha(s)
                  </Pill>
                  {v.service.error && <Pill tone="err">erro service: {v.service.error}</Pill>}
                  {v.authed.error && <Pill tone="err">erro authed: {v.authed.error}</Pill>}
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <div>
                    <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Filtros & métricas esperadas
                    </div>
                    <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-[11px] text-foreground">
                      {v.sql}
                    </pre>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Amostra (até 3) via admin autenticado
                    </div>
                    {v.authed.sample && v.authed.sample.length > 0 ? (
                      <JsonBlock data={v.authed.sample} max={240} />
                    ) : (
                      <div className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">
                        Nenhuma linha retornada.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </SectionCard>
          );
        })}
      </div>

      <SectionCard
        title="SQL completo — vw_metricas_normalizadas (base de todas as outras)"
        description="É aqui que current_user_clientes() filtra tudo."
      >
        <pre className="overflow-auto rounded-md border border-border bg-muted/40 p-3 text-[11px] leading-relaxed text-foreground">
          {data.base_metricas_view_sql}
        </pre>
      </SectionCard>
    </div>
  );
}
