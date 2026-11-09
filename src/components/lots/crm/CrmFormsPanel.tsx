import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardList, Copy, ExternalLink, Mail, Phone, AtSign } from "lucide-react";
import { toast } from "sonner";
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

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAgo(iso: string) {
  const delta = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(delta) || delta < 0) return formatWhen(iso);
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "há 1 dia";
  return `há ${days} dias`;
}

function contactLine(row: CrmFormSubmissionRow) {
  const parts: string[] = [];
  if (row.email) parts.push(row.email);
  if (row.instagram) parts.push(`@${row.instagram.replace(/^@/, "")}`);
  if (row.telefone) parts.push(row.telefone);
  return parts.join(" · ");
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value?.trim()) return null;
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="break-words text-sm text-foreground">{value}</p>
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-7 px-2"
      onClick={() => {
        void navigator.clipboard.writeText(value);
        toast.success(`${label} copiado.`);
      }}
    >
      <Copy className="h-3.5 w-3.5" />
    </Button>
  );
}

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
    const set = new Set((formsQuery.data ?? []).map((row) => row.formKey).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [formsQuery.data]);
  const rows = useMemo(() => {
    const list = formsQuery.data ?? [];
    return formKey === "all" ? list : list.filter((row) => row.formKey === formKey);
  }, [formsQuery.data, formKey]);

  const openRow = rows.find((row) => row.id === openId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <p className="mb-1 text-xs text-muted-foreground">Buscar</p>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nome, e-mail, Instagram ou telefone"
          />
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
        <p className="text-sm text-muted-foreground">Carregando envios…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          compact
          title="Nenhum formulário neste período"
          description="Quando a landing enviar leads pela API do Lots, eles aparecem aqui com nome, contato e UTMs."
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {rows.map((row) => {
            const contacts = contactLine(row);
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
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {row.formKey}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {contacts || "Sem contato estruturado"}
                    </p>
                    {row.mensagem ? (
                      <p className="mt-1 line-clamp-1 text-sm text-foreground/80">{row.mensagem}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">{formatAgo(row.createdAt)}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {formatWhen(row.createdAt)}
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
                  Envio de {openRow.formKey} · {formatWhen(openRow.createdAt)}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                <div className="space-y-2">
                  {openRow.email ? (
                    <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-sm">{openRow.email}</span>
                      <CopyButton value={openRow.email} label="E-mail" />
                    </div>
                  ) : null}
                  {openRow.instagram ? (
                    <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                      <AtSign className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {openRow.instagram.replace(/^@/, "")}
                      </span>
                      <CopyButton value={openRow.instagram.replace(/^@/, "")} label="Instagram" />
                    </div>
                  ) : null}
                  {openRow.telefone ? (
                    <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-sm">{openRow.telefone}</span>
                      <CopyButton value={openRow.telefone} label="Telefone" />
                    </div>
                  ) : null}
                </div>

                <Field label="Mensagem" value={openRow.mensagem} />
                <Field label="Formulário" value={openRow.formKey} />
                <Field label="Origem" value={openRow.source} />
                <Field label="Página" value={openRow.pageUrl} />

                {(openRow.utmSource ||
                  openRow.utmMedium ||
                  openRow.utmCampaign ||
                  openRow.utmContent ||
                  openRow.utmTerm) && (
                  <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Campanha / UTMs
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Field label="utm_source" value={openRow.utmSource} />
                      <Field label="utm_medium" value={openRow.utmMedium} />
                      <Field label="utm_campaign" value={openRow.utmCampaign} />
                      <Field label="utm_content" value={openRow.utmContent} />
                      <Field label="utm_term" value={openRow.utmTerm} />
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
