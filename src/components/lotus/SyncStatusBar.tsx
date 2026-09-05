import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { addDaysISO, brtToday, formatBR } from "@/lib/period";
import {
  assessCollectionHealth,
  COLLECTION_LOOKBACK_DAYS,
  type CollectionOverall,
  type PlatformHealth,
  type PlatformHealthStatus,
} from "@/lib/collection-health";

type ClienteAtivo = {
  cliente: string;
  ultima_ingestao: string | null;
  plataformas_ativas: string[] | null;
};

type MetricDayRow = {
  plataforma: string;
  data: string;
};

const clienteSyncMetaQuery = (queryName: string) =>
  queryOptions({
    queryKey: ["cliente-sync-meta", queryName],
    queryFn: async (): Promise<ClienteAtivo | null> => {
      const { data, error } = await supabase
        .from("vw_clientes_ativos")
        .select("cliente,ultima_ingestao,plataformas_ativas")
        .eq("cliente", queryName)
        .maybeSingle();
      if (error) throw error;
      return (data as ClienteAtivo | null) ?? null;
    },
    staleTime: 60_000,
  });

const clienteCoverageQuery = (queryName: string, since: string) =>
  queryOptions({
    queryKey: ["cliente-sync-coverage", queryName, since],
    queryFn: async (): Promise<MetricDayRow[]> => {
      const { data, error } = await supabase
        .from("vw_metricas_normalizadas")
        .select("plataforma,data")
        .eq("cliente", queryName)
        .gte("data", since);
      if (error) throw error;
      return (data ?? []) as MetricDayRow[];
    },
    staleTime: 60_000,
  });

function formatIngest(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_DOT: Record<PlatformHealthStatus, string> = {
  ok: "bg-[color:var(--success)]",
  gaps: "bg-warning",
  delayed: "bg-warning",
  stale: "bg-danger",
  empty: "bg-danger",
};

const authenticatedRoute = getRouteApi("/_authenticated");

export function SyncStatusBar({ queryName }: { queryName: string }) {
  const { isAdmin } = authenticatedRoute.useRouteContext();
  if (!isAdmin) return null;

  return (
    <Suspense fallback={<SyncStatusSkeleton />}>
      <SyncStatusBody queryName={queryName} />
    </Suspense>
  );
}

function SyncStatusSkeleton() {
  return <div className="lotus-skeleton h-24 w-full rounded-xl" />;
}

function SyncStatusBody({ queryName }: { queryName: string }) {
  const today = brtToday();
  const since = addDaysISO(today, -COLLECTION_LOOKBACK_DAYS);
  const { data: meta } = useSuspenseQuery(clienteSyncMetaQuery(queryName));
  const { data: rows } = useSuspenseQuery(clienteCoverageQuery(queryName, since));

  const health = assessCollectionHealth({
    today,
    rows,
    knownPlatforms: meta?.plataformas_ativas ?? [],
  });

  if (!meta && health.platforms.length === 0) {
    return (
      <div className="lotus-surface flex items-start gap-3 border-warning/30 bg-warning/5 p-4">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div>
          <p className="text-[13px] font-medium text-foreground">Sem dados de sincronização</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Esta conta ainda não possui registros nas views de métricas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "lotus-surface relative isolate z-0 p-4",
        health.overall === "warning" && "border-warning/40 bg-warning/[0.04]",
        health.overall === "alert" && "border-danger/35 bg-danger/[0.04]",
      )}
    >
      <div className="flex items-start gap-2.5">
        <OverallIcon overall={health.overall} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-foreground">{health.title}</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
            {health.detail}
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span>Esperado até {formatBR(health.expectedEnd)}</span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3 w-3" aria-hidden />
              Ingestão {formatIngest(meta?.ultima_ingestao ?? null)}
            </span>
          </p>
        </div>
      </div>

      {health.platforms.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {health.platforms.map((platform) => (
            <li key={platform.key}>
              <PlatformHealthRow platform={platform} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function OverallIcon({ overall }: { overall: CollectionOverall }) {
  if (overall === "ok") {
    return (
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--success)]" aria-hidden />
    );
  }
  return (
    <AlertTriangle
      className={cn(
        "mt-0.5 h-4 w-4 shrink-0",
        overall === "alert" ? "text-[color:var(--danger)]" : "text-warning",
      )}
      aria-hidden
    />
  );
}

function PlatformHealthRow({ platform }: { platform: PlatformHealth }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-background/50 px-2.5 py-2">
      <span
        className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT[platform.status])}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
          <p className="text-[12.5px] font-medium text-foreground">{platform.label}</p>
          <p className="text-[11px] text-muted-foreground">{statusLabel(platform)}</p>
        </div>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
          {platformCaption(platform)}
        </p>
      </div>
    </div>
  );
}

function statusLabel(platform: PlatformHealth) {
  switch (platform.status) {
    case "ok":
      return "em dia";
    case "gaps":
      return `${platform.missingDates.length} dia${platform.missingDates.length === 1 ? "" : "s"} faltando`;
    case "delayed":
      return `atraso de ${platform.lagDays} dia${platform.lagDays === 1 ? "" : "s"}`;
    case "stale":
      return "parada";
    case "empty":
      return "sem dados";
  }
}

function platformCaption(platform: PlatformHealth) {
  if (platform.status === "empty") {
    return `Nenhum dia com métrica nos últimos ${COLLECTION_LOOKBACK_DAYS} dias.`;
  }
  if (platform.status === "gaps") {
    const shown = platform.missingDates.slice(0, 3).map(formatBR).join(", ");
    const extra = platform.missingDates.length > 3 ? ` +${platform.missingDates.length - 3}` : "";
    return `Sem registro em ${shown}${extra}. Último dia com dado: ${formatBR(platform.lastDate ?? "")}.`;
  }
  if (platform.status === "delayed" || platform.status === "stale") {
    return `Último dia com dado: ${formatBR(platform.lastDate ?? "")}. A coleta deveria chegar até ontem.`;
  }
  return `Último dia com dado: ${formatBR(platform.lastDate ?? "")}.`;
}
