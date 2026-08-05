import { AlertCircle, CheckCircle2, CircleDashed, ArrowRight } from "lucide-react";
import { SectionCard } from "@/components/lotus/SectionCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConnectionOperationalPhase =
  | "disconnected"
  | "needs_auth"
  | "needs_identity"
  | "needs_sync"
  | "healthy"
  | "error";

export function resolveConnectionPhase(input: {
  hasCredentialHint?: boolean;
  identityCount: number;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastError: string | null;
  healthStatus: string;
}): ConnectionOperationalPhase {
  if (input.lastError || input.healthStatus === "unhealthy") return "error";
  if (input.identityCount === 0) {
    return input.hasCredentialHint === false ? "needs_auth" : "needs_identity";
  }
  if (!input.lastSyncAt || input.lastSyncStatus === "failed") return "needs_sync";
  if (input.healthStatus === "healthy" || input.lastSyncStatus === "success") return "healthy";
  if (!input.lastSyncAt) return "needs_sync";
  return "healthy";
}

const COPY: Record<
  ConnectionOperationalPhase,
  { title: string; body: string; tone: "neutral" | "warning" | "success" | "danger" }
> = {
  disconnected: {
    title: "Ainda não conectada",
    body: "Crie a conexão e autentique a plataforma oficial (OAuth).",
    tone: "neutral",
  },
  needs_auth: {
    title: "Falta autenticar",
    body: "Conecte com OAuth (ou salve a credencial). Sem token válido o Hub não coleta métricas.",
    tone: "warning",
  },
  needs_identity: {
    title: "Falta escolher a conta / identidade",
    body: "Selecione o Ad Account (ou propriedade) correto — confira moeda e fuso vs Make.",
    tone: "warning",
  },
  needs_sync: {
    title: "Pronto para sincronizar",
    body: "Rode uma sincronização manual e confira se as linhas entram em base_metricas_hub.",
    tone: "warning",
  },
  healthy: {
    title: "Operando",
    body: "Última sync ok. No piloto Marco 1, mantenha a cadência manual (1–2×/dia) e compare com Make.",
    tone: "success",
  },
  error: {
    title: "Precisa de atenção",
    body: "Veja o erro abaixo, rode Diagnóstico e Reconectar OAuth se o token expirou.",
    tone: "danger",
  },
};

export function ConnectionNextStepCard({
  phase,
  lastError,
  onSync,
  onDiagnose,
  onOAuth,
  syncPending,
}: {
  phase: ConnectionOperationalPhase;
  lastError?: string | null;
  onSync?: () => void;
  onDiagnose?: () => void;
  onOAuth?: () => void;
  syncPending?: boolean;
}) {
  const copy = COPY[phase];
  const Icon =
    phase === "healthy" ? CheckCircle2 : phase === "error" ? AlertCircle : CircleDashed;

  return (
    <SectionCard
      title="Próximo passo"
      description="Orientação operacional — o que fazer agora nesta conexão."
    >
      <div
        className={cn(
          "m-4 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between",
          copy.tone === "success" && "border-success/30 bg-success/5",
          copy.tone === "warning" && "border-amber-500/25 bg-amber-500/5",
          copy.tone === "danger" && "border-destructive/30 bg-destructive/5",
          copy.tone === "neutral" && "border-border bg-muted/30",
        )}
      >
        <div className="flex gap-3">
          <Icon
            className={cn(
              "mt-0.5 h-5 w-5 shrink-0",
              copy.tone === "success" && "text-success",
              copy.tone === "warning" && "text-amber-600 dark:text-amber-400",
              copy.tone === "danger" && "text-destructive",
              copy.tone === "neutral" && "text-muted-foreground",
            )}
          />
          <div>
            <p className="font-medium text-foreground">{copy.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{copy.body}</p>
            {lastError && phase === "error" && (
              <p className="mt-2 text-sm text-destructive">{lastError}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {phase === "needs_auth" && onOAuth && (
            <Button size="sm" onClick={onOAuth}>
              Conectar OAuth
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          )}
          {(phase === "needs_sync" || phase === "healthy" || phase === "error") && onSync && (
            <Button size="sm" variant={phase === "healthy" ? "outline" : "default"} onClick={onSync} disabled={syncPending}>
              Sincronizar agora
            </Button>
          )}
          {(phase === "error" || phase === "healthy") && onDiagnose && (
            <Button size="sm" variant="outline" onClick={onDiagnose}>
              Diagnosticar
            </Button>
          )}
          {phase === "needs_identity" && (
            <Button size="sm" variant="outline" asChild>
              <a href="#identidades">Ir às identidades</a>
            </Button>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
