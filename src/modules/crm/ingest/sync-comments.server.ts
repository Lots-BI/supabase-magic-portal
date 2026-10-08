import type { SupabaseClient } from "@supabase/supabase-js";
import { FetchHttpClient } from "@/modules/platform-hub/plugins/_internal/http/fetch-http-client";
import { InstagramGraphClient } from "@/modules/platform-hub/plugins/instagram_organic/api/instagram-graph-client";
import type { InstagramCommentV1 } from "@/modules/platform-hub/plugins/instagram_organic/api/instagram-api.types";
import { listActivePluginConnections } from "@/modules/platform-hub-bridges/ph-persistence/sync-all-active-connections";
import { mapGraphCommentToSignal } from "./map-graph-comment";
import { normalizeIdentityValue, normalizeUsername } from "../normalize-identity";
import { isBrandAuthor, shouldSkipComment } from "../skip-rules";
import { CRM_COLLECTOR_KEYS, CRM_SOURCE_BRAND_REPLY } from "../types";
import type { CrmIdentityInput, CrmSignalInput } from "../types";
import { resolveCrmInstagramTarget } from "./resolve-crm-instagram-target.server";
import { persistCrmSignal, recomputeAndStoreStats } from "./persist-signal.server";
import { ignoreBrandPeople, loadCrmBrandAuthor } from "./brand-author.server";

const MEDIA_LOOKBACK_DAYS = 21;
const MEDIA_CAP = 40;

type IgMediaRow = {
  id: string;
  ig_media_id: string;
  media_product_type: string;
  permalink: string | null;
  caption: string | null;
  published_at: string;
  metrics: Record<string, number | undefined> | null;
  content_card_id: string | null;
};

function commentsCount(metrics: IgMediaRow["metrics"]): number {
  const value = metrics?.comments ?? metrics?.comments_count;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isScopeMissing(message: string): boolean {
  return /(#10)\b|(#200)\b|instagram_manage_comments|permission|not authorized/i.test(message);
}

async function upsertCollector(
  supabase: SupabaseClient,
  cadastroClienteId: number,
  key: string,
  status: "live" | "scope_missing" | "planned" | "impossible",
  detail: string | null,
) {
  const { error } = await supabase.from("crm_collector_state").upsert(
    {
      cadastro_cliente_id: cadastroClienteId,
      collector_key: key,
      status,
      detail,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "cadastro_cliente_id,collector_key" },
  );
  if (error) throw new Error(error.message);
}

async function ensureBaselineCollectors(supabase: SupabaseClient, cadastroClienteId: number) {
  const planned: Record<string, string> = {
    dm: "Direct Instagram pela Graph no Lots — caso de uso Mensagens no App Dashboard, depois Relogin. Sem ManyChat.",
    lead_ads: "Lead Ads — webhook leadgen (App Review leads_retrieval).",
    whatsapp: "WhatsApp Cloud — plugin Hub ainda não ligado; mapper pronto.",
    gbp_reviews: "Avaliações do Google Business — planejado.",
    ingest_api: "Opcional: formulário do site. Direct e comentário entram pela Graph no Lots.",
  };
  const { data: existing } = await supabase
    .from("crm_collector_state")
    .select("collector_key")
    .eq("cadastro_cliente_id", cadastroClienteId);
  const have = new Set((existing ?? []).map((row) => row.collector_key));
  if (!have.has("likes")) {
    await upsertCollector(
      supabase,
      cadastroClienteId,
      "likes",
      "impossible",
      "A Graph não lista quem curtiu.",
    );
  }
  for (const [key, detail] of Object.entries(planned)) {
    if (have.has(key)) continue;
    await upsertCollector(supabase, cadastroClienteId, key, "planned", detail);
  }
}

async function loadCardMeta(
  supabase: SupabaseClient,
  cardId: string | null,
): Promise<{ pilarTitulo: string | null; tema: string | null }> {
  if (!cardId) return { pilarTitulo: null, tema: null };
  const { data } = await supabase
    .from("content_cards")
    .select("tema, pilar_id")
    .eq("id", cardId)
    .maybeSingle();
  if (!data?.pilar_id) return { pilarTitulo: null, tema: data?.tema ?? null };
  const { data: pilar } = await supabase
    .from("editorial_pillars")
    .select("titulo")
    .eq("id", data.pilar_id)
    .maybeSingle();
  return { pilarTitulo: pilar?.titulo ?? null, tema: data.tema ?? null };
}

/** Resposta da própria marca: fica na pessoa do comentário pai, nunca vira pessoa nova. */
async function persistBrandReply(
  supabase: SupabaseClient,
  cadastroClienteId: number,
  comment: InstagramCommentV1,
  mapped: CrmSignalInput,
): Promise<string | null> {
  if (!comment.parent_id) return null;
  const { data: parent } = await supabase
    .from("crm_signals")
    .select("person_id")
    .eq("cadastro_cliente_id", cadastroClienteId)
    .eq("external_id", comment.parent_id)
    .in("kind", ["comment", "reply"])
    .limit(1)
    .maybeSingle();
  if (!parent?.person_id) return null;
  const { error } = await supabase.from("crm_signals").upsert(
    {
      person_id: parent.person_id,
      cadastro_cliente_id: cadastroClienteId,
      kind: "brand_reply",
      place: mapped.place,
      source: CRM_SOURCE_BRAND_REPLY,
      external_id: comment.id,
      body: mapped.body,
      occurred_at: mapped.occurredAt,
      ig_media_id: mapped.igMediaId,
      content_card_id: mapped.contentCardId,
      payload: { ...mapped.payload, inReplyTo: comment.parent_id },
    },
    { onConflict: "cadastro_cliente_id,source,external_id", ignoreDuplicates: true },
  );
  if (error) throw new Error(error.message);
  return parent.person_id as string;
}

function identitiesFromComment(comment: InstagramCommentV1): {
  identities: CrmIdentityInput[];
  displayName: string;
} {
  const username = normalizeUsername(comment.username ?? comment.from?.username);
  const igsid = normalizeIdentityValue("igsid", comment.from?.id);
  const identities: CrmIdentityInput[] = [];
  if (igsid) identities.push({ kind: "igsid", value: igsid, source: "instagram_comment" });
  if (username)
    identities.push({ kind: "ig_username", value: username, source: "instagram_comment" });
  return {
    identities,
    displayName: username ? `@${username}` : `IG ${igsid?.slice(0, 8) ?? comment.id.slice(0, 6)}`,
  };
}

export type CrmCommentsSyncResult = {
  ok: boolean;
  commentsFetched: number;
  peopleTouched: number;
  mediaScanned: number;
  error?: string;
  scopeMissing?: boolean;
};

export async function syncCrmCommentsForCadastro(
  supabase: SupabaseClient,
  cadastroClienteId: number,
): Promise<CrmCommentsSyncResult> {
  await ensureBaselineCollectors(supabase, cadastroClienteId);

  const target = await resolveCrmInstagramTarget(supabase, cadastroClienteId);
  if ("error" in target) {
    await upsertCollector(supabase, cadastroClienteId, "comments", "scope_missing", target.detail);
    return {
      ok: false,
      commentsFetched: 0,
      peopleTouched: 0,
      mediaScanned: 0,
      error: target.detail,
    };
  }

  const brand = await loadCrmBrandAuthor(supabase, cadastroClienteId, {
    igUserId: target.igUserId,
    igUsername: target.igUsername,
  });
  await ignoreBrandPeople(supabase, cadastroClienteId, brand);

  const cutoff = new Date(Date.now() - MEDIA_LOOKBACK_DAYS * 86_400_000).toISOString();
  const { data: mediaRows, error: mediaError } = await supabase
    .from("ig_media")
    .select(
      "id, ig_media_id, media_product_type, permalink, caption, published_at, metrics, content_card_id",
    )
    .eq("cadastro_cliente_id", cadastroClienteId)
    .gte("published_at", cutoff)
    .order("published_at", { ascending: false })
    .limit(80);
  if (mediaError) throw new Error(mediaError.message);

  const media = ((mediaRows ?? []) as IgMediaRow[])
    .filter((row) => commentsCount(row.metrics) > 0 || row.media_product_type === "STORY")
    .slice(0, MEDIA_CAP);

  const graph = new InstagramGraphClient({ httpClient: new FetchHttpClient() });
  let commentsFetched = 0;
  let peopleTouched = 0;
  let scopeMissing = false;

  for (const row of media) {
    let listed;
    try {
      listed = await graph.listMediaComments(target.accessToken, row.ig_media_id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (isScopeMissing(message)) {
        scopeMissing = true;
        await upsertCollector(supabase, cadastroClienteId, "comments", "scope_missing", message);
        break;
      }
      await supabase.from("crm_ingest_cursors").upsert(
        {
          connection_id: target.connectionId,
          cadastro_cliente_id: cadastroClienteId,
          ig_media_id: row.ig_media_id,
          last_error: message,
          last_ran_at: new Date().toISOString(),
        },
        { onConflict: "connection_id,ig_media_id" },
      );
      continue;
    }

    if (listed.unsupported) {
      scopeMissing = true;
      await upsertCollector(
        supabase,
        cadastroClienteId,
        "comments",
        "scope_missing",
        "A Graph recusou comentários. Refaça o login Instagram com instagram_manage_comments.",
      );
      break;
    }

    const cardMeta = await loadCardMeta(supabase, row.content_card_id);
    const excerpt = row.caption ? row.caption.slice(0, 180) : null;
    const comments: InstagramCommentV1[] = [...listed.items];
    for (const parent of listed.items) {
      try {
        const replies = await graph.listCommentReplies(target.accessToken, parent.id);
        comments.push(...replies);
      } catch {
        // replies are best-effort
      }
    }

    let fetchedHere = 0;
    const answeredPeople = new Set<string>();
    for (const comment of comments) {
      if (!comment.id) continue;
      const mapped = mapGraphCommentToSignal(comment, {
        igMediaId: row.id,
        mediaProductType: row.media_product_type,
        permalink: row.permalink,
        contentCardId: row.content_card_id,
        pilarTitulo: cardMeta.pilarTitulo,
        tema: cardMeta.tema,
        captionExcerpt: excerpt,
      });
      const author = { id: comment.from?.id, username: comment.username ?? comment.from?.username };
      if (isBrandAuthor(author, brand)) {
        const personId = await persistBrandReply(supabase, cadastroClienteId, comment, mapped);
        if (personId) answeredPeople.add(personId);
        continue;
      }
      if (shouldSkipComment(comment, null)) continue;
      const { identities, displayName } = identitiesFromComment(comment);
      if (identities.length === 0) continue;
      await persistCrmSignal(supabase, cadastroClienteId, mapped, identities, displayName);
      fetchedHere += 1;
      peopleTouched += 1;
    }
    for (const personId of answeredPeople) {
      await recomputeAndStoreStats(supabase, personId, cadastroClienteId);
    }
    commentsFetched += fetchedHere;

    await supabase.from("crm_ingest_cursors").upsert(
      {
        connection_id: target.connectionId,
        cadastro_cliente_id: cadastroClienteId,
        ig_media_id: row.ig_media_id,
        comments_fetched: fetchedHere,
        last_error: null,
        last_ran_at: new Date().toISOString(),
      },
      { onConflict: "connection_id,ig_media_id" },
    );
  }

  if (!scopeMissing) {
    await upsertCollector(
      supabase,
      cadastroClienteId,
      "comments",
      "live",
      media.length === 0
        ? "Nenhuma publicação recente com comentários no Hub."
        : `Última coleta: ${commentsFetched} comentário(s).`,
    );
  }

  return {
    ok: !scopeMissing,
    commentsFetched,
    peopleTouched,
    mediaScanned: media.length,
    scopeMissing,
    error: scopeMissing ? "scope_missing" : undefined,
  };
}

export async function syncAllCrmComments(supabase: SupabaseClient) {
  const connections = await listActivePluginConnections(supabase, "instagram_organic");
  const seen = new Set<number>();
  const results: { cadastroClienteId: number | null; result: CrmCommentsSyncResult }[] = [];
  for (const connection of connections) {
    if (connection.cadastroId == null || seen.has(connection.cadastroId)) continue;
    seen.add(connection.cadastroId);
    try {
      const result = await syncCrmCommentsForCadastro(supabase, connection.cadastroId);
      results.push({ cadastroClienteId: connection.cadastroId, result });
    } catch (err) {
      results.push({
        cadastroClienteId: connection.cadastroId,
        result: {
          ok: false,
          commentsFetched: 0,
          peopleTouched: 0,
          mediaScanned: 0,
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }
  const failed = results.filter((row) => !row.result.ok).length;
  return {
    total: results.length,
    succeeded: results.length - failed,
    failed,
    results,
  };
}

export { CRM_COLLECTOR_KEYS };
