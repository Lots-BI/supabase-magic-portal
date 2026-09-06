import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { FetchHttpClient } from "@/modules/platform-hub/plugins/_internal/http/fetch-http-client";
import { InstagramGraphClient } from "@/modules/platform-hub/plugins/instagram_organic/api/instagram-graph-client";
import type { ContentPublisherPort, PublishResult } from "./ports";
import { contentCardRepository } from "../repositories/content-card.repository.server";
import { contentCardAttachmentRepository } from "../repositories/content-card-attachment.repository.server";
import { contentCardEventRepository } from "../repositories/content-card-event.repository.server";
import { createEditorialSignedUrl } from "../internal/attachment-lifecycle.server";
import {
  buildInstagramPublishPlan,
  captionForCard,
} from "./build-instagram-publish-plan";
import {
  executeInstagramPublishPlan,
  formatInstagramPublishError,
  type InstagramPublishGraphPort,
  type InstagramPublishTarget,
} from "./execute-instagram-publish";
import { resolveInstagramPublishTarget } from "./resolve-instagram-publish-target.server";

const PUBLISH_URL_TTL_SECONDS = 6 * 60 * 60;

export type PublishCardDeps = {
  db?: SupabaseClient;
  resolveTarget?: (
    supabase: SupabaseClient,
    cadastroClienteId: number,
  ) => Promise<InstagramPublishTarget>;
  signUrl?: (path: string) => Promise<string>;
  graph?: InstagramPublishGraphPort;
  now?: () => Date;
};

function defaultGraph(): InstagramPublishGraphPort {
  return new InstagramGraphClient({ httpClient: new FetchHttpClient() });
}

/**
 * Publisher Instagram — Content Publishing API.
 * Sem conexão/token: fail-soft com missing_connection / missing_publish_scope.
 * Instagram não agenda nativamente: o job publica no horário do card.
 */
export class MetaInstagramPublisher implements ContentPublisherPort {
  async publishNow(cardId: string): Promise<PublishResult> {
    return publishCardWithClient(getSupabaseAdmin(), cardId);
  }

  async schedule(_cardId: string, _scheduledAt: string): Promise<void> {
    return;
  }

  async cancel(_cardId: string): Promise<void> {
    return;
  }

  async getStatus(cardId: string) {
    const card = await contentCardRepository.findById(getSupabaseAdmin(), cardId);
    return {
      publish_status: card?.publish_status ?? "none",
      externalId: card?.external_post_id ?? undefined,
      error: card?.publish_error ?? undefined,
    };
  }
}

export async function publishCardWithClient(
  supabase: SupabaseClient,
  cardId: string,
  deps: PublishCardDeps = {},
): Promise<PublishResult> {
  const db = deps.db ?? supabase;
  const now = () => (deps.now ? deps.now() : new Date());
  const card = await contentCardRepository.findById(db, cardId);
  if (!card) throw new Error("Card não encontrado");

  if (card.publish_status === "published" && card.external_post_id) {
    return {
      externalId: card.external_post_id,
      publishedAt: card.published_at ?? now().toISOString(),
    };
  }

  const finals = (await contentCardAttachmentRepository.listByCardId(db, cardId))
    .filter((a) => a.media_role === "final")
    .sort((a, b) => a.ordem - b.ordem);

  if (finals.length === 0) {
    throw new Error("Anexe a mídia final antes de publicar.");
  }

  const attemptedAt = now().toISOString();
  await contentCardRepository.update(db, cardId, {
    publish_status: "publishing",
    publish_attempted_at: attemptedAt,
    publish_error: null,
  });

  try {
    const target = await (deps.resolveTarget ?? resolveInstagramPublishTarget)(
      db,
      card.cadastro_cliente_id,
    );
    const signUrl = deps.signUrl ?? ((path: string) => createEditorialSignedUrl(path, PUBLISH_URL_TTL_SECONDS));
    const media = await Promise.all(
      finals.map(async (attachment) => ({
        url: await signUrl(attachment.storage_path),
        kind: attachment.kind,
        mime_type: attachment.mime_type,
      })),
    );
    const plan = buildInstagramPublishPlan(
      card.formato,
      captionForCard(card.legenda, card.copy_text),
      media,
    );
    const graph = deps.graph ?? defaultGraph();
    const published = await executeInstagramPublishPlan({ graph, target, plan });
    const publishedAt = now().toISOString();

    // Grava o ID antes do status: se o guard do banco barrar "publicado",
    // o próximo retry não cria outro post no Instagram.
    await contentCardRepository.update(db, cardId, {
      publish_status: "published",
      publish_container_id: published.containerId,
      external_post_id: published.mediaId,
      publish_error: null,
      publish_attempted_at: publishedAt,
    });
    await contentCardRepository.update(db, cardId, {
      status: "publicado",
      published_at: publishedAt,
      integration_metadata: {
        ...card.integration_metadata,
        ...(published.permalink ? { instagram_permalink: published.permalink } : {}),
      },
    });
    await contentCardEventRepository.append(db, {
      card_id: cardId,
      actor_id: null,
      actor_email: "system@lots",
      event_type: "publish_succeeded",
      payload: {
        external_post_id: published.mediaId,
        container_id: published.containerId,
        permalink: published.permalink ?? null,
      },
    });

    return {
      externalId: published.mediaId,
      publishedAt,
      url: published.permalink,
    };
  } catch (error) {
    const latest = await contentCardRepository.findById(db, cardId);
    if (latest?.external_post_id) {
      throw new Error(
        "Post criado no Instagram, mas o Lots não concluiu o status. Não publique de novo neste card.",
      );
    }
    const msg = formatInstagramPublishError(error);
    await contentCardRepository.update(db, cardId, {
      publish_status: "failed",
      publish_error: msg,
      publish_attempted_at: now().toISOString(),
    });
    await contentCardEventRepository.append(db, {
      card_id: cardId,
      actor_id: null,
      actor_email: "system@lots",
      event_type: "publish_failed",
      payload: { error: msg },
    });
    throw new Error(msg);
  }
}
