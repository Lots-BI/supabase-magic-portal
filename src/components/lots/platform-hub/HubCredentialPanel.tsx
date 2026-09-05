import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/lots/ConfirmDialog";
import { useState } from "react";
import {
  listHubCredentials,
  revokeHubCredential,
  testHubCredential,
} from "@/modules/platform-hub-admin/hub-admin.server";
import { hubAdminKeys } from "@/modules/platform-hub-admin/query-keys";

interface HubCredentialPanelProps {
  connectionId: string;
}

export function HubCredentialPanel({ connectionId }: HubCredentialPanelProps) {
  const qc = useQueryClient();
  const [revokeKey, setRevokeKey] = useState<string | null>(null);

  const { data: credentials, isLoading } = useQuery({
    queryKey: [...hubAdminKeys.connection(connectionId), "credentials"],
    queryFn: () => listHubCredentials({ data: { connectionId } }),
  });

  const testMutation = useMutation({
    mutationFn: (credentialKey: string) =>
      testHubCredential({ data: { connectionId, credentialKey } }),
    onSuccess: (r) => {
      toast[r.ok ? "success" : "error"](r.detail);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (credentialKey: string) =>
      revokeHubCredential({ data: { connectionId, credentialKey } }),
    onSuccess: () => {
      toast.success("Credencial revogada");
      setRevokeKey(null);
      void qc.invalidateQueries({ queryKey: hubAdminKeys.connection(connectionId) });
    },
  });

  if (isLoading) {
    return <div className="lots-skeleton mx-4 mb-4 h-20 rounded-lg" />;
  }

  if (!credentials?.length) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        Nenhuma credencial no vault. Conecte via OAuth ou adicione manualmente no assistente.
      </p>
    );
  }

  return (
    <>
      <ul className="divide-y divide-border">
        {credentials.map((c) => (
          <li
            key={c.credentialKey}
            className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-mono text-sm">{c.credentialKey}</p>
                <p className="text-xs text-muted-foreground">
                  Atualizado {new Date(c.updatedAt).toLocaleString("pt-BR")} ·{" "}
                  {c.present ? "Presente" : "Ausente"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => testMutation.mutate(c.credentialKey)}
                disabled={testMutation.isPending}
              >
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                Testar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => setRevokeKey(c.credentialKey)}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Revogar
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={!!revokeKey}
        onOpenChange={(o) => !o && setRevokeKey(null)}
        title="Revogar credencial?"
        description="O segredo será removido do vault. Pode ser necessário reconectar OAuth."
        confirmLabel="Revogar"
        variant="destructive"
        onConfirm={() => revokeKey && revokeMutation.mutate(revokeKey)}
      />
    </>
  );
}
