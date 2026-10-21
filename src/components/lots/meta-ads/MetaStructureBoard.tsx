import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchHubLongPages } from "@/lib/platforms/fetch-dashboard-rows";
import type { Period } from "@/lib/period";
import { parseStructureCampaignKey } from "@/modules/platform-hub/plugins/meta_ads/api/meta-structure";
import { ALL_META_AD_ACCOUNTS } from "./MetaAdAccountSelector";
import { rowMatchesAdAccount } from "./meta-ad-account";
import { SectionCard } from "@/components/lots/SectionCard";
import { cn } from "@/lib/utils";

type TabId = "adset" | "ad" | "boost";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "adset", label: "Conjuntos" },
  { id: "ad", label: "Anúncios" },
  { id: "boost", label: "Turbinação" },
];

interface StructureRow {
  campanha: string | null;
  metrica: string | null;
  valor: number | null;
  ad_account_id?: string | null;
}

interface Bucket {
  label: string;
  detail: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  results: number;
  visits: number;
  purchase: number;
}

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});
const int = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

function addMetric(bucket: Bucket, metric: string, value: number) {
  switch (metric) {
    case "nx_spend":
      bucket.spend += value;
      break;
    case "nx_impressions":
      bucket.impressions += value;
      break;
    case "nx_reach":
      bucket.reach = Math.max(bucket.reach, value);
      break;
    case "nx_clicks":
      bucket.clicks += value;
      break;
    case "nx_results":
      bucket.results += value;
      break;
    case "nx_instagram_visits":
      bucket.visits += value;
      break;
    case "nx_purchase_value":
      bucket.purchase += value;
      break;
    default:
      break;
  }
}

export function MetaStructureBoard({
  cliente,
  period,
  adAccountId = ALL_META_AD_ACCOUNTS,
  primaryAdAccountId,
  accountLabels,
}: {
  cliente: string;
  period: Period;
  adAccountId?: string;
  primaryAdAccountId?: string;
  accountLabels?: ReadonlyMap<string, string>;
}) {
  const [tab, setTab] = useState<TabId>("ad");
  const query = useQuery({
    queryKey: ["meta-structure", cliente, period.from, period.to],
    queryFn: async () => {
      const args = {
        p_cliente: cliente,
        p_from: period.from,
        p_to: period.to,
      };
      return fetchHubLongPages(async (fromRow, toRow) => {
        const { data, error } = await supabase
          .rpc("dashboard_meta_structure_long", args)
          .range(fromRow, toRow);
        if (error) throw new Error(error.message);
        return (data ?? []) as StructureRow[];
      });
    },
    staleTime: 30_000,
  });

  const rows = useMemo(() => {
    const buckets = new Map<string, Bucket>();
    for (const row of query.data ?? []) {
      const account = String(row.ad_account_id ?? "").trim();
      if (!rowMatchesAdAccount(account, adAccountId, primaryAdAccountId)) continue;
      const metric = String(row.metrica ?? "");
      if (!metric.startsWith("nx_")) continue;
      const parsed = parseStructureCampaignKey(String(row.campanha ?? ""));
      if (!parsed) continue;
      if (tab === "boost" && !(parsed.level === "ad" && parsed.boosted)) continue;
      if (tab === "ad" && parsed.level !== "ad") continue;
      if (tab === "adset" && parsed.level !== "adset") continue;

      const label =
        tab === "adset"
          ? parsed.adset || "Conjunto sem nome"
          : parsed.ad || "Anúncio sem nome";
      const accountName = account ? accountLabels?.get(account) : undefined;
      const detailBase =
        tab === "adset" ? parsed.campaign : `${parsed.campaign} · ${parsed.adset}`.replace(/^ · | · $/g, "");
      const detail = accountName && adAccountId === ALL_META_AD_ACCOUNTS
        ? [detailBase, accountName].filter(Boolean).join(" · ")
        : detailBase;
      const id = `${account}\0${parsed.level}\0${parsed.boosted ? "1" : "0"}\0${label}\0${detail}`;
      const bucket = buckets.get(id) ?? {
        label,
        detail,
        spend: 0,
        impressions: 0,
        reach: 0,
        clicks: 0,
        results: 0,
        visits: 0,
        purchase: 0,
      };
      addMetric(bucket, metric, Number(row.valor) || 0);
      buckets.set(id, bucket);
    }
    return [...buckets.values()].sort((a, b) => b.spend - a.spend);
  }, [query.data, tab, adAccountId, primaryAdAccountId, accountLabels]);

  return (
    <SectionCard
      eyebrow="Estrutura"
      title="Conjunto, anúncio e turbinação"
      description="O mesmo período do dashboard. Turbinação é o anúncio cujo criativo aponta para uma publicação que já existia no Instagram. Alcance é o pico diário, não a soma de pessoas únicas."
      bodyClassName="px-0 py-0"
    >
      <div className="flex flex-wrap gap-1 border-b border-border px-4 py-3">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-[12.5px] font-medium",
              tab === item.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {query.isLoading ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">Carregando estrutura…</p>
      ) : query.isError ? (
        <p className="px-5 py-8 text-sm text-danger">
          {query.error instanceof Error ? query.error.message : "Erro ao ler a estrutura."}
        </p>
      ) : rows.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">
          Ainda não há conjunto, anúncio ou turbinação neste período. Use Puxar métricas — a
          coleta nova grava os últimos dias junto com as campanhas.
        </p>
      ) : (
        <div className="lots-table-scroll">
          <table className="w-full min-w-max text-[13px]">
            <thead className="text-left text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">
              <tr>
                <th className="lots-table-head-sticky px-4 py-2.5 font-medium">Nome</th>
                <th className="px-4 py-2.5 text-right font-medium">Gasto</th>
                <th className="px-4 py-2.5 text-right font-medium">Resultados</th>
                <th className="px-4 py-2.5 text-right font-medium">Impressões</th>
                <th className="px-4 py-2.5 text-right font-medium">Alcance</th>
                <th className="px-4 py-2.5 text-right font-medium">Cliques</th>
                <th className="px-4 py-2.5 text-right font-medium">Visitas</th>
                <th className="px-4 py-2.5 text-right font-medium">Compras</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.label}-${row.detail}`} className="border-t border-border">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-foreground">{row.label}</p>
                    {row.detail ? (
                      <p className="text-[11.5px] text-muted-foreground">{row.detail}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{money.format(row.spend)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{int.format(row.results)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {int.format(row.impressions)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{int.format(row.reach)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{int.format(row.clicks)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{int.format(row.visits)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {money.format(row.purchase)}
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
