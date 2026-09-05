import type { ReactNode } from "react";
import type { UserAccessProfile } from "../types";
import { LifecycleStatusBadge } from "./LifecycleStatusBadge";

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-[13px] text-foreground sm:text-right">{value}</dd>
    </div>
  );
}

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return "—";
  }
}

export function UserAccessDiagnostics({ profile }: { profile: UserAccessProfile }) {
  return (
    <div className="lots-surface space-y-4 p-4">
      <div>
        <h3 className="text-sm font-semibold">Diagnóstico de acesso</h3>
        <p className="text-xs text-muted-foreground">
          Leitura composta Supabase Auth + lifecycle Lots BI (sem duplicação).
        </p>
      </div>
      <dl className="space-y-3">
        <Row label="Lifecycle" value={<LifecycleStatusBadge status={profile.lifecycle_status} />} />
        <Row
          label="Status efetivo"
          value={<LifecycleStatusBadge status={profile.effective_status} />}
        />
        <Row
          label="Acesso plataforma"
          value={profile.can_access_platform ? "Permitido" : "Bloqueado"}
        />
        <Row label="Ban técnico" value={profile.is_banned ? "Sim" : "Não"} />
        <Row label="Senha definida" value={profile.password_set_at ? "Sim" : "Não"} />
        <Row
          label="Onboarding"
          value={profile.onboarding_completed_at ? "Concluído" : "Pendente"}
        />
        <Row label="Convite enviado" value={fmt(profile.invite_sent_at)} />
        <Row label="Último reenvio" value={fmt(profile.invite_last_resent_at)} />
        <Row label="Último login" value={fmt(profile.last_sign_in_at)} />
        <Row label="Último erro auth" value={profile.last_auth_error ?? "—"} />
        <Row label="Motivo bloqueio" value={profile.blocked_reason ?? "—"} />
      </dl>
    </div>
  );
}
