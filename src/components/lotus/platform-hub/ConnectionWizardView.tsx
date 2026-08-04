import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
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
  getHubOAuthEnvStatus,
  startHubOAuth,
  storeHubCredential,
  syncHubConnection,
} from "@/modules/platform-hub-admin/hub-admin.server";
import { hubAdminKeys } from "@/modules/platform-hub-admin/query-keys";
import { oauthCredentialKeyForPlugin } from "@/modules/platform-hub-admin/services/hub-oauth.factory";
import { PlatformLogoBadge } from "./hub-badges";
import { HubIdentityPicker } from "./HubIdentityPicker";

const STEPS = [
  "Cliente",
  "Plataforma",
  "Provider",
  "Autenticação",
  "Identidades",
  "Teste",
] as const;

function oauthReadyForPlugin(
  pluginKey: string,
  env: Awaited<ReturnType<typeof getHubOAuthEnvStatus>> | undefined,
): boolean {
  if (!env) return true;
  if (pluginKey === "meta_ads") return env.meta;
  if (pluginKey === "tiktok") return env.tiktok;
  if (["google_ads", "ga4", "google_business", "youtube"].includes(pluginKey)) return env.google;
  return true;
}

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
    queryKey: hubAdminKeys.catalog(),
    queryFn: () => getHubCatalog(),
  });

  const { data: oauthEnv } = useQuery({
    queryKey: hubAdminKeys.oauthEnv(),
    queryFn: () => getHubOAuthEnvStatus(),
    staleTime: 60_000,
  });

  const selectedPlatform = catalog?.find((p) => p.key === pluginKey);
  const pluginOAuthReady = oauthReadyForPlugin(pluginKey, oauthEnv);

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
      toast.success("Conexão criada — próximo: autenticar");
      setStep(3);
    },
    onError: (e) => toast.error(e.message),
  });

  const oauthMutation = useMutation({
    mutationFn: (id: string) =>
      startHubOAuth({
        data: {
          connectionId: id,
          redirectAfter: `/admin/conexoes/nova?connectionId=${id}&step=4`,
        },
      }),
    onSuccess: (r) => {
      window.location.href = r.authorizationUrl;
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
      toast.success("Credencial salva — escolha a identidade");
      setStep(4);
    },
    onError: (e) => toast.error(e.message),
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => syncHubConnection({ data: { connectionId: id } }),
    onSuccess: () => {
      toast.success("Sincronização OK — confira base_metricas_hub e compare com Make");
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
        title="Conectar plataforma"
        description={`Etapa ${step + 1} de ${STEPS.length}: ${STEPS[step]}. Fluxo: cliente → plataforma → OAuth → identidade → sync de teste.`}
      />

      {oauthEnv && !oauthEnv.vaultKey && (
        <div className="flex gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            HUB_CREDENTIAL_ENCRYPTION_KEY vazia — o vault usa fallback do service role. Defina a
            chave no .env antes do piloto em produção.
          </span>
        </div>
      )}

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
        <SectionCard
          title="Selecionar cliente"
          description="Escolha o cliente piloto (deve ter dados Meta já no Make para dual-run)."
        >
          <div className="space-y-4 p-4">
            {(clientes ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum cliente cadastrado. Cadastre o cliente no admin antes de conectar
                plataformas.
              </p>
            ) : (
              <>
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
              </>
            )}
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
        <SectionCard
          title="Selecionar plataforma"
          description="No Marco 1 o piloto recomendado é Meta Ads (official_api)."
        >
          <div className="grid gap-3 p-4">
            {(catalog ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Catálogo indisponível.</p>
            ) : (
              (catalog ?? []).map((p) => (
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
              ))
            )}
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
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={`${selectedPlatform.label} · piloto`}
            />
            <Label>Provider</Label>
            <div className="flex flex-wrap gap-2">
              {selectedPlatform.providers.map((p) => (
                <Button
                  key={p}
                  type="button"
                  variant={provider === p ? "default" : "outline"}
                  onClick={() => setProvider(p as typeof provider)}
                >
                  {p === "official_api" ? "Official API (recomendado)" : "Make Passive"}
                </Button>
              ))}
            </div>
            {provider === "make_passive" && (
              <p className="text-xs text-muted-foreground">
                Make Passive não coleta via Hub — use só para referência. O piloto Marco 1 usa
                Official API.
              </p>
            )}
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
        <SectionCard
          title="Autenticação"
          description="Autorize a conta da agência/cliente na plataforma."
        >
          <div className="space-y-4 p-4">
            {selectedPlatform?.oauthType && !pluginOAuthReady && (
              <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">OAuth desta plataforma não está configurado no .env</p>
                  <p className="mt-1 text-destructive/90">
                    {pluginKey === "meta_ads" &&
                      "Defina META_APP_ID e META_APP_SECRET, configure o redirect {APP_URL}/oauth/meta/callback no app Meta e reinicie o npm run dev."}
                    {pluginKey === "tiktok" &&
                      "Defina TIKTOK_APP_ID e TIKTOK_APP_SECRET e reinicie o servidor."}
                    {["google_ads", "ga4", "google_business", "youtube"].includes(pluginKey) &&
                      "Defina GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET e reinicie o servidor."}
                  </p>
                </div>
              </div>
            )}
            {selectedPlatform?.oauthType ? (
              <Button
                className="w-full"
                onClick={() => oauthMutation.mutate(connectionId)}
                disabled={oauthMutation.isPending || !pluginOAuthReady}
              >
                Conectar com {selectedPlatform.label}
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
              Já autentiquei — ir às identidades
            </Button>
          </div>
        </SectionCard>
      )}

      {step === 4 && connectionId && pluginKey && (
        <SectionCard
          title="Selecionar identidades"
          description="Escolha o Ad Account / propriedade correto (moeda e fuso alinhados ao Make)."
        >
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
        <SectionCard
          title="Teste e finalizar"
          description="Uma sync de teste valida o caminho Campanha → base_metricas_hub (Make continua nos dashboards)."
        >
          <div className="space-y-4 p-4">
            <p className="text-sm text-muted-foreground">
              Depois: abra a conexão, rode Diagnóstico e acompanhe o dual-run no Testing Center.
            </p>
            <Button
              className="w-full"
              onClick={() => syncMutation.mutate(connectionId)}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? "Sincronizando…" : "Sincronizar agora"}
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
