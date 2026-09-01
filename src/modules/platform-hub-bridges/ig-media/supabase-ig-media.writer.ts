import type { SupabaseClient } from "@supabase/supabase-js";
import type { IgMediaSyncPayloadV1 } from "@/modules/instagram-posts/types";

const THUMB_BUCKET = "ig-media-thumbs";

export interface IgMediaWriteResult {
  mediaUpserted: number;
  historyRows: number;
  thumbsCached: number;
}

async function cacheThumbnail(
  supabase: SupabaseClient,
  cadastroClienteId: number,
  igMediaId: string,
  thumbnailUrl: string | undefined,
  mediaUrl: string | undefined,
): Promise<string | null> {
  const sourceUrl = thumbnailUrl ?? mediaUrl;
  if (!sourceUrl) return null;

  try {
    const response = await fetch(sourceUrl);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
        ? "webp"
        : "jpg";
    const storagePath = `${cadastroClienteId}/${igMediaId}.${ext}`;

    const { error } = await supabase.storage.from(THUMB_BUCKET).upload(storagePath, buffer, {
      contentType,
      upsert: true,
    });
    if (error) return null;
    return storagePath;
  } catch {
    return null;
  }
}

export async function writeIgMediaSync(
  supabase: SupabaseClient,
  payload: IgMediaSyncPayloadV1,
): Promise<IgMediaWriteResult> {
  const now = new Date().toISOString();
  let mediaUpserted = 0;
  let historyRows = 0;
  let thumbsCached = 0;

  for (const item of payload.items) {
    const thumbPath = await cacheThumbnail(
      supabase,
      payload.cadastroClienteId,
      item.igMediaId,
      item.thumbnailUrl,
      item.mediaUrl,
    );
    if (thumbPath) thumbsCached += 1;

    const { data: row, error } = await supabase
      .from("ig_media")
      .upsert(
        {
          cadastro_cliente_id: payload.cadastroClienteId,
          ig_media_id: item.igMediaId,
          media_product_type: item.mediaProductType,
          media_type: item.mediaType,
          caption: item.caption ?? null,
          permalink: item.permalink ?? null,
          media_url: item.mediaUrl ?? null,
          thumbnail_url: item.thumbnailUrl ?? null,
          thumbnail_storage_path: thumbPath,
          published_at: item.publishedAt,
          metrics: item.metrics,
          metrics_collected_at: item.metricsCollectedAt,
          last_synced_at: now,
          updated_at: now,
        },
        { onConflict: "cadastro_cliente_id,ig_media_id" },
      )
      .select("id")
      .single();

    if (error) throw new Error(`ig_media upsert failed: ${error.message}`);
    mediaUpserted += 1;

    const historyRowsToInsert = Object.entries(item.metrics)
      .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
      .map(([metricKey, value]) => ({
        ig_media_id: row.id,
        metric_key: metricKey,
        value,
        collected_at: item.metricsCollectedAt,
      }));

    if (historyRowsToInsert.length > 0) {
      const { error: histError } = await supabase
        .from("ig_media_metrics_history")
        .insert(historyRowsToInsert);
      if (histError) {
        throw new Error(`ig_media_metrics_history insert failed: ${histError.message}`);
      }
      historyRows += historyRowsToInsert.length;
    }
  }

  return { mediaUpserted, historyRows, thumbsCached };
}
