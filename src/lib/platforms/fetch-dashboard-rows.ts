import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlatformDef, Row } from "./types";
import { pivotLongMetricRows, type LongMetricRow } from "./pivot-long";

/** Lê o recorte do dashboard via RPC (cliente+data no banco, sem varrer o portfólio). */
export async function fetchDashboardRows(
  supabase: SupabaseClient,
  def: PlatformDef,
  cliente: string,
  from: string,
  to: string,
): Promise<Row[]> {
  const { data, error } = await supabase.rpc("dashboard_prefer_hub_long", {
    p_plataforma: def.key,
    p_cliente: cliente,
    p_from: from,
    p_to: to,
  });
  if (error) throw error;
  return pivotLongMetricRows(def, (data ?? []) as LongMetricRow[]);
}
