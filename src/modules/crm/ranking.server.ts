import type { SupabaseClient } from "@supabase/supabase-js";
import { rankMediaByReturn, type CohortSignal, type RankedMedia } from "./cohort";
import type { PeriodDays } from "@/components/lots/PeriodToggle";

export type CrmRankingRow = RankedMedia & {
  mediaComments: number;
  permalink: string | null;
  captionExcerpt: string | null;
};

export async function loadCrmRanking(
  supabase: SupabaseClient,
  cadastroClienteId: number,
  days: PeriodDays,
): Promise<CrmRankingRow[]> {
  const { data: people, error: peopleError } = await supabase
    .from("crm_people")
    .select("id, ignored_at")
    .eq("cadastro_cliente_id", cadastroClienteId);
  if (peopleError) throw new Error(peopleError.message);
  const ignored = new Set((people ?? []).filter((p) => p.ignored_at).map((p) => p.id));

  const { data: signals, error } = await supabase
    .from("crm_signals")
    .select("person_id, occurred_at, ig_media_id, payload")
    .eq("cadastro_cliente_id", cadastroClienteId)
    .not("ig_media_id", "is", null)
    .order("occurred_at", { ascending: true });
  if (error) throw new Error(error.message);

  const cohortSignals: CohortSignal[] = (signals ?? []).map((row) => {
    const payload = (row.payload ?? {}) as { pilarTitulo?: string | null };
    return {
      personId: row.person_id,
      ignored: ignored.has(row.person_id),
      occurredAt: row.occurred_at,
      igMediaId: row.ig_media_id,
      pillarTitulo: payload.pilarTitulo ?? null,
    };
  });

  const ranked = rankMediaByReturn(cohortSignals, days);
  const mediaIds = ranked.map((row) => row.igMediaId);
  if (mediaIds.length === 0) return [];

  const { data: media } = await supabase
    .from("ig_media")
    .select("id, permalink, caption, metrics")
    .in("id", mediaIds);

  const byId = new Map((media ?? []).map((row) => [row.id, row]));
  return ranked.map((row) => {
    const m = byId.get(row.igMediaId);
    const metrics = (m?.metrics ?? {}) as Record<string, number>;
    const mediaComments = typeof metrics.comments === "number" ? metrics.comments : 0;
    return {
      ...row,
      mediaComments,
      permalink: m?.permalink ?? null,
      captionExcerpt: m?.caption ? m.caption.slice(0, 80) : null,
    };
  });
}
