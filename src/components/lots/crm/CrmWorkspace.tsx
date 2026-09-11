import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Contact2,
  RefreshCw,
  Search,
  Star,
  MessageCircle,
  Download,
  KeyRound,
  Copy,
} from "lucide-react";
import { PageHeader } from "@/components/lots/PageHeader";
import { StatCard } from "@/components/lots/StatCard";
import { SectionCard } from "@/components/lots/SectionCard";
import { EmptyState } from "@/components/lots/EmptyState";
import { PeriodToggle, type PeriodDays } from "@/components/lots/PeriodToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { crmKeys } from "@/modules/crm/query-keys";
import type { CrmPeopleView } from "@/modules/crm/inbox";
import {
  addCrmPersonNoteFn,
  assignCrmPersonFn,
  createCrmIngestTokenFn,
  exportCrmPeopleFn,
  getCrmCoverageFn,
  getCrmPersonFn,
  getCrmRankingFn,
  ignoreCrmPersonFn,
  listCrmIngestTokensFn,
  listCrmPeopleFn,
  mergeCrmPeopleFn,
  previewCrmCustomAudienceFn,
  replyCrmCommentFn,
  replyCrmDmFn,
  revokeCrmIngestTokenFn,
  setCrmPersonVipFn,
  syncCrmCommentsFn,
  type CrmCollectorChip,
  type CrmIngestTokenRow,
  type CrmPersonListRow,
  type CrmRankingRow,
} from "@/modules/crm/crm.server";

const STATUS_TONE: Record<string, string> = {
  live: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  scope_missing: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  planned: "bg-muted text-muted-foreground",
  impossible: "bg-rose-500/10 text-rose-800 dark:text-rose-200",
};

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ingestCurlExample(origin: string, token = "lots_crm_SEU_TOKEN") {
  return `curl -X POST ${origin}/api/crm/v1/interactions \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  -d '{"channel":"whatsapp","external_id":"wamid.exemplo","body":"quero orçamento","identities":[{"kind":"whatsapp","value":"5511999999999"}]}'`;
}

function IngestTokenPanel({ cadastroClienteId }: { cadastroClienteId: number }) {
  const qc = useQueryClient();
  const [label, setLabel] = useState("Formulário do site");
  const [plainOnce, setPlainOnce] = useState<string | null>(null);
  const listFn = useServerFn(listCrmIngestTokensFn);
  const createFn = useServerFn(createCrmIngestTokenFn);
  const revokeFn = useServerFn(revokeCrmIngestTokenFn);
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const tokensQuery = useQuery({
    queryKey: crmKeys.ingestTokens(cadastroClienteId),
    queryFn: () => listFn({ data: { cadastroClienteId } }),
  });

  const createMut = useMutation({
    mutationFn: () => createFn({ data: { cadastroClienteId, label: label.trim() || "API" } }),
    onSuccess: (row) => {
      setPlainOnce(row.token);
      void qc.invalidateQueries({ queryKey: crmKeys.ingestTokens(cadastroClienteId) });
      void qc.invalidateQueries({ queryKey: crmKeys.coverage(cadastroClienteId) });
      toast.success("Token gerado — copie agora; o Lots não volta a mostrar o valor.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Falha ao gerar token.");
    },
  });

  const revokeMut = useMutation({
    mutationFn: (tokenId: string) => revokeFn({ data: { tokenId } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: crmKeys.ingestTokens(cadastroClienteId) });
      toast.success("Token revogado.");
    },
  });

  const tokens = tokensQuery.data ?? [];

  return (
    <SectionCard
      title="API extra (formulário do site)"
      description="Direct e comentário Instagram já entram pela Graph no Lots. Use um token só se o site ou um formulário próprio precisar empurrar um evento."
    >
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <p className="mb-1 text-xs text-muted-foreground">Rótulo</p>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} />
        </div>
        <Button
          size="sm"
          onClick={() => createMut.mutate()}
          disabled={createMut.isPending}
        >
          <KeyRound className="mr-1.5 h-3.5 w-3.5" />
          Gerar token
        </Button>
      </div>
      {plainOnce ? (
        <div className="mb-3 rounded-md border border-border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Copie agora. Não armazenamos o valor em claro.</p>
          <div className="mt-2 flex items-center gap-2">
            <Input readOnly value={plainOnce} className="font-mono text-xs" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(plainOnce);
                toast.success("Token copiado.");
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : null}
      {tokens.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum token ainda.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {tokens.map((token: CrmIngestTokenRow) => (
            <li key={token.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className={token.revokedAt ? "text-muted-foreground line-through" : "font-medium"}>
                  {token.label}{" "}
                  <span className="font-mono text-xs text-muted-foreground">{token.tokenPrefix}…</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {token.revokedAt
                    ? `Revogado ${formatWhen(token.revokedAt)}`
                    : `Último uso ${formatWhen(token.lastUsedAt)}`}
                </p>
              </div>
              {!token.revokedAt ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => revokeMut.mutate(token.id)}
                  disabled={revokeMut.isPending}
                >
                  Revogar
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <pre className="mt-3 overflow-x-auto rounded-md bg-muted/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
        {ingestCurlExample(origin, plainOnce ?? "lots_crm_SEU_TOKEN")}
      </pre>
    </SectionCard>
  );
}

export function CrmWorkspace({
  cadastroClienteId,
  clienteNome,
  clienteSlug,
  canWrite,
  connectionsHref,
}: {
  cadastroClienteId: number;
  clienteNome: string;
  clienteSlug?: string | null;
  canWrite: boolean;
  connectionsHref: string;
}) {
  const qc = useQueryClient();
  const [days, setDays] = useState<PeriodDays>(30);
  const [q, setQ] = useState("");
  const [view, setView] = useState<CrmPeopleView>("inbox");
  const [openId, setOpenId] = useState<string | null>(null);

  const coverageFn = useServerFn(getCrmCoverageFn);
  const listFn = useServerFn(listCrmPeopleFn);
  const syncFn = useServerFn(syncCrmCommentsFn);
  const rankingFn = useServerFn(getCrmRankingFn);
  const exportFn = useServerFn(exportCrmPeopleFn);
  const audienceFn = useServerFn(previewCrmCustomAudienceFn);

  const coverageQuery = useQuery({
    queryKey: crmKeys.coverage(cadastroClienteId),
    queryFn: () => coverageFn({ data: { cadastroClienteId } }),
  });
  const peopleQuery = useQuery({
    queryKey: [...crmKeys.people(cadastroClienteId, days, view), q],
    queryFn: () =>
      listFn({
        data: { cadastroClienteId, days, q: q.trim() || undefined, view },
      }),
  });
  const rankingQuery = useQuery({
    queryKey: crmKeys.ranking(cadastroClienteId, days),
    queryFn: () => rankingFn({ data: { cadastroClienteId, days } }),
  });

  const syncMut = useMutation({
    mutationFn: () => syncFn({ data: { cadastroClienteId } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["crm"] });
    },
  });

  const people = peopleQuery.data ?? [];
  const active7 = people.filter((p) => p.recencyDays <= 7).length;
  const recurring = people.filter((p) => p.churnState === "recorrente").length;
  const withPii = people.filter((p) => p.piiCompleteness > 0).length;
  const commentsChip = coverageQuery.data?.collectors.find((c) => c.key === "comments");

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Dados"
        title="CRM"
        description={`Caixa de entrada da audiência de ${clienteNome} — Direct e comentários entram pela Graph no Lots, sem ManyChat. E-mail só se o canal entregar o campo.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PeriodToggle value={days} onChange={setDays} />
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const result = await exportFn({ data: { cadastroClienteId, days } });
                downloadCsv(result.csv, `crm-${clienteSlug ?? cadastroClienteId}-${days}d.csv`);
                toast.success(`${result.rows} linhas exportadas (e-mail só se for fato real).`);
              }}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Exportar CSV
            </Button>
            {canWrite ? (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const preview = await audienceFn({ data: { cadastroClienteId } });
                  if (preview.refusedReason) {
                    toast.message("Custom Audience recusada", {
                      description:
                        "Não há e-mail ou telefone consentidos. O Lots não envia IGSID de comentador.",
                    });
                    return;
                  }
                  toast.success(
                    `${preview.emailCount} e-mail(s) e ${preview.phoneCount} telefone(s) hasheados — upload Graph só com opt-in.`,
                  );
                }}
              >
                Público Meta
              </Button>
            ) : null}
            {canWrite ? (
              <Button size="sm" onClick={() => syncMut.mutate()} disabled={syncMut.isPending}>
                <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", syncMut.isPending && "animate-spin")} />
                Puxar Instagram
              </Button>
            ) : null}
          </div>
        }
      />

      <CoverageChips
        collectors={coverageQuery.data?.collectors ?? []}
        gap={coverageQuery.data?.gap}
        lastRanAt={coverageQuery.data?.lastRanAt ?? null}
        connectionsHref={connectionsHref}
        commentsStatus={commentsChip?.status}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pessoas no recorte" value={people.length} icon={Contact2} />
        <StatCard label="Ativas em 7 dias" value={active7} icon={RefreshCw} />
        <StatCard label="Recorrentes" value={recurring} icon={Star} />
        <StatCard
          label="Com e-mail/telefone"
          value={withPii}
          hint="Só fato enviado pelo canal (form, WhatsApp, Lead Ads)"
        />
      </div>

      <SectionCard
        title="Caixa de entrada"
        description="Quem falou com a marca e ainda não teve resposta da marca neste recorte."
      >
        <Tabs value={view} onValueChange={(v) => setView(v as CrmPeopleView)} className="mb-4">
          <TabsList>
            <TabsTrigger value="inbox">Caixa de entrada</TabsTrigger>
            <TabsTrigger value="churn">Em risco</TabsTrigger>
            <TabsTrigger value="all">Todas</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="mb-4 flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar nome, @username ou telefone"
              className="pl-8"
            />
          </div>
        </div>
        {peopleQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando audiência…</p>
        ) : people.length === 0 ? (
          <EmptyState
            icon={Contact2}
            compact
            title={
              view === "inbox"
                ? "Nada na caixa de entrada"
                : view === "churn"
                  ? "Ninguém em risco neste recorte"
                  : "Nenhuma pessoa identificada neste recorte"
            }
            description={
              commentsChip?.status === "scope_missing"
                ? "Refaça o login Instagram com a permissão de comentários."
                : "Puxe o Instagram nesta tela (comentários e Direct). Sem ManyChat."
            }
            action={
              <Button asChild variant="outline" size="sm">
                <a href={connectionsHref}>
                  {connectionsHref.includes("admin") ? "Conexões" : "Conexões da marca"}
                </a>
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {people.map((person) => (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(person.id)}
                  className="flex w-full items-start justify-between gap-3 py-3 text-left hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {person.displayName}
                      {person.isVip ? (
                        <Star className="ml-1 inline h-3.5 w-3.5 text-amber-500" />
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {person.signalCount} sinal(is) · {person.churnLabel} · intenção{" "}
                      {person.intentScore}
                      {person.ownerNome ? ` · ${person.ownerNome}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{person.nextAction}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatWhen(person.lastSignalAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {canWrite ? <IngestTokenPanel cadastroClienteId={cadastroClienteId} /> : null}

      <RankingTable rows={rankingQuery.data ?? []} days={days} loading={rankingQuery.isLoading} />

      {syncMut.isError ? (
        <p className="text-sm text-danger">
          {syncMut.error instanceof Error ? syncMut.error.message : "Falha ao puxar comentários."}
        </p>
      ) : null}

      <PersonDrawer
        personId={openId}
        onClose={() => setOpenId(null)}
        canWrite={canWrite}
        clienteSlug={clienteSlug}
        cadastroClienteId={cadastroClienteId}
        days={days}
      />
    </div>
  );
}

function RankingTable({
  rows,
  days,
  loading,
}: {
  rows: CrmRankingRow[];
  days: PeriodDays;
  loading: boolean;
}) {
  return (
    <SectionCard
      title="O que traz gente de volta"
      description="Pessoas cujo primeiro sinal foi neste post. Volume da mídia e pessoas no CRM são colunas distintas."
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Calculando coortes…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ainda não há posts com pessoas identificadas.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Post</th>
                <th className="py-2 pr-3 font-medium">Pessoas no CRM</th>
                <th className="py-2 pr-3 font-medium">Comentários (mídia)</th>
                <th className="py-2 pr-3 font-medium">Voltaram</th>
                <th className="py-2 font-medium">Ativas {days}d</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 8).map((row) => (
                <tr key={row.igMediaId} className="border-b border-border last:border-0">
                  <td className="py-2 pr-3">
                    <p className="max-w-[18rem] truncate">
                      {row.captionExcerpt || row.pillarTitulo || "Publicação"}
                    </p>
                    {row.permalink ? (
                      <a href={row.permalink} target="_blank" rel="noreferrer" className="text-xs underline">
                        Ver
                      </a>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3">{row.firstTouchPeople}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{row.mediaComments}</td>
                  <td className="py-2 pr-3">
                    {row.returnedPeople} ({row.returnRate}%)
                  </td>
                  <td className="py-2">
                    {row.activeInWindow} ({row.activeRate}%)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function CoverageChips({
  collectors,
  gap,
  lastRanAt,
  connectionsHref,
  commentsStatus,
}: {
  collectors: CrmCollectorChip[];
  gap?: { mediaComments: number; identifiedComments: number; gap: number };
  lastRanAt: string | null;
  connectionsHref: string;
  commentsStatus?: string;
}) {
  return (
    <SectionCard
      title="Cobertura da coleta"
      description={
        gap
          ? `${gap.identifiedComments} comentários identificados no grafo vs ${gap.mediaComments} nas publicações (gap ${gap.gap}).`
          : "O que esta marca consegue identificar hoje."
      }
    >
      <div className="flex flex-wrap gap-2">
        {collectors.map((chip) => (
          <span
            key={chip.key}
            title={chip.detail ?? undefined}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-medium",
              STATUS_TONE[chip.status] ?? STATUS_TONE.planned,
            )}
          >
            {chip.label}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Última ingestão {formatWhen(lastRanAt)}.
        {commentsStatus === "scope_missing" ? (
          <>
            {" "}
            <a href={connectionsHref} className="underline">
              Refazer login
            </a>
          </>
        ) : null}
      </p>
    </SectionCard>
  );
}

function PersonDrawer({
  personId,
  onClose,
  canWrite,
  clienteSlug,
  cadastroClienteId,
  days,
}: {
  personId: string | null;
  onClose: () => void;
  canWrite: boolean;
  clienteSlug?: string | null;
  cadastroClienteId: number;
  days: PeriodDays;
}) {
  const qc = useQueryClient();
  const detailFn = useServerFn(getCrmPersonFn);
  const vipFn = useServerFn(setCrmPersonVipFn);
  const ignoreFn = useServerFn(ignoreCrmPersonFn);
  const noteFn = useServerFn(addCrmPersonNoteFn);
  const replyFn = useServerFn(replyCrmCommentFn);
  const dmFn = useServerFn(replyCrmDmFn);
  const assignFn = useServerFn(assignCrmPersonFn);
  const mergeFn = useServerFn(mergeCrmPeopleFn);
  const listFn = useServerFn(listCrmPeopleFn);
  const [note, setNote] = useState("");
  const [reply, setReply] = useState("");
  const [replySignal, setReplySignal] = useState<string | null>(null);
  const [dm, setDm] = useState("");
  const [mergeQ, setMergeQ] = useState("");

  const detailQuery = useQuery({
    queryKey: personId ? crmKeys.person(personId) : ["crm", "person", "none"],
    queryFn: () => detailFn({ data: { personId: personId! } }),
    enabled: Boolean(personId),
  });

  const mergeQuery = useQuery({
    queryKey: ["crm", "merge-search", cadastroClienteId, mergeQ],
    queryFn: () =>
      listFn({
        data: { cadastroClienteId, days, q: mergeQ.trim() || undefined, view: "all" },
      }),
    enabled: canWrite && mergeQ.trim().length >= 2,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["crm"] });
  };

  const detail = detailQuery.data;

  return (
    <Sheet open={Boolean(personId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex h-[100dvh] w-full flex-col overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{detail?.person.displayName ?? "Pessoa"}</SheetTitle>
          <SheetDescription>
            {detail?.person.churnLabel} · {detail?.person.signalCount} interações · intenção{" "}
            {detail?.person.intentScore}
            {detail?.person.ownerNome ? ` · dono ${detail.person.ownerNome}` : ""}
          </SheetDescription>
        </SheetHeader>
        {!detail ? (
          <p className="mt-4 text-sm text-muted-foreground">Carregando ficha…</p>
        ) : (
          <div className="mt-4 space-y-5 pb-8">
            <p className="text-sm text-muted-foreground">{detail.person.nextAction}</p>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Identidades
              </h3>
              <ul className="mt-1 space-y-1 text-sm">
                {detail.identities.map((id) => (
                  <li key={`${id.kind}-${id.value}`}>
                    <span className="text-muted-foreground">{id.kind}:</span> {id.value}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Dados pessoais
              </h3>
              {detail.facts.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  A Graph não entrega e-mail nem endereço de quem comentou. Esses campos só
                  aparecem se um formulário, WhatsApp ou a API de ingestão enviar o fato.
                </p>
              ) : (
                <ul className="mt-1 space-y-1 text-sm">
                  {detail.facts.map((f) => (
                    <li key={`${f.field}-${f.source}`}>
                      {f.field}: {f.value}{" "}
                      <span className="text-muted-foreground">({f.source})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {Object.entries(detail.kindCounts).map(([k, n]) => (
                <Badge key={k} variant="secondary">
                  {k} {n}
                </Badge>
              ))}
              {Object.entries(detail.placeCounts).map(([k, n]) => (
                <Badge key={`p-${k}`} variant="outline">
                  {k} {n}
                </Badge>
              ))}
            </div>

            {Object.keys(detail.pillarAffinity).length > 0 ? (
              <p className="text-sm">
                Pilares:{" "}
                {Object.entries(detail.pillarAffinity)
                  .map(([k, n]) => `${k} (${n})`)
                  .join(", ")}
              </p>
            ) : null}

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Timeline
              </h3>
              <ul className="mt-2 space-y-3">
                {detail.signals.map((s) => (
                  <li key={s.id} className="border-l-2 border-border pl-3 text-sm">
                    <p className="text-xs text-muted-foreground">
                      {s.kind} · {s.place} · {formatWhen(s.occurredAt)}
                    </p>
                    {s.body ? <p className="mt-0.5">{s.body}</p> : null}
                    {s.pilarTitulo || s.tema ? (
                      <p className="text-xs text-muted-foreground">
                        {[s.pilarTitulo, s.tema].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                    {s.permalink ? (
                      <a
                        href={s.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline"
                      >
                        Ver publicação
                      </a>
                    ) : null}
                    {canWrite && (s.kind === "comment" || s.kind === "reply") ? (
                      <button
                        type="button"
                        className="ml-2 text-xs underline"
                        onClick={() => setReplySignal(s.id)}
                      >
                        Responder
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>

            {detail.mediaGaps.some((g) => g.gap > 0) ? (
              <p className="text-xs text-muted-foreground">
                Algumas peças têm mais comentários no insight do que pessoas no grafo — scope ou
                limite da API.
              </p>
            ) : null}

            {canWrite && replySignal ? (
              <div className="space-y-2">
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Resposta pública no Instagram"
                />
                <Button
                  size="sm"
                  disabled={!reply.trim()}
                  onClick={async () => {
                    await replyFn({ data: { signalId: replySignal, message: reply.trim() } });
                    setReply("");
                    setReplySignal(null);
                    invalidate();
                  }}
                >
                  <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                  Publicar resposta
                </Button>
              </div>
            ) : null}

            {canWrite && detail.identities.some((i) => i.kind === "igsid") ? (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Direct
                </h3>
                <Textarea
                  value={dm}
                  onChange={(e) => setDm(e.target.value)}
                  placeholder="Mensagem privada (exige App Review de mensagens)"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!dm.trim()}
                  onClick={async () => {
                    try {
                      await dmFn({ data: { personId: detail.person.id, message: dm.trim() } });
                      setDm("");
                      toast.success("Direct enviado.");
                      invalidate();
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Falha ao enviar Direct.");
                    }
                  }}
                >
                  Enviar Direct
                </Button>
              </div>
            ) : null}

            {canWrite ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await vipFn({
                      data: { personId: detail.person.id, isVip: !detail.person.isVip },
                    });
                    invalidate();
                  }}
                >
                  {detail.person.isVip ? "Remover VIP" : "Marcar VIP"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await assignFn({
                      data: {
                        personId: detail.person.id,
                        ownerUserId: detail.person.ownerUserId ? null : undefined,
                      },
                    });
                    invalidate();
                  }}
                >
                  {detail.person.ownerUserId ? "Remover dono" : "Atribuir a mim"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await ignoreFn({ data: { personId: detail.person.id } });
                    onClose();
                    invalidate();
                  }}
                >
                  Ignorar
                </Button>
              </div>
            ) : null}

            {canWrite ? (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Unir com outra pessoa
                </h3>
                <Input
                  value={mergeQ}
                  onChange={(e) => setMergeQ(e.target.value)}
                  placeholder="Buscar @ ou nome no mesmo cliente"
                />
                <ul className="space-y-1 text-sm">
                  {(mergeQuery.data ?? [])
                    .filter((p: CrmPersonListRow) => p.id !== detail.person.id)
                    .slice(0, 5)
                    .map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-2">
                        <span>
                          {p.displayName}
                          {p.igUsername ? ` (@${p.igUsername})` : ""}
                        </span>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={async () => {
                            await mergeFn({ data: { fromId: p.id, intoId: detail.person.id } });
                            setMergeQ("");
                            toast.success("Fichas unidas.");
                            invalidate();
                          }}
                        >
                          Unir nesta
                        </Button>
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}

            {canWrite ? (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Notas da agência
                </h3>
                {detail.notes.map((n) => (
                  <p key={n.id} className="text-sm">
                    {n.body}{" "}
                    <span className="text-xs text-muted-foreground">{formatWhen(n.createdAt)}</span>
                  </p>
                ))}
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota interna" />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!note.trim()}
                  onClick={async () => {
                    await noteFn({ data: { personId: detail.person.id, body: note.trim() } });
                    setNote("");
                    invalidate();
                  }}
                >
                  Salvar nota
                </Button>
              </div>
            ) : null}

            {clienteSlug ? (
              <p className="text-xs text-muted-foreground">Marca {clienteSlug}</p>
            ) : null}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
