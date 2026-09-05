import { Button } from "@/components/ui/button";
import type { AccessRecoveryAction } from "@/modules/access/recovery-actions";

const RECOVERY_ACTIONS: {
  action: AccessRecoveryAction;
  label: string;
  description: string;
  variant?: "destructive" | "outline" | "default";
}[] = [
  {
    action: "resend_invite",
    label: "Reenviar convite",
    description: "Novo e-mail de acesso (redirect /auth/callback).",
  },
  {
    action: "force_password_reset",
    label: "Enviar redefinição de senha",
    description: "Link de recovery por e-mail; encerra sessões ativas.",
  },
  {
    action: "delete_user",
    label: "Excluir usuário",
    description: "Remove a conta para permitir novo convite ao mesmo e-mail.",
    variant: "destructive",
  },
];

export function RecoveryModePanel({
  onAction,
  busy,
}: {
  onAction: (action: AccessRecoveryAction) => void;
  busy: boolean;
}) {
  return (
    <div className="lots-surface space-y-4 p-4">
      <div>
        <h3 className="text-sm font-semibold">Recovery Mode</h3>
        <p className="text-xs text-muted-foreground">
          Recupere o acesso em um clique — sem Dashboard do Supabase.
        </p>
      </div>

      <div className="grid gap-2">
        {RECOVERY_ACTIONS.map((item) => (
          <Button
            key={item.action}
            type="button"
            variant={item.variant ?? "outline"}
            disabled={busy}
            onClick={() => onAction(item.action)}
            className="h-auto flex-col items-start gap-0.5 px-3 py-2.5 text-left"
          >
            <span className="text-[13px] font-medium">{item.label}</span>
            <span className="text-[11px] font-normal text-muted-foreground">
              {item.description}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
