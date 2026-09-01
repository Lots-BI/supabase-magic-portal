import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/lotus/PageHeader";
import { SectionCard } from "@/components/lotus/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listClientes } from "@/lib/admin.functions";
import {
  createHubConnection,
  getHubCatalog,
  getHubConnectionDetail,
  startHubOAuth,
  storeHubCredential,
  syncHubConnection,
} from "@/modules/platform-hub-admin/hub-admin.server";
import { hubAdminKeys } from "@/modules/platform-hub-admin/query-keys";
import { oauthCredentialKeyForPlugin } from "@/modules/platform-hub-admin/services/hub-oauth.factory";
import { PlatformCategoryIcon, PlatformLogoBadge } from "./hub-badges";
import { HubIdentityPicker } from "./HubIdentityPicker";
import { openHubOAuthPopup } from "./oauth-popup";

const STEPS = [
  "Cliente",
  "Plataforma",
  "Provider",
  "Autenticação",
  "Identidades",
  "Teste",
] as const;

export function ConnectionWizardView({
  initialPlugin,
  resumeConnectionId,
  resumeStep,
}: {
  initialPlugin?: string;
  resumeConnectionId?: string;
  resumeStep?: number;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(resumeStep ?? 0);
  const [cadastroId, setCadastroId] = useState<number | null>(null);
  const [pluginKey, setPluginKey] = useState(initialPlugin ?? "");
  const [label, setLabel] = useState("");
  const [provider, setProvider] = useState<"make_passive" | "official_api">("official_api");
  const [connectionId, setConnectionId] = useState<string | null>(resumeConnectionId ?? null);
  const [accessToken, setAccessToken] = useState("");

  useEffect(() => {
    if (resumeConnectionId) setConnectionId(resumeConnectionId);
    if (resumeStep !== undefined) setStep(resumeStep);
  }, [resumeConnectionId, resumeStep]);

  const { data: clientes } = useQuery({
    queryKey: ["admin", "clientes", "picker"],
    queryFn: () => listClientes(),
  });

  const { data: catalog } = useQuery({
    queryKey: ["hub-admin", "catalog"],
    queryFn: () => getHubCatalog(),
  });

  const resumeQuery = useQuery({
    queryKey: hubAdminKeys.connection(resumeConnectionId ?? ""),
    queryFn: () =>
      getHubConnectionDetail({ data: { connectionId: resumeConnectionId! } }),
    enabled: Boolean(resumeConnectionId),
  });

  useEffect(() => {
    const connection = resumeQuery.data?.connection;
    if (!connection) return;
    setConnectionId(connection.id);
    setPluginKey(connection.pluginKey);
    setLabel(connection.label);
    setCadastroId(connection.cadastroId);
    if (
      connection.activeProviderType === "make_passive" ||
      connection.activeProviderType === "official_api"
    ) {
      setProvider(connection.activeProviderType);
    }
  }, [resumeQuery.data]);

  const selectedPlatform = catalog?.find((p) => p.key === pluginKey);

  const createMutation = useMutation({
    mutationFn: () =>
      createHubConnection({
        data: {
          cadastroId: cadastroId!,
          pluginKey,
          label: label || `${selectedPlatform?.label ?? pluginKey} conexão`,
          activeProviderType: provider,
        },
      }),
    onSuccess: (r) => {
      setConnectionId(r.connectionId);
      toast.success("Conexão criada");
      setStep(3);
    },
    onError: (e) => toast.error(e.message),
  });

  const oauthMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await startHubOAuth({
        data: {
          connectionId: id,
          redirectAfter: `/admin/conexoes/nova?connectionId=${id}&step=4`,
        },
      });
      return openHubOAuthPopup(r.authorizationUrl);
    },
    onSuccess: async (result) => {
      const target = new URL(result.redirectAfter, window.location.origin);
      const sameDestination =
        window.location.pathname === target.pathname &&
        window.location.search === target.search;
      if (sameDestination) {
        await resumeQuery.refetch();
        const stepParam = target.searchParams.get("step");
        if (stepParam) setStep(Number(stepParam));
        toast.success("Login concluído");
        return;
      }
      window.location.assign(result.redirectAfter);
    },
    onError: (e) => toast.error(e.message),
  });

  const credentialMutation = useMutation({
    mutationFn: (id: string) => {
      const key = oauthCredentialKeyForPlugin(pluginKey);
      if (!key) throw new Error("Plataforma sem chave de credencial OAuth");
      return storeHubCredential({
        data: {
          connectionId: id,
          credentialKey: key,
          accessToken,
        },
      });
    },
    onSuccess: () => {
      toast.success("Credencial salva");
      setStep(4);
    },
    onError: (e) => toast.error(e.message),
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => syncHubConnection({ data: { connectionId: id } }),
    onSuccess: () => {
      toast.success("Teste de sincronização OK");
      void navigate({
        to: "/admin/conexoes/$connectionId",
        params: { connectionId: connectionId! },
      });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-7 pb-10">
      <PageHeader
        eyebrow="Nova conexão"
        title="Assistente de conexão"
        description={`Etapa ${step + 1} de ${STEPS.length}: ${STEPS[step]}`}
      />

      <div
        className="flex gap-1"
        role="progressbar"
        aria-valuenow={step + 1}
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
      >
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`}
            title={s}
            aria-hidden
          />
        ))}
      </div>

      {step === 0 && (
        <SectionCard title="Selecionar cliente">
          <div className="space-y-4 p-4">
            <Label htmlFor="cliente">Cliente</Label>
            <Select
              value={cadastroId?.toString() ?? ""}
              onValueChange={(v) => setCadastroId(Number(v))}
            >
              <SelectTrigger id="cliente">
                <SelectValue placeholder="Escolha o cliente" />
              </SelectTrigger>
              <SelectContent>
                {(clientes ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nome_cliente}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="w-full lotus-focus"
              disabled={!cadastroId}
              onClick={() => setStep(1)}
            >
              Continuar
            </Button>
          </div>
        </SectionCard>
      )}

      {step === 1 && (
        <SectionCard title="Selecionar plataforma">
          <div className="grid gap-3 p-4">
            {(catalog ?? []).map((p) => (
              <button
                key={p.key}
                type="button"
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors lotus-focus ${
                  pluginKey === p.key
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/40"
                }`}
                onClick={() => setPluginKey(p.key)}
              >
                <PlatformLogoBadge pluginKey={p.key} />
                <div>
                  <p className="font-medium">{p.label}</p>
                  <p className="text-xs text-muted-foreground">{p.capabilities.join(", ")}</p>
                </div>
              </button>
            ))}
            <Button className="w-full" disabled={!pluginKey} onClick={() => setStep(2)}>
              Continuar
            </Button>
          </div>
        </SectionCard>
      )}

      {step === 2 && selectedPlatform && (
        <SectionCard title="Escolher provider">
          <div className="space-y-4 p-4">
            <Label htmlFor="label">Nome da conexão</Label>
            <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} />
            <Label>Provider</Label>
            <div className="flex flex-wrap gap-2">
              {selectedPlatform.providers.map((p) => (
                <Button
                  key={p}
                  type="button"
                  variant={provider === p ? "default" : "outline"}
                  onClick={() => setProvider(p as typeof provider)}
                >
                  {p === "official_api" ? "Official API" : "Make Passive"}
                </Button>
              ))}
            </div>
            <Button
              className="w-full"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              Criar conexão
            </Button>
          </div>
        </SectionCard>
      )}

      {step === 3 && connectionId && (
        <SectionCard title="Autenticação">
          <div className="space-y-4 p-4">
            {selectedPlatform?.oauthType ? (
              <Button
                className="w-full"
                onClick={() => oauthMutation.mutate(connectionId)}
                disabled={oauthMutation.isPending}
              >
                {oauthMutation.isPending
                  ? "Aguardando login..."
                  : `Conectar com ${selectedPlatform.label}`}
              </Button>
            ) : (
              <>
                <Label htmlFor="token">Access token</Label>
                <Input
                  id="token"
                  type="password"
                  autoComplete="off"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                />
                <Button
                  className="w-full"
                  onClick={() => credentialMutation.mutate(connectionId)}
                  disabled={!accessToken}
                >
                  Salvar credencial
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={() => setStep(4)}>
              Continuar para identidades
            </Button>
          </div>
        </SectionCard>
      )}

      {step === 4 && connectionId && resumeQuery.isLoading && !pluginKey && (
        <SectionCard title="Selecionar identidades">
          <p className="p-4 text-sm text-muted-foreground">Carregando conexão...</p>
        </SectionCard>
      )}

      {step === 4 && connectionId && resumeQuery.isError && !pluginKey && (
        <SectionCard title="Selecionar identidades">
          <p className="p-4 text-sm text-destructive">
            {resumeQuery.error instanceof Error
              ? resumeQuery.error.message
              : "Falha ao carregar a conexão."}
          </p>
        </SectionCard>
      )}

      {step === 4 && connectionId && pluginKey && (
        <SectionCard title="Selecionar identidades">
          <div className="p-4">
            <HubIdentityPicker
              connectionId={connectionId}
              pluginKey={pluginKey}
              onComplete={() => setStep(5)}
            />
          </div>
        </SectionCard>
      )}

      {step === 5 && connectionId && (
        <SectionCard title="Teste e finalizar">
          <div className="space-y-4 p-4">
            <p className="text-sm text-muted-foreground">
              Execute uma sincronização de teste para validar a conexão.
            </p>
            <Button
              className="w-full"
              onClick={() => syncMutation.mutate(connectionId)}
              disabled={syncMutation.isPending}
            >
              Sincronizar agora
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/admin/conexoes/$connectionId" params={{ connectionId }}>
                Ir para a conexão
              </Link>
            </Button>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
