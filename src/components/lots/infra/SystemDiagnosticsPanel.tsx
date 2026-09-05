import type { AuthDiagnosticsReport, DiagnosticStatus } from "@/lib/infra/auth-diagnostics";
import type { SystemDiagnosticsReport } from "@/lib/infra/system-diagnostics.types";
import { SectionCard } from "@/components/lots/SectionCard";
import { cn } from "@/lib/utils";

function StatusDot({ status }: { status: DiagnosticStatus | "unknown" }) {
  const color =
    status === "ok"
      ? "bg-[var(--success)]"
      : status === "warn"
        ? "bg-amber-500"
        : status === "error"
          ? "bg-destructive"
          : "bg-muted-foreground";
  return <span className={cn("inline-block h-2 w-2 shrink-0 rounded-full", color)} />;
}

function StatusLabel({ status }: { status: DiagnosticStatus }) {
  if (status === "ok")
    return <span className="text-[var(--success)]">🟢 Configurado corretamente</span>;
  if (status === "warn")
    return <span className="text-amber-600 dark:text-amber-400">🟡 Atenção</span>;
  return <span className="text-destructive">🔴 Configuração inválida</span>;
}

function CheckRow({
  label,
  status,
  detail,
}: {
  label: string;
  status: DiagnosticStatus;
  detail?: string;
}) {
  return (
    <div className="flex items-start gap-2 border-t border-border py-2 first:border-t-0 first:pt-0">
      <StatusDot status={status} />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-foreground">{label}</p>
        {detail && <p className="mt-0.5 break-all text-[11px] text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}

export function AuthDiagnosticsCard({ auth }: { auth: AuthDiagnosticsReport }) {
  return (
    <SectionCard
      title="Supabase Auth"
      description="Validação de APP_URL, domínio e redirects de convite."
    >
      <div className="mb-4 rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm">
        <StatusLabel status={auth.status} />
        {auth.message && (
          <pre className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">
            {auth.message}
          </pre>
        )}
      </div>

      <dl className="mb-4 grid gap-2 text-[12px] sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">APP_URL configurada</dt>
          <dd className="break-all font-mono text-foreground">{auth.app_url_configured ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Domínio atual</dt>
          <dd className="break-all font-mono text-foreground">{auth.current_domain ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Ambiente</dt>
          <dd className="font-medium text-foreground">{auth.environment_label}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Site URL esperada</dt>
          <dd className="break-all font-mono text-foreground">{auth.expected_site_url}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Redirect convites</dt>
          <dd className="break-all font-mono text-foreground">{auth.invite_redirect}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Redirect recuperação</dt>
          <dd className="break-all font-mono text-foreground">{auth.recovery_redirect}</dd>
        </div>
      </dl>

      <div className="space-y-0">
        {auth.checks.map((c) => (
          <CheckRow key={c.id} label={c.label} status={c.status} detail={c.detail} />
        ))}
      </div>
    </SectionCard>
  );
}

export function ProductionChecklistCard({
  checklist,
  systemReady,
}: {
  checklist: SystemDiagnosticsReport["production_checklist"];
  systemReady: boolean;
}) {
  return (
    <SectionCard
      title="Checklist de produção"
      description={
        systemReady
          ? "Sistema pronto para produção."
          : "Corrija os itens em vermelho antes de operar com clientes."
      }
    >
      <ul className="space-y-1.5">
        {checklist.map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-[12px]">
            <span>{item.status === "ok" ? "✓" : item.status === "warn" ? "○" : "✗"}</span>
            <span
              className={cn(
                item.status === "error" && "text-destructive",
                item.status === "warn" && "text-amber-600 dark:text-amber-400",
              )}
            >
              {item.label}
            </span>
          </li>
        ))}
      </ul>
      <p
        className={cn(
          "mt-4 text-sm font-medium",
          systemReady ? "text-[var(--success)]" : "text-destructive",
        )}
      >
        {systemReady ? "Sistema pronto para produção." : "Sistema não está pronto para produção."}
      </p>
    </SectionCard>
  );
}

export function SystemDiagnosticsPanel({ data }: { data: SystemDiagnosticsReport }) {
  return (
    <div className="space-y-4">
      <AuthDiagnosticsCard auth={data.auth} />
      <ProductionChecklistCard
        checklist={data.production_checklist}
        systemReady={data.system_ready}
      />

      <SectionCard title="Supabase" description="Conexão e serviços do projeto.">
        <dl className="grid gap-2 text-[12px] sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">URL</dt>
            <dd className="break-all font-mono">{data.supabase.url ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Conexão</dt>
            <dd>{data.supabase.connection_ok ? "OK" : "Falha"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Auth</dt>
            <dd>{data.supabase.auth_ok ? "OK" : "Falha"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Database</dt>
            <dd>
              {data.supabase.database_ok === null
                ? "—"
                : data.supabase.database_ok
                  ? "OK"
                  : "Falha"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Storage</dt>
            <dd>
              {data.supabase.storage_ok === null ? "—" : data.supabase.storage_ok ? "OK" : "Falha"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Service role</dt>
            <dd>{data.supabase.service_role_configured ? "Configurada" : "Ausente"}</dd>
          </div>
        </dl>
        {data.supabase.error && (
          <p className="mt-2 text-[11px] text-destructive">{data.supabase.error}</p>
        )}
      </SectionCard>

      <SectionCard title="Ambiente" description="Build e runtime.">
        <dl className="grid gap-2 text-[12px] sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Ambiente Lots</dt>
            <dd className="font-medium">{data.auth.environment_label}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">APP_URL</dt>
            <dd className="break-all font-mono">{data.auth.app_url_configured ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Domínio atual</dt>
            <dd className="break-all font-mono">{data.auth.current_domain ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">NODE_ENV</dt>
            <dd>{data.environment.node_env}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Build</dt>
            <dd>{data.environment.build_mode}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Versão</dt>
            <dd>{data.environment.app_version}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Diagnóstico em</dt>
            <dd>{new Date(data.diagnosed_at).toLocaleString("pt-BR")}</dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard
        title="Integrações"
        description="Presença de dados em base_metricas por plataforma."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {data.integrations.map((i) => (
            <div
              key={i.id}
              className="flex items-start gap-2 rounded-lg border border-border px-3 py-2"
            >
              <StatusDot status={i.status === "unknown" ? "warn" : i.status} />
              <div>
                <p className="text-[12px] font-medium">{i.label}</p>
                <p className="text-[11px] text-muted-foreground">{i.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Diagnóstico de convites"
        description="Últimos envios registrados nesta instância (memória operacional)."
      >
        {data.invite_audit.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">
            Nenhum convite registrado nesta sessão.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-[11px]">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-2 pr-3">Horário</th>
                  <th className="pb-2 pr-3">E-mail</th>
                  <th className="pb-2 pr-3">Ação</th>
                  <th className="pb-2 pr-3">Redirect</th>
                  <th className="pb-2 pr-3">APP_URL</th>
                  <th className="pb-2">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {data.invite_audit.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {new Date(row.at).toLocaleString("pt-BR")}
                    </td>
                    <td className="py-2 pr-3">{row.email}</td>
                    <td className="py-2 pr-3">{row.action}</td>
                    <td className="max-w-[140px] truncate py-2 pr-3 font-mono">
                      {row.redirect_to}
                    </td>
                    <td className="max-w-[120px] truncate py-2 pr-3 font-mono">{row.app_url}</td>
                    <td className="py-2">
                      {row.success ? (
                        <span className="text-[var(--success)]">Sucesso</span>
                      ) : (
                        <span className="text-destructive" title={row.error}>
                          Falha
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
