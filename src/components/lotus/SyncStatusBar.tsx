import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense } from "react";
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { PLATFORM_LABEL, type Platform } from "@/lib/metrics";

type ClienteAtivo = {
  cliente: string;
  ultima_data_recebida: string | null;
  ultima_ingestao: string | null;
  plataformas_ativas: string[] | null;
  total_registros: number;
};

const clienteSyncQuery = (queryName: string) =>
  queryOptions({
    queryKey: ["cliente-sync", queryName],
    queryFn: async (): Promise<ClienteAtivo | null> => {
      const { data, error } = await supabase
        .from("vw_clientes_ativos")
        .select("cliente,ultima_data_recebida,ultima_ingestao,plataformas_ativas,total_registros")
        .eq("cliente", queryName)
        .maybeSingle();
      if (error) throw error;
      return (data as ClienteAtivo | null) ?? null;
    },
    staleTime: 2 * 60_000,
  });

const PLATFORM_ALIASES: Record<string, Platform> = {
  meta_ads: "meta_ads",
  google_ads: "google_ads",
  ga4: "ga4",
  instagram: "instagram",
  google_business: "google_business",
  tiktok: "tiktok",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: iso.includes("T") ? "2-digit" : undefined,
    minute: iso.includes("T") ? "2-digit" : undefined,
  });
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso.includes("T") ? iso : iso + "T12:00:00");
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function SyncStatusBar({ queryName }: { queryName: string }) {
  return (
    <Suspense fallback={<SyncStatusSkeleton />}>
      <SyncStatusBody queryName={queryName} />
    </Suspense>
  );
}

function SyncStatusSkeleton() {
  return <div className="lotus-skeleton h-20 w-full rounded-xl" />;
}

function SyncStatusBody({ queryName }: { queryName: string }) {
  const { data } = useSuspenseQuery(clienteSyncQuery(queryName));

  if (!data) {
    return (
      <div className="lotus-surface flex items-start gap-3 border-warning/30 bg-warning/5 p-4">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div>
          <p className="text-[13px] font-medium text-foreground">Sem dados de sincronização</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Este cliente ainda não possui registros nas views de métricas.
          </p>
        </div>
      </div>
    );
  }

  const staleDays = daysSince(data.ultima_data_recebida);
  const isStale = staleDays != null && staleDays > 3;
  const platforms = (data.plataformas_ativas ?? [])
    .map((p) => PLATFORM_ALIASES[p] ?? null)
    .filter(Boolean) as Platform[];

  return (
    <div className={cn("lotus-surface p-4", isStale && "border-warning/40 bg-warning/[0.04]")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          {isStale ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--success)]" />
          )}
          <div>
            <p className="text-[13px] font-medium text-foreground">
              {isStale ? "Sincronização desatualizada" : "Coleta em dia"}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                Última data: {formatDate(data.ultima_data_recebida)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3 w-3" />
                Ingestão: {formatDate(data.ultima_ingestao)}
              </span>
            </p>
            <p className="mt-1 text-[10.5px] text-muted-foreground/90">
              Fonte dos dashboards: Make (vw_metricas) — Hub em dual-run até cutover.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[10.5px] font-medium tabular-nums text-muted-foreground">
          {data.total_registros.toLocaleString("pt-BR")} registros
        </span>
      </div>

      {platforms.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {platforms.map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/60 px-2 py-0.5 text-[10.5px] font-medium text-foreground"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--success)]" />
              {PLATFORM_LABEL[p]}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-[11.5px] text-muted-foreground">
          Nenhuma plataforma com dados ativos no momento.
        </p>
      )}

      {isStale && (
        <p className="mt-3 text-[11.5px] leading-relaxed text-warning">
          Os dados têm mais de 3 dias sem atualização. Verifique as integrações ou aguarde a próxima
          coleta automática.
        </p>
      )}
    </div>
  );
}
