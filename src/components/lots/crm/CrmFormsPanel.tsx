import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardList, ExternalLink, Mail, Phone, AtSign } from "lucide-react";
import { EmptyState } from "@/components/lots/EmptyState";
import type { PeriodDays } from "@/components/lots/PeriodToggle";
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
import { listCrmFormSubmissionsFn, type CrmFormSubmissionRow } from "@/modules/crm/crm.server";
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

export function CrmFormsPanel({
  cadastroClienteId,
  days,
  onOpenPerson,
}: {
  cadastroClienteId: number;
  days: PeriodDays;
  onOpenPerson?: (personId: string) => void;
}) {
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

  const formKeys = useMemo(() => {
    const set = new Set(
      (formsQuery.data ?? [])
        .filter((row) => formOriginKind(row.source, row.formKey) !== "meta_instant")
        .map((row) => row.formKey)
        .filter(Boolean),
    );
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [formsQuery.data]);
  const rows = useMemo(() => {
    let list = formsQuery.data ?? [];
    if (origin !== "all") {
      list = list.filter((row) => formOriginKind(row.source, row.formKey) === origin);
    }
    if (origin !== "meta_instant" && formKey !== "all") {
      list = list.filter((row) => row.formKey === formKey);
    }
    return list;
  }, [formsQuery.data, formKey, origin]);

  const openRow = rows.find((row) => row.id === openId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
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
            <option value="meta_instant">Formul�rio instant�neo</option>
          </select>
        </div>
        {formKeys.length > 1 || formKey !== "all" ? (
          <div className="min-w-[10rem]">
            <p className="mb-1 text-xs text-muted-foreground">Formul�rio</p>
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
        <p className="text-sm text-muted-foreground">Carregando envios?</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          compact
          title="Nenhum formul�rio neste per�odo"
          description="Leads da landing e dos formul�rios instant�neos de campanha da Meta aparecem aqui, com a origem na tag."
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {rows.map((row) => {
            const contacts = formSubmissionContactLine(row);
            const originKind = formOriginKind(row.source, row.formKey);
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(row.id)}
                  className={cn(
                    "flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/40",
                    openId === row.id && "bg-muted/50",
                  )}
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {row.nome.trim().slice(0, 1).toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium text-foreground">{row.nome}</p>
                      <Badge
                        variant={originKind === "meta_instant" ? "outline" : "secondary"}
                        className={cn(
                          "text-[10px]",
                          originKind === "meta_instant" ? "font-medium" : "font-mono",
                        )}
                      >
                        {formOriginBadge(row.source, row.formKey)}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {contacts || "Sem contato estruturado"}
                    </p>
                    {originKind === "meta_instant" ? (
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {instantFormContextLine(row.utmCampaign, row.utmContent, row.utmTerm)}
                      </p>
                    ) : null}
                    {row.mensagem ? (
                      <p className="mt-1 line-clamp-1 text-sm text-foreground/80">{row.mensagem}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">{formatFormAgo(row.createdAt)}</p>
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
                    ? ` � ${openRow.utmCampaign}`
                    : ""}{" "}
                  � {formatFormWhen(openRow.createdAt)}
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
                </div>

                <FormDetailField label="Mensagem" value={openRow.mensagem} />
                <FormDetailField
                  label="Origem"
                  value={formOriginLabel(openRow.source, openRow.formKey)}
                />
                {formOriginKind(openRow.source, openRow.formKey) === "meta_instant" ? (
                  <>
                    <FormDetailField label="Campanha" value={openRow.utmCampaign} />
                    <FormDetailField label="An�ncio" value={openRow.utmContent} />
                    <FormDetailField label="Formul�rio da Meta" value={openRow.utmTerm} />
                    <FormDetailField
                      label="Plataforma"
                      value={metaPlatformLabel(openRow.utmMedium)}
                    />
                  </>
                ) : (
                  <FormDetailField label="Formul�rio" value={openRow.formKey} />
                )}
                <FormDetailField label="P�gina" value={openRow.pageUrl} />

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
                  {openRow.crmPersonId && onOpenPerson ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const personId = openRow.crmPersonId!;
                        setOpenId(null);
                        onOpenPerson(personId);
                      }}
                    >
                      Abrir ficha no CRM
                    </Button>
                  ) : null}
                  {openRow.pageUrl ? (
                    <Button type="button" size="sm" variant="outline" asChild>
                      <a href={openRow.pageUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        Abrir p�gina
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
