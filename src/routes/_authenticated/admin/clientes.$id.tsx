import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Power,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  CircleDashed,
  ExternalLink,
  Plus,
} from "lucide-react";
import { adminTitle } from "@/lib/brand";
import {
  getCliente,
  listServicos,
  listUsers,
  updateCliente,
  setClienteServicos,
  grantClientAccess,
  revokeClientAccess,
  toggleClienteAtivo,
  checkSlugAvailable,
} from "@/lib/admin.functions";
import { PageHeader } from "@/components/lots/PageHeader";
import { CollapsibleSection } from "@/components/lots/CollapsibleSection";
import { StatusBadge } from "@/components/lots/StatusBadge";
import { ConfirmDialog } from "@/components/lots/ConfirmDialog";
import { Field, FormRow, Select, TextArea, TextInput } from "@/components/lots/FormField";
import { Switch } from "@/components/ui/switch";
import { useDirtyBlocker } from "@/hooks/use-dirty-blocker";
import { INTEGRATIONS, getIntegrationStatus } from "@/lib/integrations-catalog";
import { IntegrationCard } from "@/components/lots/IntegrationCard";
import { ClientHubConnectionsSection } from "@/components/lots/platform-hub/ClientHubConnectionsSection";

const detailQuery = (id: number) => ({
  queryKey: ["admin", "cliente", id],
  queryFn: () => getCliente({ data: { id } }),
});
const servicosQuery = { queryKey: ["admin", "servicos"], queryFn: () => listServicos() };
const usersQuery = { queryKey: ["admin", "users"], queryFn: () => listUsers() };

export const Route = createFileRoute("/_authenticated/admin/clientes/$id")({
  head: ({ params }) => ({ meta: [{ title: adminTitle(`Cliente ${params.id}`) }] }),
  loader: async ({ params, context }) => {
    const id = Number(params.id);
    const qc = (context as any).queryClient;
    await Promise.all([
      qc.ensureQueryData(detailQuery(id)),
      qc.ensureQueryData(servicosQuery),
      qc.ensureQueryData(usersQuery),
    ]);
    return { id };
  },
  component: ClienteEdit,
  errorComponent: ({ error }) => (
    <div className="lots-surface p-4 text-sm text-destructive">Erro: {error.message}</div>
  ),
});

function normFlag(v: string | null | undefined): boolean {
  if (!v) return false;
  return ["true", "sim", "1", "x", "ativo", "yes"].includes(String(v).trim().toLowerCase());
}
function toFlag(b: boolean): string {
  return b ? "true" : "false";
}
function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

type ServicoState = {
  servico_id: string;
  nome: string;
  selected: boolean;
  valor: string;
};

function buildInitialForm(c: any, currentServicos: any[], allServicos: any[]) {
  const servMap = new Map(currentServicos.map((cs) => [cs.servico_id, cs]));
  const servicos: ServicoState[] = allServicos.map((s) => {
    const cur = servMap.get(s.id);
    return {
      servico_id: s.id,
      nome: s.nome,
      selected: !!cur && cur.ativo,
      valor: cur?.valor != null ? String(cur.valor) : "",
    };
  });
  return {
    nome_cliente: c.nome_cliente ?? "",
    slug: c.slug ?? "",
    empresa: c.empresa ?? "",
    email_principal: c.email_principal ?? "",
    telefone: c.telefone ?? "",
    observacoes: c.observacoes ?? "",
    data_inicio: c.data_inicio ?? "",
    valor_mensal: c.valor_mensal != null ? String(c.valor_mensal) : "",
    mlabs_url: c.mlabs_url ?? "",
    // flags de plataforma
    google_ads_ativo: normFlag(c.google_ads_ativo),
    meta_ativo: normFlag(c.meta_ativo),
    ga4_ativo: normFlag(c.ga4_ativo),
    google_business_ativo: normFlag(c.google_business_ativo),
    instagram_ativo: !!c.instagram_ativo,
    tiktok_ativo: !!c.tiktok_ativo,
    // integrações (IDs técnicos consumidos pelo Make)
    google_ads_customer_id: c.google_ads_customer_id ?? "",
    facebook_ad_account_id: c.facebook_ad_account_id ?? "",
    instagram_username: c.instagram_username ?? "",
    instagram_page_id: c.instagram_page_id ?? "",
    ga4_property_id: c.ga4_property_id ?? "",
    google_business_location_id: c.google_business_location_id ?? "",
    tiktok_ad_account_id: c.tiktok_ad_account_id ?? "",
    servicos,
  };
}

type FormState = ReturnType<typeof buildInitialForm>;

function ClienteEdit() {
  const { id } = Route.useLoaderData();
  const { data: detail } = useSuspenseQuery(detailQuery(id));
  const { data: servicos } = useSuspenseQuery(servicosQuery);
  const { data: users } = useSuspenseQuery(usersQuery);
  const qc = useQueryClient();
  const router = useRouter();
  const c: any = detail.cliente;

  const initial = useMemo(
    () => buildInitialForm(c, detail.servicos as any[], servicos as any[]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [c.id, c.updated_at, (servicos as any[]).length, (detail.servicos as any[]).length],
  );
  const [form, setForm] = useState<FormState>(initial);
  useEffect(() => setForm(initial), [initial]);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [toggleDialog, setToggleDialog] = useState(false);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);
  useDirtyBlocker(dirty);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // ---- Slug live validation ----
  const slugDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const s = form.slug.trim();
    if (!s) {
      setSlugStatus("idle");
      return;
    }
    if (!SLUG_RE.test(s)) {
      setSlugStatus("idle");
      return;
    }
    if (s === initial.slug) {
      setSlugStatus("available");
      return;
    }
    setSlugStatus("checking");
    if (slugDebounce.current) clearTimeout(slugDebounce.current);
    slugDebounce.current = setTimeout(async () => {
      try {
        const { available } = await checkSlugAvailable({ data: { slug: s, excludeId: id } });
        setSlugStatus(available ? "available" : "taken");
      } catch {
        setSlugStatus("idle");
      }
    }, 400);
    return () => {
      if (slugDebounce.current) clearTimeout(slugDebounce.current);
    };
  }, [form.slug, initial.slug, id]);

  const slugInvalid = form.slug.length > 0 && !SLUG_RE.test(form.slug);

  // ---- Validation ----
  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!form.nome_cliente.trim()) e.nome_cliente = "Nome obrigatório.";
    if (!form.slug.trim()) e.slug = "Slug obrigatório.";
    else if (!SLUG_RE.test(form.slug)) e.slug = "Use somente a-z, 0-9 e hífen.";
    else if (slugStatus === "taken") e.slug = "Este slug já está em uso.";
    if (form.email_principal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email_principal))
      e.email_principal = "Email inválido.";
    if (form.valor_mensal && Number.isNaN(Number(form.valor_mensal)))
      e.valor_mensal = "Valor inválido.";
    return e;
  };

  const saveAll = async () => {
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) {
      toast.error("Revise os campos destacados");
      return;
    }
    setSaving(true);
    try {
      await updateCliente({
        data: {
          id,
          nome_cliente: form.nome_cliente.trim(),
          slug: form.slug.trim(),
          empresa: form.empresa || null,
          email_principal: form.email_principal || null,
          telefone: form.telefone || null,
          observacoes: form.observacoes || null,
          data_inicio: form.data_inicio || null,
          valor_mensal: form.valor_mensal === "" ? null : Number(form.valor_mensal),
          mlabs_url: form.mlabs_url || null,
          // flags
          google_ads_ativo: toFlag(form.google_ads_ativo),
          meta_ativo: toFlag(form.meta_ativo),
          ga4_ativo: toFlag(form.ga4_ativo),
          google_business_ativo: toFlag(form.google_business_ativo),
          instagram_ativo: form.instagram_ativo,
          tiktok_ativo: form.tiktok_ativo,
          // integrações
          google_ads_customer_id: form.google_ads_customer_id || null,
          facebook_ad_account_id: form.facebook_ad_account_id || null,
          instagram_username: form.instagram_username || null,
          instagram_page_id: form.instagram_page_id || null,
          ga4_property_id: form.ga4_property_id || null,
          google_business_location_id: form.google_business_location_id || null,
          tiktok_ad_account_id: form.tiktok_ad_account_id || null,
        },
      });
      // Sync serviços
      await setClienteServicos({
        data: {
          cadastro_cliente_id: id,
          items: form.servicos
            .filter((s) => s.selected)
            .map((s) => ({
              servico_id: s.servico_id,
              ativo: true,
              valor: s.valor === "" ? null : Number(s.valor),
            })),
        },
      });
      toast.success("Alterações salvas", { description: form.nome_cliente });
      await qc.invalidateQueries({ queryKey: ["admin"] });
      await router.invalidate();
    } catch (e) {
      toast.error("Falha ao salvar", {
        description: e instanceof Error ? e.message : "Erro desconhecido",
      });
    } finally {
      setSaving(false);
    }
  };

  const doToggle = async () => {
    try {
      await toggleClienteAtivo({ data: { id, ativo: !c.ativo } });
      toast.success(c.ativo ? "Cliente desativado" : "Cliente reativado", {
        description: c.nome_cliente,
      });
      await qc.invalidateQueries({ queryKey: ["admin"] });
      await router.invalidate();
    } catch (e) {
      toast.error("Falha", { description: e instanceof Error ? e.message : "Erro" });
    } finally {
      setToggleDialog(false);
    }
  };

  const activeServicos = form.servicos.filter((s) => s.selected).length;
  const activePlatforms =
    Number(form.google_ads_ativo) +
    Number(form.meta_ativo) +
    Number(form.ga4_ativo) +
    Number(form.google_business_ativo) +
    Number(form.instagram_ativo) +
    Number(form.tiktok_ativo);

  const integrationActiveMap: Record<string, boolean> = {
    google_ads_ativo: form.google_ads_ativo,
    meta_ativo: form.meta_ativo,
    ga4_ativo: form.ga4_ativo,
    google_business_ativo: form.google_business_ativo,
    instagram_ativo: form.instagram_ativo,
    tiktok_ativo: form.tiktok_ativo,
  };
  const integrationsConfigured = INTEGRATIONS.filter(
    (i) =>
      getIntegrationStatus(
        i,
        form as unknown as Record<string, unknown>,
        !!integrationActiveMap[i.activeField],
      ) === "configured",
  ).length;

  return (
    <div className="space-y-5 pb-24">
      <div className="space-y-3">
        <Link
          to="/admin/clientes"
          className="lots-focus inline-flex items-center gap-1 rounded-md text-[12px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para clientes
        </Link>
        <PageHeader
          eyebrow={`ID #${c.id}`}
          title={c.nome_cliente}
          description={c.slug ? `/${c.slug}` : undefined}
          actions={
            <div className="flex items-center gap-2">
              <StatusBadge active={c.ativo} />
              <button
                onClick={() => setToggleDialog(true)}
                className="lots-focus inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[12.5px] font-medium text-muted-foreground hover:border-primary-300 hover:text-foreground"
              >
                <Power className="h-3.5 w-3.5" />
                {c.ativo ? "Desativar" : "Reativar"}
              </button>
            </div>
          }
        />
      </div>

      {!c.ativo && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300/50 bg-amber-50/60 px-4 py-3 text-[13px] text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Cliente inativo</p>
            <p className="text-[12px] opacity-80">
              Edições continuam disponíveis, mas o cliente não aparece para usuários finais nem
              recebe novos dados do Make. Reative quando voltar a operar.
            </p>
          </div>
        </div>
      )}

      {/* 01 IDENTIDADE */}
      <CollapsibleSection
        eyebrow="01"
        title="Identidade"
        description="Nome do cliente e razão social."
      >
        <FormRow>
          <Field label="Nome do cliente" required error={errors.nome_cliente}>
            <TextInput
              value={form.nome_cliente}
              onChange={(e) => {
                set("nome_cliente", e.target.value);
                if (!initial.slug && !form.slug) set("slug", slugify(e.target.value));
              }}
              invalid={!!errors.nome_cliente}
            />
          </Field>
          <Field label="Empresa" hint="Razão social ou nome fantasia.">
            <TextInput value={form.empresa} onChange={(e) => set("empresa", e.target.value)} />
          </Field>
        </FormRow>

        <details className="group mt-4 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 open:bg-muted/30">
          <summary className="lots-focus cursor-pointer select-none text-[11.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground">
            Avançado — Slug (URL)
          </summary>
          <div className="mt-3">
            <Field
              label="Slug (URL)"
              required
              error={errors.slug}
              hint={
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-mono text-foreground/80">
                    lotsbi.leandromajr.com/cliente/{form.slug || "—"}
                  </span>
                  <SlugIndicator status={slugStatus} invalid={slugInvalid} />
                </span>
              }
            >
              <TextInput
                value={form.slug}
                onChange={(e) => set("slug", slugify(e.target.value))}
                placeholder="ex: cliente-acme"
                invalid={!!errors.slug || slugStatus === "taken" || slugInvalid}
              />
            </Field>
          </div>
        </details>
      </CollapsibleSection>

      {/* 02 CONTATO */}
      <CollapsibleSection
        eyebrow="02"
        title="Contato"
        description="Canal principal de comunicação com o cliente."
      >
        <FormRow>
          <Field label="Email principal" error={errors.email_principal}>
            <TextInput
              type="email"
              value={form.email_principal}
              onChange={(e) => set("email_principal", e.target.value)}
              invalid={!!errors.email_principal}
              placeholder="contato@empresa.com"
            />
          </Field>
          <Field label="Telefone">
            <TextInput
              value={form.telefone}
              onChange={(e) => set("telefone", e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </Field>
        </FormRow>
      </CollapsibleSection>

      {/* 03 COMERCIAL */}
      <CollapsibleSection
        eyebrow="03"
        title="Comercial"
        description="Início do contrato, valor mensal, mLabs e observações internas."
      >
        <FormRow>
          <Field label="Data de início">
            <TextInput
              type="date"
              value={form.data_inicio ?? ""}
              onChange={(e) => set("data_inicio", e.target.value)}
            />
          </Field>
          <Field label="Valor mensal (R$)" error={errors.valor_mensal}>
            <TextInput
              type="number"
              step="0.01"
              value={form.valor_mensal}
              onChange={(e) => set("valor_mensal", e.target.value)}
              invalid={!!errors.valor_mensal}
              placeholder="0,00"
            />
          </Field>
        </FormRow>
        <div className="mt-3">
          <Field label="mLabs URL" hint="Link da conta no mLabs para o calendário de conteúdo.">
            <TextInput
              value={form.mlabs_url}
              onChange={(e) => set("mlabs_url", e.target.value)}
              placeholder="https://mlabs.com.br/…"
            />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Observações internas" hint="Visível apenas para administradores.">
            <TextArea
              rows={3}
              value={form.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
            />
          </Field>
        </div>
      </CollapsibleSection>

      {/* 04 PLATAFORMAS ATIVAS */}
      <CollapsibleSection
        eyebrow="04"
        title="Plataformas ativas"
        description="Quais fontes de dados o Make alimenta para este cliente."
        badge={
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
            {activePlatforms} ativa{activePlatforms === 1 ? "" : "s"}
          </span>
        }
      >
        <div className="grid gap-2 md:grid-cols-2">
          <PlatformToggle
            label="Google Ads"
            description="Investimento, cliques, conversões."
            checked={form.google_ads_ativo}
            onChange={(b) => set("google_ads_ativo", b)}
          />
          <PlatformToggle
            label="Meta Ads"
            description="Facebook + Instagram Ads."
            checked={form.meta_ativo}
            onChange={(b) => set("meta_ativo", b)}
          />
          <PlatformToggle
            label="Instagram Orgânico"
            description="Alcance, impressões, engajamento."
            checked={form.instagram_ativo}
            onChange={(b) => set("instagram_ativo", b)}
          />
          <PlatformToggle
            label="Google Analytics 4"
            description="Tráfego do site e conversões orgânicas."
            checked={form.ga4_ativo}
            onChange={(b) => set("ga4_ativo", b)}
          />
          <PlatformToggle
            label="Google Meu Negócio"
            description="Buscas e ações no perfil GMB."
            checked={form.google_business_ativo}
            onChange={(b) => set("google_business_ativo", b)}
          />
          <PlatformToggle
            label="TikTok Ads"
            description="Campanhas pagas no TikTok."
            checked={form.tiktok_ativo}
            onChange={(b) => set("tiktok_ativo", b)}
          />
        </div>
      </CollapsibleSection>

      {/* 05 INTEGRAÇÕES */}
      <CollapsibleSection
        eyebrow="05"
        title="Integrações"
        description="Identificadores técnicos lidos pelos cenários do Make. Todos opcionais."
        badge={
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
            {integrationsConfigured} / {INTEGRATIONS.length} ok
          </span>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          {INTEGRATIONS.map((integration) => (
            <IntegrationCard
              key={integration.key}
              integration={integration}
              active={!!integrationActiveMap[integration.activeField]}
              values={form as unknown as Record<string, string>}
              onChange={(col, value) => setForm((f) => ({ ...f, [col]: value }))}
            />
          ))}
        </div>
      </CollapsibleSection>

      <ClientHubConnectionsSection
        cadastroId={id}
        clienteNome={form.nome_cliente || c?.nome_cliente || "Cliente"}
      />

      {/* SERVIÇOS */}
      <CollapsibleSection
        eyebrow="06"
        title="Serviços contratados"
        description="Marque os serviços ativos e defina o valor de cada um (opcional)."
        badge={
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
            {activeServicos} contratado{activeServicos === 1 ? "" : "s"}
          </span>
        }
      >
        <div className="space-y-2">
          {form.servicos.map((s, i) => (
            <div
              key={s.servico_id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
            >
              <Switch
                checked={s.selected}
                onCheckedChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    servicos: f.servicos.map((p, j) => (j === i ? { ...p, selected: v } : p)),
                  }))
                }
              />
              <span className="flex-1 text-[13px] text-foreground">{s.nome}</span>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-muted-foreground">R$</span>
                <TextInput
                  type="number"
                  step="0.01"
                  placeholder="—"
                  value={s.valor}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      servicos: f.servicos.map((p, j) =>
                        j === i ? { ...p, valor: e.target.value } : p,
                      ),
                    }))
                  }
                  disabled={!s.selected}
                  className="h-8 w-28"
                />
              </div>
            </div>
          ))}
          {form.servicos.length === 0 && (
            <p className="text-[13px] text-muted-foreground">
              Nenhum serviço cadastrado. Vá em{" "}
              <Link to="/admin/servicos" className="text-primary hover:underline">
                Serviços
              </Link>{" "}
              para adicionar.
            </p>
          )}
        </div>
      </CollapsibleSection>

      {/* ACESSOS */}
      <CollapsibleSection
        eyebrow="07"
        title="Acessos do cliente"
        description="Usuários que podem visualizar este cliente na área do cliente."
        badge={
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
            {detail.acessos.length} usuário{detail.acessos.length === 1 ? "" : "s"}
          </span>
        }
      >
        <AcessosBlock
          clienteId={id}
          clienteNome={c.nome_cliente}
          users={users as any[]}
          acessos={detail.acessos as any[]}
        />
      </CollapsibleSection>

      {/* STICKY SAVE BAR */}
      <div className="fixed bottom-4 left-4 right-4 z-30 lg:left-[268px] lg:right-8">
        <div
          className={
            "lots-surface flex items-center justify-between gap-3 px-4 py-3 shadow-[var(--shadow-lg)] transition-all " +
            (dirty ? "border-amber-300/60 dark:border-amber-500/40" : "border-border opacity-95")
          }
        >
          <div className="flex items-center gap-2 text-[12.5px]">
            {dirty ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
                <span className="font-medium text-foreground">Alterações não salvas</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                <span className="text-muted-foreground">Tudo salvo</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setForm(initial)}
              disabled={!dirty || saving}
              className="lots-focus inline-flex h-9 items-center rounded-lg border border-border bg-card px-3 text-[12.5px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              Descartar
            </button>
            <button
              onClick={saveAll}
              disabled={!dirty || saving}
              className="lots-focus inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-px disabled:translate-y-0 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Salvar alterações
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={toggleDialog}
        onOpenChange={setToggleDialog}
        title={c.ativo ? `Desativar ${c.nome_cliente}?` : `Reativar ${c.nome_cliente}?`}
        description={
          c.ativo
            ? "O cliente deixa de aparecer para usuários finais e o Make pode parar de enviar dados. O histórico de métricas, serviços e acessos é preservado e pode ser reativado a qualquer momento."
            : "O cliente volta a aparecer normalmente para usuários autorizados."
        }
        confirmLabel={c.ativo ? "Desativar" : "Reativar"}
        variant={c.ativo ? "destructive" : "default"}
        onConfirm={doToggle}
      />
    </div>
  );
}

function SlugIndicator({
  status,
  invalid,
}: {
  status: "idle" | "checking" | "available" | "taken";
  invalid: boolean;
}) {
  if (invalid)
    return (
      <span className="inline-flex items-center gap-1 text-destructive">
        <CircleDashed className="h-3 w-3" /> formato inválido
      </span>
    );
  if (status === "checking")
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> verificando…
      </span>
    );
  if (status === "available")
    return (
      <span className="inline-flex items-center gap-1 text-success">
        <CheckCircle2 className="h-3 w-3" /> disponível
      </span>
    );
  if (status === "taken")
    return (
      <span className="inline-flex items-center gap-1 text-destructive">
        <AlertTriangle className="h-3 w-3" /> já em uso
      </span>
    );
  return null;
}

function PlatformToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (b: boolean) => void;
}) {
  return (
    <div
      className={
        "flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors " +
        (checked
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-card hover:border-primary-300")
      }
    >
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-foreground">{label}</p>
        <p className="text-[11.5px] text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function AcessosBlock({
  clienteId,
  clienteNome,
  users,
  acessos,
}: {
  clienteId: number;
  clienteNome: string;
  users: any[];
  acessos: any[];
}) {
  const qc = useQueryClient();
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [search, setSearch] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; email: string } | null>(null);

  const usedIds = useMemo(() => new Set(acessos.map((a) => a.user_id)), [acessos]);
  const available = users.filter(
    (u) =>
      !usedIds.has(u.id) &&
      (search === "" || (u.email ?? "").toLowerCase().includes(search.toLowerCase())),
  );

  const grant = async () => {
    if (!userId) return;
    const userEmail = users.find((u) => u.id === userId)?.email ?? userId;
    try {
      await grantClientAccess({ data: { user_id: userId, cadastro_cliente_id: clienteId } });
      setUserId("");
      setSearch("");
      toast.success("Acesso concedido", { description: `${userEmail} → ${clienteNome}` });
      await qc.invalidateQueries({ queryKey: ["admin"] });
      await router.invalidate();
    } catch (e) {
      toast.error("Falha ao conceder acesso", {
        description: e instanceof Error ? e.message : "Erro",
      });
    }
  };

  const doRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await revokeClientAccess({ data: { id: revokeTarget.id } });
      toast.success("Acesso revogado", { description: revokeTarget.email });
      await qc.invalidateQueries({ queryKey: ["admin"] });
      await router.invalidate();
    } catch (e) {
      toast.error("Falha", { description: e instanceof Error ? e.message : "Erro" });
    } finally {
      setRevokeTarget(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <TextInput
          placeholder="Buscar usuário por email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-0 flex-1"
        />
        <Select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="min-w-0 flex-1"
        >
          <option value="">Selecione um usuário…</option>
          {available.map((u) => (
            <option key={u.id} value={u.id}>
              {u.email}
            </option>
          ))}
        </Select>
        <button
          onClick={grant}
          disabled={!userId}
          className="lots-focus inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground shadow-[var(--shadow-glow)] hover:-translate-y-px disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" /> Conceder
        </button>
      </div>

      {acessos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-[13px] text-muted-foreground">
          Nenhum usuário tem acesso a este cliente ainda.
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {acessos.map((a) => {
            const u = users.find((x) => x.id === a.user_id);
            const email = u?.email ?? a.user_id;
            return (
              <li
                key={a.id}
                className="flex items-center justify-between gap-2 px-3 py-2.5 text-[13px]"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/15 text-[10.5px] font-semibold text-primary-700 dark:text-primary-200">
                    {(email[0] ?? "?").toUpperCase()}
                  </div>
                  <span className="truncate font-medium text-foreground">{email}</span>
                </div>
                <button
                  onClick={() => setRevokeTarget({ id: a.id, email })}
                  className="lots-focus inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11.5px] font-medium text-muted-foreground hover:border-destructive/40 hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" /> Revogar
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        <ExternalLink className="h-3 w-3" />
        Para cadastrar um novo usuário cliente, vá em{" "}
        <Link to="/admin/usuarios/novo" className="text-primary hover:underline">
          Usuários → Novo usuário
        </Link>
        .
      </p>

      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(o) => !o && setRevokeTarget(null)}
        title="Revogar acesso?"
        description={
          revokeTarget && (
            <>
              <strong>{revokeTarget.email}</strong> deixará de ver este cliente. Você pode conceder
              acesso novamente a qualquer momento.
            </>
          )
        }
        confirmLabel="Revogar"
        variant="destructive"
        onConfirm={doRevoke}
      />
    </div>
  );
}
