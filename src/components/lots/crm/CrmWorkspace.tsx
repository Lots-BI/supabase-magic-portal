import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ChevronDown,
  Contact2,
  RefreshCw,
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
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  clampIntent,
  COLLECTOR_STATUS_LABEL,
  fieldLabel,
  formatIdentityValue,
  groupPeopleByProfile,
  identityLabel,
  kindLabel,
  personListTitle,
  placeLabel,
} from "@/modules/crm/present";
import { explainIntent } from "@/modules/crm/score-intent";
import type { CrmSignalInput } from "@/modules/crm/types";
import {
  applyCrmPeopleFilters,
  collectOwners,
  crmFiltersAreActive,
  DEFAULT_CRM_PEOPLE_FILTERS,
  pillarOptions,
  placeOptions,
  type CrmPeopleFilters,
} from "@/modules/crm/people-filters";
import { CrmPeopleToolbar } from "@/components/lots/crm/CrmPeopleToolbar";
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

function formatAgo(iso: string | null) {
  if (!iso) return "—";
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

function initials(name: string) {
  const parts = name.replace(/@/g, "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const letters = parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  return letters || "?";
}

function HeatMeter({ score, compact = false }: { score: number; compact?: boolean }) {
  const value = clampIntent(score);
  return (
    <div className={cn("shrink-0", compact ? "w-16" : "w-28")}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Calor</span>
        <span className="text-sm font-semibold tabular-nums">{value}</span>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  );
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
        <Button size="sm" onClick={() => createMut.mutate()} disabled={createMut.isPending}>
          <KeyRound className="mr-1.5 h-3.5 w-3.5" />
          Gerar token
        </Button>
      </div>
      {plainOnce ? (
        <div className="mb-3 rounded-md border border-border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">
            Copie agora. Não armazenamos o valor em claro.
          </p>
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
                <p
                  className={token.revokedAt ? "text-muted-foreground line-through" : "font-medium"}
                >
                  {token.label}{" "}
                  <span className="font-mono text-xs text-muted-foreground">
                    {token.tokenPrefix}…
                  </span>
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
  const [filters, setFilters] = useState<CrmPeopleFilters>(DEFAULT_CRM_PEOPLE_FILTERS);
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
  const visible = applyCrmPeopleFilters(people, filters);
  const active7 = people.filter((p) => p.recencyDays <= 7).length;
  const recurring = people.filter((p) => p.churnState === "recorrente").length;
  const withPii = people.filter((p) => p.piiCompleteness > 0).length;
  const filtersActive = crmFiltersAreActive(filters);
  const cardAll = filters.recency === "all" && filters.churn === "all" && filters.contact === "all";
  const cardActive7 = filters.recency === "7";
  const cardRecurring = filters.churn === "recorrente";
  const cardContact = filters.contact === "with";

  const toggleCard = (card: "all" | "active7" | "recurring" | "contact") => {
    if (card === "all") {
      setFilters({ ...filters, recency: "all", churn: "all", contact: "all" });
      return;
    }
    if (card === "active7") {
      setFilters({ ...filters, recency: filters.recency === "7" ? "all" : "7" });
      return;
    }
    if (card === "recurring") {
      setFilters({
        ...filters,
        churn: filters.churn === "recorrente" ? "all" : "recorrente",
      });
      return;
    }
    setFilters({ ...filters, contact: filters.contact === "with" ? "all" : "with" });
  };
  const commentsChip = coverageQuery.data?.collectors.find((c) => c.key === "comments");

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Dados"
        title="CRM"
        description={`Audiência de ${clienteNome}. Cada pessoa que fala com a marca vira uma ficha. Abra a ficha para ver a trajetória e o calor de 0 a 100.`}
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
                <RefreshCw
                  className={cn("mr-1.5 h-3.5 w-3.5", syncMut.isPending && "animate-spin")}
                />
                Puxar Instagram
              </Button>
            ) : null}
          </div>
        }
      />

      {commentsChip?.status === "scope_missing" ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
          Falta a permissão de comentários do Instagram.{" "}
          <a href={connectionsHref} className="underline">
            Refazer login
          </a>
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <FilterStat
          active={cardAll}
          onClick={() => toggleCard("all")}
          label="Pessoas na lista"
          value={people.length}
          icon={Contact2}
        />
        <FilterStat
          active={cardActive7}
          onClick={() => toggleCard("active7")}
          label="Ativas em 7 dias"
          value={active7}
          icon={RefreshCw}
        />
        <FilterStat
          active={cardRecurring}
          onClick={() => toggleCard("recurring")}
          label="Recorrentes"
          value={recurring}
          icon={Star}
        />
        <FilterStat
          active={cardContact}
          onClick={() => toggleCard("contact")}
          label="Com e-mail/telefone"
          value={withPii}
          hint="Só fato enviado pelo canal"
          icon={Contact2}
        />
      </div>

      <SectionCard
        title="Pessoas"
        description="Separadas pelo canal do último contato. Caixa de entrada = ainda sem resposta da marca."
      >
        <Tabs value={view} onValueChange={(v) => setView(v as CrmPeopleView)} className="mb-4">
          <TabsList>
            <TabsTrigger value="inbox">Caixa de entrada</TabsTrigger>
            <TabsTrigger value="churn">Em risco</TabsTrigger>
            <TabsTrigger value="all">Todas</TabsTrigger>
          </TabsList>
        </Tabs>
        <CrmPeopleToolbar
          query={q}
          onQueryChange={setQ}
          filters={filters}
          onFiltersChange={setFilters}
          owners={collectOwners(people)}
          places={placeOptions(people)}
          pillars={pillarOptions(people)}
          shown={visible.length}
          total={people.length}
          filtersActive={filtersActive}
          onClear={() => {
            setQ("");
            setFilters(DEFAULT_CRM_PEOPLE_FILTERS);
          }}
        />
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
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Contact2}
            compact
            title="Nenhuma pessoa com esses filtros"
            description="O recorte deste período tem gente, mas a combinação de canal, calor, situação e contato não encontrou ninguém."
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setQ("");
                  setFilters(DEFAULT_CRM_PEOPLE_FILTERS);
                }}
              >
                Limpar filtros
              </Button>
            }
          />
        ) : (
          <PeopleList people={visible} view={view} onOpen={setOpenId} />
        )}
      </SectionCard>

      <Collapsible>
        <SectionCard
          title="Coleta e relatório"
          description="Cobertura, posts que trazem gente de volta e token do formulário do site."
        >
          <CollapsibleTrigger className="flex h-11 w-full items-center justify-between text-sm font-medium">
            Abrir coleta e relatório
            <ChevronDown className="h-4 w-4" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-6 pt-4">
            <CoverageChips
              collectors={coverageQuery.data?.collectors ?? []}
              gap={coverageQuery.data?.gap}
              lastRanAt={coverageQuery.data?.lastRanAt ?? null}
              connectionsHref={connectionsHref}
              commentsStatus={commentsChip?.status}
            />
            <RankingTable
              rows={rankingQuery.data ?? []}
              days={days}
              loading={rankingQuery.isLoading}
            />
            {canWrite ? <IngestTokenPanel cadastroClienteId={cadastroClienteId} /> : null}
          </CollapsibleContent>
        </SectionCard>
      </Collapsible>

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

function FilterStat({
  active,
  onClick,
  label,
  value,
  hint,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  value: number;
  hint?: string;
  icon: typeof Contact2;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-11 rounded-2xl text-left",
        active && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
    >
      <StatCard label={label} value={value} hint={hint} icon={icon} />
    </button>
  );
}

function PeopleList({
  people,
  view,
  onOpen,
}: {
  people: CrmPersonListRow[];
  view: CrmPeopleView;
  onOpen: (id: string) => void;
}) {
  const groups = groupPeopleByProfile(people);
  const showHeaders = groups.length > 1;
  return (
    <div className="min-w-0 space-y-6">
      {groups.map((group) => (
        <section key={group.id} className="min-w-0">
          {showHeaders ? (
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold">{group.label}</h3>
              <p className="text-xs text-muted-foreground">
                {group.hint} · {group.people.length}
              </p>
            </div>
          ) : null}
          <ul className="divide-y divide-border">
            {group.people.map((person) => {
              const title = personListTitle(person.displayName, person.igUsername);
              return (
                <li key={person.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(person.id)}
                    className="flex min-h-11 w-full min-w-0 flex-col gap-1 rounded-md px-1 py-2 text-left hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-3"
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        {initials(title)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate font-medium">{title}</span>
                          {person.isVip ? (
                            <Star className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                          ) : null}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 sm:hidden">
                          <Badge variant="secondary">{person.churnLabel}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatAgo(person.lastSignalAt)}
                          </span>
                        </span>
                        {view !== "inbox" ? (
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {person.nextAction}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 sm:hidden">
                        <HeatMeter score={person.intentScore} compact />
                      </span>
                    </span>
                    <span className="hidden shrink-0 items-center gap-3 sm:flex">
                      <Badge variant="secondary">{person.churnLabel}</Badge>
                      <span className="w-16 text-right text-xs text-muted-foreground">
                        {formatAgo(person.lastSignalAt)}
                      </span>
                      <HeatMeter score={person.intentScore} compact />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
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
        <p className="text-sm text-muted-foreground">
          Ainda não há posts com pessoas identificadas.
        </p>
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
                      <a
                        href={row.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline"
                      >
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
            {chip.label} · {COLLECTOR_STATUS_LABEL[chip.status] ?? chip.status}
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
  const title = detail
    ? personListTitle(detail.person.displayName, detail.person.igUsername)
    : "Pessoa";
  const replyTarget = detail?.signals.find(
    (signal) => signal.kind === "comment" || signal.kind === "reply",
  );
  const activeReplyId = replySignal ?? replyTarget?.id ?? null;
  const heatReasons = detail
    ? explainIntent(
        detail.signals.map((signal): CrmSignalInput => ({
          kind: signal.kind as CrmSignalInput["kind"],
          place: signal.place as CrmSignalInput["place"],
          source: signal.source,
          externalId: signal.externalId,
          body: signal.body,
          occurredAt: signal.occurredAt,
        })),
      )
    : [];

  return (
    <Sheet open={Boolean(personId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex h-[100dvh] w-full max-w-[100vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <div className="shrink-0 space-y-3 border-b border-border px-4 pb-4 pr-12 pt-4">
          <SheetHeader className="space-y-1 text-left">
            <SheetTitle className="break-words text-left">{title}</SheetTitle>
            <SheetDescription className="text-left">
              {detail
                ? `${detail.person.churnLabel} · ${detail.person.signalCount} interações${
                    detail.person.ownerNome ? ` · ${detail.person.ownerNome}` : ""
                  }`
                : "Ficha da pessoa"}
            </SheetDescription>
          </SheetHeader>
          {detail ? <HeatMeter score={detail.person.intentScore} /> : null}
          {detail && canWrite && activeReplyId ? (
            <div className="space-y-2">
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Resposta pública no Instagram"
                className="min-h-11"
              />
              <Button
                className="h-11"
                disabled={!reply.trim()}
                onClick={async () => {
                  await replyFn({ data: { signalId: activeReplyId, message: reply.trim() } });
                  setReply("");
                  setReplySignal(null);
                  toast.success("Resposta publicada.");
                  invalidate();
                }}
              >
                <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                Responder
              </Button>
            </div>
          ) : null}
        </div>
        {!detail ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">Carregando ficha…</p>
        ) : (
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 pb-8">
            <p className="text-sm">
              Entrou em {formatWhen(detail.person.firstSignalAt)}. Último contato em{" "}
              {formatWhen(detail.person.lastSignalAt)}.
            </p>
            <p className="text-sm text-muted-foreground">{detail.person.nextAction}</p>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Trajetória
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Do contato mais antigo desta ficha até o mais recente.
                {detail.person.signalCount > detail.signals.length
                  ? ` Há ${detail.person.signalCount} interações; aqui estão as ${detail.signals.length} mais recentes.`
                  : ""}
              </p>
              <ul className="mt-2 space-y-3">
                {[...detail.signals].reverse().map((s) => (
                  <li key={s.id} className="border-l-2 border-border pl-3 text-sm">
                    <p className="text-xs text-muted-foreground">
                      {kindLabel(s.kind)}
                      {placeLabel(s.place) ? ` · ${placeLabel(s.place)}` : ""} ·{" "}
                      {formatWhen(s.occurredAt)}
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

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Quem é
              </h3>
              <ul className="mt-1 space-y-1 text-sm">
                {detail.identities
                  .filter((id) => id.kind !== "igsid")
                  .map((id) => (
                    <li key={`${id.kind}-${id.value}`}>
                      <span className="text-muted-foreground">{identityLabel(id.kind)}:</span>{" "}
                      {formatIdentityValue(id.kind, id.value)}
                    </li>
                  ))}
              </ul>
              {detail.facts.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Sem e-mail, telefone ou endereço. Comentário não traz esses dados.
                </p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm">
                  {detail.facts.map((f) => (
                    <li key={`${f.field}-${f.source}`}>
                      {fieldLabel(f.field)}: {f.value}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {detail.mediaGaps.some((g) => g.gap > 0) ? (
              <p className="text-xs text-muted-foreground">
                Algumas publicações têm mais comentários do que a ficha conseguiu identificar.
              </p>
            ) : null}

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Por que este calor
              </h3>
              <ul className="mt-1 space-y-1 text-sm">
                {heatReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>

            {canWrite ? (
              <Collapsible>
                <CollapsibleTrigger className="flex h-11 w-full items-center justify-between text-sm font-medium">
                  Mais
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-5 pt-3">
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
                            await dmFn({
                              data: { personId: detail.person.id, message: dm.trim() },
                            });
                            setDm("");
                            toast.success("Direct enviado.");
                            invalidate();
                          } catch (error) {
                            toast.error(
                              error instanceof Error ? error.message : "Falha ao enviar Direct.",
                            );
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
                                  await mergeFn({
                                    data: { fromId: p.id, intoId: detail.person.id },
                                  });
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
                          <span className="text-xs text-muted-foreground">
                            {formatWhen(n.createdAt)}
                          </span>
                        </p>
                      ))}
                      <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Nota interna"
                      />
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
                </CollapsibleContent>
              </Collapsible>
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
