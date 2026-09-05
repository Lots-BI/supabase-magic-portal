import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Instagram, Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/lotus/PageHeader";
import { SectionCard } from "@/components/lotus/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  attachClientInstagramIdentityFn,
  createClientInstagramConnectionFn,
  discoverClientInstagramIdentitiesFn,
  getClientInstagramConnectionStatusFn,
  startClientInstagramOAuthFn,
} from "@/modules/platform-hub-client/hub-client.server";
import { hubClientKeys } from "@/modules/platform-hub-client/query-keys";
import { openHubOAuthPopup } from "./oauth-popup";

const TYPE_LABELS: Record<string, string> = {
  page: "Página do Facebook",
  instagram: "Perfil Instagram",
};

export function ClientConnectionsPage({
  cadastroClienteId,
  clienteSlug,
}: {
  cadastroClienteId: number;
  clienteSlug: string;
}) {
  const queryClient = useQueryClient();
  const redirectAfter = `/cliente/${clienteSlug}/conexoes`;

  const statusQuery = useQuery({
    queryKey: hubClientKeys.status(cadastroClienteId),
    queryFn: () => getClientInstagramConnectionStatusFn({ data: { cadastroClienteId } }),
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const created = await createClientInstagramConnectionFn({ data: { cadastroClienteId } });
      const oauth = await startClientInstagramOAuthFn({
        data: { cadastroClienteId, connectionId: created.connectionId, redirectAfter },
      });
      await openHubOAuthPopup(oauth.authorizationUrl);
      return created.connectionId;
    },
    onSuccess: () => {
      toast.success("Login com o Instagram concluído");
      void queryClient.invalidateQueries({ queryKey: hubClientKeys.status(cadastroClienteId) });
    },
    onError: (e) => toast.error(e.message),
  });

  const reconnectMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const oauth = await startClientInstagramOAuthFn({
        data: { cadastroClienteId, connectionId, redirectAfter },
      });
      await openHubOAuthPopup(oauth.authorizationUrl);
    },
    onSuccess: () => {
      toast.success("Login atualizado com sucesso");
      void queryClient.invalidateQueries({ queryKey: hubClientKeys.status(cadastroClienteId) });
    },
    onError: (e) => toast.error(e.message),
  });

  const status = statusQuery.data;

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-10">
      <PageHeader
        eyebrow="Conexões"
        title="Conexões da sua conta"
        description="Conecte suas próprias contas de redes sociais para alimentarmos os dashboards direto na fonte."
      />

      <SectionCard title="Instagram">
        <div className="space-y-4 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-orange-400 text-white">
              <Instagram className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-medium">Instagram (publicações e insights)</p>
              <p className="text-xs text-muted-foreground">
                Usado nos dashboards Instagram e Publicações.
              </p>
            </div>
            {status?.connected && (
              <Badge className="ml-auto" variant="secondary">
                {status.status === "active" ? "Conectado" : status.status}
              </Badge>
            )}
          </div>

          {statusQuery.isLoading && (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Verificando conexão...
            </div>
          )}

          {statusQuery.isError && (
            <p className="text-sm text-destructive">
              {statusQuery.error instanceof Error
                ? statusQuery.error.message
                : "Falha ao verificar a conexão."}
            </p>
          )}

          {!statusQuery.isLoading && !status?.connected && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Ainda não conectado. Você vai fazer login com a conta do Facebook/Instagram
                vinculada à sua página.
              </p>
              <Button
                className="w-full lotus-focus"
                onClick={() => connectMutation.mutate()}
                disabled={connectMutation.isPending}
              >
                {connectMutation.isPending ? "Aguardando login..." : "Conectar Instagram"}
              </Button>
            </div>
          )}

          {status?.connected && status.identities.length === 0 && (
            <ClientInstagramIdentityPicker
              cadastroClienteId={cadastroClienteId}
              connectionId={status.connectionId}
            />
          )}

          {status?.connected && status.identities.length > 0 && (
            <div className="space-y-3">
              <ul className="space-y-2">
                {status.identities.map((identity) => (
                  <li
                    key={identity.externalId}
                    className="flex items-center gap-2 rounded-lg border border-border p-3"
                  >
                    <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{identity.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {TYPE_LABELS[identity.identityType] ?? identity.identityType}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => reconnectMutation.mutate(status.connectionId)}
                disabled={reconnectMutation.isPending}
              >
                <RefreshCw
                  className={cn("mr-2 h-4 w-4", reconnectMutation.isPending && "animate-spin")}
                  aria-hidden
                />
                Refazer login
              </Button>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button asChild variant="secondary" className="w-full">
                  <Link to="/cliente/$cliente/instagram" params={{ cliente: clienteSlug }}>
                    Ver dashboard Instagram
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="w-full">
                  <Link to="/cliente/$cliente/publicacoes" params={{ cliente: clienteSlug }}>
                    Ver publicações
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function ClientInstagramIdentityPicker({
  cadastroClienteId,
  connectionId,
}: {
  cadastroClienteId: number;
  connectionId: string;
}) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const {
    data: identities,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [...hubClientKeys.discover(connectionId)],
    queryFn: () =>
      discoverClientInstagramIdentitiesFn({ data: { cadastroClienteId, connectionId } }),
  });

  const grouped = useMemo(() => {
    const map = new Map<string, NonNullable<typeof identities>>();
    for (const item of identities ?? []) {
      const list = map.get(item.identityType) ?? [];
      list.push(item);
      map.set(item.identityType, list);
    }
    return map;
  }, [identities]);

  const attachMutation = useMutation({
    mutationFn: () => {
      const picked = (identities ?? []).filter((i) => selected.has(i.externalId));
      let primaryAssigned = false;
      return attachClientInstagramIdentityFn({
        data: {
          cadastroClienteId,
          connectionId,
          identities: picked.map((i) => {
            const isPrimary = i.identityType === "instagram" && !primaryAssigned;
            if (isPrimary) primaryAssigned = true;
            return {
              identityType: i.identityType,
              externalId: i.externalId,
              label: i.label,
              parentLabel: i.parentLabel,
              isPrimary,
            };
          }),
        },
      });
    },
    onSuccess: (r) => {
      toast.success(`${r.count} conta(s) vinculada(s)`);
      void queryClient.invalidateQueries({
        queryKey: hubClientKeys.status(cadastroClienteId),
      });
    },
    onError: (e) => toast.error(e.message),
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Buscando suas contas do Instagram...
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Falha ao listar contas"}
        </p>
        <Button size="sm" variant="outline" onClick={() => void refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!identities?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma conta encontrada. Verifique se seu usuário tem uma página do Facebook com um perfil
        Instagram profissional vinculado, e refaça o login.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Selecione a conta do Instagram que deve alimentar seus dashboards:
      </p>
      {[...grouped.entries()].map(([type, items]) => (
        <div key={type}>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {TYPE_LABELS[type] ?? type}
          </h4>
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.externalId}>
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                    selected.has(item.externalId)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/40",
                  )}
                >
                  <Checkbox
                    checked={selected.has(item.externalId)}
                    onCheckedChange={() => toggle(item.externalId)}
                    aria-label={item.label}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.label}</p>
                    {item.parentLabel && (
                      <p className="text-xs text-muted-foreground">Página: {item.parentLabel}</p>
                    )}
                  </div>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <Button
        className="w-full"
        disabled={selected.size === 0 || attachMutation.isPending}
        onClick={() => attachMutation.mutate()}
      >
        {attachMutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Check className="mr-2 h-4 w-4" aria-hidden />
        )}
        Vincular {selected.size} conta(s)
      </Button>
    </div>
  );
}
