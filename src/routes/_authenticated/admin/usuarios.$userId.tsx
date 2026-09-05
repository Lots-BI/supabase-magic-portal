import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/lots/PageHeader";
import { AccessAuditTimeline } from "@/features/access/components/AccessAuditTimeline";
import { LifecycleStatusBadge } from "@/features/access/components/LifecycleStatusBadge";
import { RecoveryModePanel } from "@/modules/admin/components/RecoveryModePanel";
import { UserAccessDiagnostics } from "@/features/access/components/UserAccessDiagnostics";
import type { AccessAuditRow, UserAccessProfile } from "@/features/access/types";
import {
  getUserAccessAuditLog,
  getUserAccessProfile,
  performAccessRecovery,
  type AccessRecoveryAction,
} from "@/lib/access.functions.server";
import { adminTitle } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/admin/usuarios/$userId")({
  head: ({ params }) => ({ meta: [{ title: adminTitle(`Usuário ${params.userId.slice(0, 8)}`) }] }),
  loader: async ({ context, params }) => {
    const qc = context.queryClient;
    await Promise.all([
      qc.ensureQueryData({
        queryKey: ["admin", "access-profile", params.userId],
        queryFn: () => getUserAccessProfile({ data: { user_id: params.userId } }),
      }),
      qc.ensureQueryData({
        queryKey: ["admin", "access-audit", params.userId],
        queryFn: () => getUserAccessAuditLog({ data: { user_id: params.userId, limit: 50 } }),
      }),
    ]);
  },
  component: UsuarioDetalhePage,
  errorComponent: ({ error }) => (
    <div className="lots-surface p-4 text-sm text-destructive">Erro: {error.message}</div>
  ),
});

function UsuarioDetalhePage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profileFn = useServerFn(getUserAccessProfile);
  const auditFn = useServerFn(getUserAccessAuditLog);
  const recoveryFn = useServerFn(performAccessRecovery);

  const { data: profile } = useSuspenseQuery({
    queryKey: ["admin", "access-profile", userId],
    queryFn: () => profileFn({ data: { user_id: userId } }),
  });

  const { data: auditRows } = useSuspenseQuery({
    queryKey: ["admin", "access-audit", userId],
    queryFn: () => auditFn({ data: { user_id: userId, limit: 50 } }),
  });

  const recoveryMut = useMutation({
    mutationFn: (action: AccessRecoveryAction) =>
      recoveryFn({
        data: {
          user_id: userId,
          action,
          client_origin: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      }),
    onSuccess: (result, action) => {
      if (action === "delete_user") {
        toast.success("Usuário excluído. O e-mail pode receber um novo convite.");
        void navigate({ to: "/admin/usuarios" });
        return;
      }
      toast.success("Ação executada com sucesso.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "access-profile", userId] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "access-audit", userId] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "access-profiles"] });
      void result;
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Falha na ação"),
  });

  const p = profile as UserAccessProfile;
  const audit = (auditRows ?? []) as AccessAuditRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gestão de acessos"
        title={p.email || "Usuário"}
        description={`ID ${p.id} · criado em ${new Date(p.created_at).toLocaleDateString("pt-BR")}`}
        actions={
          <Link
            to="/admin/usuarios"
            className="lots-focus inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-[13px] font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <LifecycleStatusBadge status={p.effective_status} />
        <span className="text-[12px] text-muted-foreground capitalize">{p.tipo}</span>
        {p.clientes.length > 0 && (
          <span className="text-[12px] text-muted-foreground">· {p.clientes.join(", ")}</span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <UserAccessDiagnostics profile={p} />
        <RecoveryModePanel
          busy={recoveryMut.isPending}
          onAction={(action) => {
            if (action === "delete_user") {
              const ok = window.confirm(
                "Excluir permanentemente este usuário? O e-mail poderá receber um novo convite.",
              );
              if (!ok) return;
            }
            recoveryMut.mutate(action);
          }}
        />
      </div>

      <div className="lots-surface p-4">
        <h3 className="mb-4 text-sm font-semibold">Timeline de auditoria</h3>
        <AccessAuditTimeline rows={audit} />
      </div>
    </div>
  );
}
