import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ChevronDown, Loader2, Save } from "lucide-react";
import { adminTitle } from "@/lib/brand";
import { createCliente } from "@/lib/admin.functions";
import { PageHeader } from "@/components/lots/PageHeader";
import { Field, FormRow, TextArea, TextInput } from "@/components/lots/FormField";
import { Switch } from "@/components/ui/switch";
import { CollapsibleSection } from "@/components/lots/CollapsibleSection";
import { INTEGRATIONS, getIntegrationStatus } from "@/lib/integrations-catalog";
import { IntegrationCard } from "@/components/lots/IntegrationCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/clientes/novo")({
  head: () => ({ meta: [{ title: adminTitle("Novo cliente") }] }),
  component: NovoCliente,
});

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

const EMPTY_FORM = {
  // identidade / contato (rápido)
  nome_cliente: "",
  empresa: "",
  email_principal: "",
  telefone: "",
  // avançado
  slug: "",
  data_inicio: "",
  valor_mensal: "",
  mlabs_url: "",
  observacoes: "",
  // plataformas
  google_ads_ativo: false,
  meta_ativo: false,
  ga4_ativo: false,
  instagram_ativo: false,
  google_business_ativo: false,
  tiktok_ativo: false,
  // integrações
  google_ads_customer_id: "",
  facebook_ad_account_id: "",
  instagram_username: "",
  instagram_page_id: "",
  ga4_property_id: "",
  google_business_location_id: "",
  tiktok_ad_account_id: "",
};

type FormState = typeof EMPTY_FORM;

function NovoCliente() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const effectiveSlug = useMemo(
    () => (slugTouched ? form.slug : slugify(form.nome_cliente)),
    [form.slug, form.nome_cliente, slugTouched],
  );

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
  const activePlatforms = Object.values(integrationActiveMap).filter(Boolean).length;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nome_cliente.trim()) e.nome_cliente = "Nome obrigatório.";
    if (!effectiveSlug.trim()) e.slug = "Slug obrigatório.";
    else if (!SLUG_RE.test(effectiveSlug)) e.slug = "Use somente a-z, 0-9 e hífen.";
    if (form.email_principal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email_principal))
      e.email_principal = "Email inválido.";
    if (form.valor_mensal && Number.isNaN(Number(form.valor_mensal)))
      e.valor_mensal = "Valor inválido.";
    return e;
  };

  const toFlag = (b: boolean) => (b ? "true" : "false");

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) {
      toast.error("Revise os campos destacados");
      if (v.slug && !advancedOpen) setAdvancedOpen(true);
      return;
    }
    setSaving(true);
    try {
      const row = await createCliente({
        data: {
          nome_cliente: form.nome_cliente.trim(),
          slug: effectiveSlug.trim(),
          ativo: true,
          empresa: form.empresa || null,
          email_principal: form.email_principal || null,
          telefone: form.telefone || null,
          observacoes: form.observacoes || null,
          data_inicio: form.data_inicio || null,
          valor_mensal: form.valor_mensal === "" ? null : Number(form.valor_mensal),
          mlabs_url: form.mlabs_url || null,
          google_ads_ativo: toFlag(form.google_ads_ativo),
          meta_ativo: toFlag(form.meta_ativo),
          ga4_ativo: toFlag(form.ga4_ativo),
          google_business_ativo: toFlag(form.google_business_ativo),
          instagram_ativo: form.instagram_ativo,
          tiktok_ativo: form.tiktok_ativo,
          google_ads_customer_id: form.google_ads_customer_id || null,
          facebook_ad_account_id: form.facebook_ad_account_id || null,
          instagram_username: form.instagram_username || null,
          instagram_page_id: form.instagram_page_id || null,
          ga4_property_id: form.ga4_property_id || null,
          google_business_location_id: form.google_business_location_id || null,
          tiktok_ad_account_id: form.tiktok_ad_account_id || null,
        },
      });
      toast.success("Cliente criado", { description: form.nome_cliente });
      router.navigate({ to: "/admin/clientes/$id", params: { id: String((row as any).id) } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao criar cliente";
      toast.error("Não foi possível criar o cliente", { description: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5 pb-24">
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => router.navigate({ to: "/admin/clientes" })}
          className="lots-focus inline-flex items-center gap-1 rounded-md text-[12px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para clientes
        </button>
        <PageHeader
          eyebrow="Novo cliente"
          title="Cadastro rápido"
          description="Preencha o essencial e salve. Você pode expandir para já configurar plataformas e integrações."
        />
      </div>

      {/* Identidade & contato (rápido) */}
      <div className="lots-surface overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-primary-600 dark:text-primary-300">
            Essencial
          </p>
          <h2 className="font-display text-[15px] font-semibold tracking-tight text-foreground">
            Identidade & contato
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Apenas o nome é obrigatório. Todo o resto é opcional.
          </p>
        </div>
        <div className="space-y-3 px-5 py-5">
          <FormRow>
            <Field label="Nome do cliente" required error={errors.nome_cliente}>
              <TextInput
                value={form.nome_cliente}
                onChange={(e) => set("nome_cliente", e.target.value)}
                invalid={!!errors.nome_cliente}
                autoFocus
              />
            </Field>
            <Field label="Empresa">
              <TextInput value={form.empresa} onChange={(e) => set("empresa", e.target.value)} />
            </Field>
          </FormRow>
          <FormRow>
            <Field label="E-mail" error={errors.email_principal}>
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
        </div>
      </div>

      <button
        type="button"
        onClick={() => setAdvancedOpen((o) => !o)}
        className="lots-focus inline-flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-3.5 py-2 text-[12.5px] font-medium text-muted-foreground hover:border-primary-300 hover:text-foreground"
      >
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", advancedOpen && "rotate-180")}
        />
        {advancedOpen ? "Ocultar configurações avançadas" : "Mostrar configurações avançadas"}
        <span className="text-[10.5px] text-muted-foreground/80">
          (slug, comercial, plataformas, integrações)
        </span>
      </button>

      {advancedOpen && (
        <>
          {/* Slug avançado */}
          <CollapsibleSection
            eyebrow="A1"
            title="Slug (URL)"
            description="Gerado automaticamente a partir do nome. Edite só se precisar."
            defaultOpen={false}
          >
            <Field
              label="Slug"
              error={errors.slug}
              hint={
                <span className="font-mono text-foreground/80">
                  lotsbi.leandromajr.com/cliente/{effectiveSlug || "—"}
                </span>
              }
            >
              <TextInput
                value={effectiveSlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", slugify(e.target.value));
                }}
                placeholder="ex: cliente-acme"
                invalid={!!errors.slug}
              />
            </Field>
          </CollapsibleSection>

          {/* Comercial */}
          <CollapsibleSection
            eyebrow="A2"
            title="Comercial"
            description="Contrato, valor, mLabs e observações internas."
            defaultOpen={false}
          >
            <FormRow>
              <Field label="Data de início">
                <TextInput
                  type="date"
                  value={form.data_inicio}
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
              <Field label="mLabs URL">
                <TextInput
                  value={form.mlabs_url}
                  onChange={(e) => set("mlabs_url", e.target.value)}
                  placeholder="https://mlabs.com.br/…"
                />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Observações internas">
                <TextArea
                  rows={3}
                  value={form.observacoes}
                  onChange={(e) => set("observacoes", e.target.value)}
                />
              </Field>
            </div>
          </CollapsibleSection>

          {/* Plataformas */}
          <CollapsibleSection
            eyebrow="A3"
            title="Plataformas ativas"
            description="Quais fontes de dados o Make alimenta para este cliente."
            badge={
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                {activePlatforms} ativa{activePlatforms === 1 ? "" : "s"}
              </span>
            }
            defaultOpen={false}
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

          {/* Integrações */}
          <CollapsibleSection
            eyebrow="A4"
            title="Integrações"
            description="Identificadores técnicos lidos pelos cenários do Make. Todos opcionais."
            badge={
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                {integrationsConfigured} / {INTEGRATIONS.length} ok
              </span>
            }
            defaultOpen={false}
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
        </>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => router.navigate({ to: "/admin/clientes" })}
          className="lots-focus inline-flex h-9 items-center rounded-lg border border-border bg-card px-3.5 text-[12.5px] font-medium text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="lots-focus inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground shadow-[var(--shadow-glow)] hover:-translate-y-px disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Criar cliente
        </button>
      </div>
    </form>
  );
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
