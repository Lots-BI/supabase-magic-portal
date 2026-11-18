// Lots BI · Central de Leads — visão dedicada de todos os envios de
// formulário (landing + formulário instantâneo da Meta) de um cliente, com
// KPIs, filtros e ficha detalhada. Reaproveita `listCrmFormSubmissionsFn` e os
// helpers de apresentação já usados na aba "Formulários" do CRM
// (`CrmFormsPanel`) — mesma fonte de dados, visualização dedicada e maior.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  AtSign,
  Contact2,
  ClipboardList,
  ExternalLink,
  Inbox,
  Mail,
  Megaphone,
  Phone,
} from "lucide-react";
import { PageHeader } from "@/components/lots/PageHeader";
import { StatCard } from "@/components/lots/StatCard";
import { SectionCard } from "@/components/lots/SectionCard";
import { EmptyState } from "@/components/lots/EmptyState";
import { PeriodToggle, type PeriodDays } from "@/components/lots/PeriodToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { crmKeys } from "@/modules/crm/query-keys";
import { listCrmFormSubmissionsFn } from "@/modules/crm/crm.server";
import {
  formOriginBadge,
  formOriginKind,
  formOriginLabel,
  instantFormContextLine,
  metaPlatformLabel,
  type FormOrigin,
} from "@/modules/crm/ingest/meta-instant-form";
import {
  formatFormAgo,
  formatFormWhen,
  formSubmissionContactLine,
} from "@/modules/crm/forms-present";
import { FormCopyButton, FormDetailField } from "@/components/lots/crm/FormSubmissionDetailField";

export function LeadCentralWorkspace({
  cadastroClienteId,
  clienteNome,
  clienteSlug,
}: {
  cadastroClienteId: number;
  clienteNome: string;
  clienteSlug?: string | null;
}) {
  const [days, setDays] = useState<PeriodDays>(30);
  const [q, setQ] = useState("");
  const [origin, setOrigin] = useState<"all" | FormOrigin>("all");
  const [formKey, setFormKey] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const listFn = useServerFn(listCrmFormSubmissionsFn);

  const formsQuery = useQuery({
    queryKey: [...crmKeys.forms(cadastroClienteId, days), q],
    queryFn: () =>
      listFn({
        data: {
          cadastroClienteId,
          days,
          q: q.trim() || undefined,
        },
      }),
  });

  const all = useMemo(() => formsQuery.data ?? [], [formsQuery.data]);

  const stats = useMemo(() => {
    let landing = 0;
    let instant = 0;
    let comContato = 0;
    for (const row of all) {
      const kind = formOriginKind(row.source, row.formKey);
      if (kind === "meta_instant") instant += 1;
      else landing += 1;
      if (row.email || row.instagram || row.telefone) comContato += 1;
    }
    return { total: all.length, landing, instant, comContato };
  }, [all]);

  const formKeys = useMemo(() => {
    const set = new Set(
      all
        .filter((row) => formOriginKind(row.source, row.formKey) !== "meta_instant")
        .map((row) => row.formKey)
        .filter(Boolean),
    );
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [all]);

  const rows = useMemo(() => {
    let list = all;
    if (origin !== "all") {
      list = list.filter((row) => formOriginKind(row.source, row.formKey) === origin);
    }
    if (origin !== "meta_instant" && formKey !== "all") {
      list = list.filter((row) => row.formKey === formKey);
    }
    return list;
  }, [all, formKey, origin]);

  const openRow = rows.find((row) => row.id === openId) ?? null;
  const hasCrmLink = Boolean(clienteSlug);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Dados"
        title="Central de Leads"
        description={`Todo lead de ${clienteNome} em um só lugar — landing e formulário instantâneo da Meta, com a origem sempre visível.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PeriodToggle value={days} onChange={setDays} />
            {hasCrmLink ? (
              <Button asChild size="sm" variant="outline">
                <Link to="/cliente/$cliente/crm" params={{ cliente: clienteSlug! }}>
                  <Contact2 className="mr-1.5 h-3.5 w-3.5" />
                  Ver no CRM
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Envios no período" value={stats.total} icon={Inbox} />
        <StatCard label="Da landing" value={stats.landing} icon={ClipboardList} />
        <StatCard label="Formulário instantâneo" value={stats.instant} icon={Megaphone} />
        <StatCard
          label="Com contato"
          value={stats.comContato}
          hint="E-mail, Instagram ou telefone"
          icon={Contact2}
        />
      </div>

      <SectionCard
        title="Leads"
        description="Cada envio vira uma ficha. A tag mostra se veio da landing ou de campanha instantânea da Meta."
        bodyClassName="px-0 py-0 sm:px-0 sm:py-0"
      >
        <div className="flex flex-wrap items-end gap-2 border-b border-border px-4 py-3 sm:px-5">
          <div className="min-w-[14rem] flex-1">
            <p className="mb-1 text-xs text-muted-foreground">Buscar</p>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome, e-mail, Instagram, telefone ou campanha"
            />
          </div>
          <div className="min-w-[12rem]">
            <p className="mb-1 text-xs text-muted-foreground">Origem</p>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={origin}
              onChange={(e) => setOrigin(e.target.value as "all" | FormOrigin)}
            >
              <option value="all">Todas</option>
              <option value="landing">Landing</option>
              <option value="meta_instant">Formulário instantâneo</option>
            </select>
          </div>
          {formKeys.length > 1 || formKey !== "all" ? (
            <div className="min-w-[10rem]">
              <p className="mb-1 text-xs text-muted-foreground">Formulário</p>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
              >
                <option value="all">Todos</option>
                {formKeys.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        {formsQuery.isLoading ? (
          <p className="px-4 py-8 text-sm text-muted-foreground sm:px-5">Carregando leads…</p>
        ) : rows.length === 0 ? (
          <div className="px-4 py-2 sm:px-5">
            <EmptyState
              icon={ClipboardList}
              title="Nenhum lead neste recorte"
              description="Leads da landing e dos formulários instantâneos de campanha da Meta aparecem aqui, com a origem na tag."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => {
              const contacts = formSubmissionContactLine(row);
              const kind = formOriginKind(row.source, row.formKey);
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(row.id)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40 sm:px-5",
                      openId === row.id && "bg-muted/50",
                    )}
                  >
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {row.nome.trim().slice(0, 1).toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-foreground">{row.nome}</p>
                        <Badge
                          variant={kind === "meta_instant" ? "outline" : "secondary"}
                          className={cn(
                            "text-[10px]",
                            kind === "meta_instant" ? "font-medium" : "font-mono",
                          )}
                        >
                          {formOriginBadge(row.source, row.formKey)}
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {contacts || "Sem contato estruturado"}
                      </p>
                      {kind === "meta_instant" ? (
                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                          {instantFormContextLine(row.utmCampaign, row.utmContent, row.utmTerm)}
                        </p>
                      ) : null}
                      {row.mensagem ? (
                        <p className="mt-1 line-clamp-1 text-sm text-foreground/80">
                          {row.mensagem}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-muted-foreground">
                        {formatFormAgo(row.createdAt)}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {formatFormWhen(row.createdAt)}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <Sheet open={Boolean(openRow)} onOpenChange={(open) => !open && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {openRow ? (
            <>
              <SheetHeader>
                <SheetTitle>{openRow.nome}</SheetTitle>
                <SheetDescription>
                  {formOriginBadge(openRow.source, openRow.formKey)}
                  {formOriginKind(openRow.source, openRow.formKey) === "meta_instant" &&
                  openRow.utmCampaign
                    ? ` · ${openRow.utmCampaign}`
                    : ""}{" "}
                  · {formatFormWhen(openRow.createdAt)}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                <div className="space-y-2">
                  {openRow.email ? (
                    <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-sm">{openRow.email}</span>
                      <FormCopyButton value={openRow.email} label="E-mail" />
                    </div>
                  ) : null}
                  {openRow.instagram ? (
                    <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                      <AtSign className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {openRow.instagram.replace(/^@/, "")}
                      </span>
                      <FormCopyButton
                        value={openRow.instagram.replace(/^@/, "")}
                        label="Instagram"
                      />
                    </div>
                  ) : null}
                  {openRow.telefone ? (
                    <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-sm">{openRow.telefone}</span>
                      <FormCopyButton value={openRow.telefone} label="Telefone" />
                    </div>
                  ) : null}
                  {!openRow.email && !openRow.instagram && !openRow.telefone ? (
                    <p className="text-sm text-muted-foreground">Sem contato estruturado.</p>
                  ) : null}
                </div>

                <FormDetailField label="Mensagem" value={openRow.mensagem} />
                <FormDetailField
                  label="Origem"
                  value={formOriginLabel(openRow.source, openRow.formKey)}
                />
                {formOriginKind(openRow.source, openRow.formKey) === "meta_instant" ? (
                  <>
                    <FormDetailField label="Campanha" value={openRow.utmCampaign} />
                    <FormDetailField label="Anúncio" value={openRow.utmContent} />
                    <FormDetailField label="Formulário da Meta" value={openRow.utmTerm} />
                    <FormDetailField
                      label="Plataforma"
                      value={metaPlatformLabel(openRow.utmMedium)}
                    />
                  </>
                ) : (
                  <FormDetailField label="Formulário" value={openRow.formKey} />
                )}
                <FormDetailField label="Página" value={openRow.pageUrl} />

                {formOriginKind(openRow.source, openRow.formKey) !== "meta_instant" &&
                  (openRow.utmSource ||
                    openRow.utmMedium ||
                    openRow.utmCampaign ||
                    openRow.utmContent ||
                    openRow.utmTerm) && (
                    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Campanha / UTMs
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <FormDetailField label="utm_source" value={openRow.utmSource} />
                        <FormDetailField label="utm_medium" value={openRow.utmMedium} />
                        <FormDetailField label="utm_campaign" value={openRow.utmCampaign} />
                        <FormDetailField label="utm_content" value={openRow.utmContent} />
                        <FormDetailField label="utm_term" value={openRow.utmTerm} />
                      </div>
                    </div>
                  )}

                <div className="flex flex-wrap gap-2 pt-2">
                  {openRow.crmPersonId && hasCrmLink ? (
                    <Button asChild size="sm">
                      <Link
                        to="/cliente/$cliente/crm"
                        params={{ cliente: clienteSlug! }}
                        search={{ pessoa: openRow.crmPersonId }}
                      >
                        Abrir ficha no CRM
                      </Link>
                    </Button>
                  ) : null}
                  {openRow.pageUrl ? (
                    <Button type="button" size="sm" variant="outline" asChild>
                      <a href={openRow.pageUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        Abrir página
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
