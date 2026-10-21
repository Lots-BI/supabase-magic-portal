import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlatformDef, Row } from "./types";
import { pivotLongMetricRows, type LongMetricRow } from "./pivot-long";

/** Teto do PostgREST. Acima disso a resposta vem cortada em `0-999/*`. */
export const HUB_LONG_PAGE_SIZE = 1000;

const HUB_LONG_MAX_PAGES = 40;

export class IncompleteHubReadError extends Error {
  constructor() {
    super(
      "A leitura das métricas veio incompleta. Os números não foram exibidos para não mostrar um pedaço do período.",
    );
    this.name = "IncompleteHubReadError";
  }
}

function pageSignature(row: LongMetricRow | undefined): string {
  if (!row) return "";
  return `${row.data}\0${row.ad_account_id ?? ""}\0${row.campanha ?? ""}\0${row.metrica}\0${row.valor}`;
}

/** Junta as páginas até a última vir incompleta. A RPC precisa ordenar. */
export async function fetchHubLongPages(
  loadPage: (from: number, to: number) => Promise<LongMetricRow[]>,
): Promise<LongMetricRow[]> {
  const all: LongMetricRow[] = [];
  let firstSignature = "";
  let lastFull = false;

  for (let start = 0; start < HUB_LONG_PAGE_SIZE * HUB_LONG_MAX_PAGES; start += HUB_LONG_PAGE_SIZE) {
    const batch = await loadPage(start, start + HUB_LONG_PAGE_SIZE - 1);
    if (batch.length === 0) {
      lastFull = false;
      break;
    }
    const signature = pageSignature(batch[0]);
    if (start === 0) firstSignature = signature;
    else if (signature === firstSignature) throw new IncompleteHubReadError();
    all.push(...batch);
    lastFull = batch.length >= HUB_LONG_PAGE_SIZE;
    if (!lastFull) break;
  }

  if (lastFull) throw new IncompleteHubReadError();
  return all;
}

/** Lê o recorte do dashboard via RPC (cliente+data no banco, sem varrer o portfólio). */
export async function fetchDashboardRows(
  supabase: SupabaseClient,
  def: PlatformDef,
  cliente: string,
  from: string,
  to: string,
): Promise<Row[]> {
  const args = {
    p_plataforma: def.key,
    p_cliente: cliente,
    p_from: from,
    p_to: to,
  };
  const long = await fetchHubLongPages(async (fromRow, toRow) => {
    const { data, error } = await supabase
      .rpc("dashboard_prefer_hub_long", args)
      .range(fromRow, toRow);
    if (error) throw error;
    return (data ?? []) as LongMetricRow[];
  });
  return pivotLongMetricRows(def, long);
}
