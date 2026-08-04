import type { SupabaseClient } from "@supabase/supabase-js";
import { asConnectionId } from "../../../../contracts/connection/connection-id.v1";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { createAdminHubStack } from "@/modules/platform-hub-bridges/ph-persistence";
import { META_OAUTH_CREDENTIAL_KEY } from "@/modules/platform-hub/plugins/meta_ads/meta-credential-keys";
import { createCredentialAccess } from "@/modules/platform-hub/plugins/_internal/oauth/credential-access.port";
import { contentCardRepository } from "../repositories/content-card.repository.server";
import { contentCardAttachmentRepository } from "../repositories/content-card-attachment.repository.server";
import type { ContentCard } from "../types/content-card";
import type { LifecycleActor } from "./card-lifecycle.server";
import { moveContentCard } from "./card-lifecycle.server";
import { assertCardAction } from "../permissions/resolve-card-action";
import {
  facebookPostPermalink,
  fetchManagedPagesWithTokens,
  pickPageAccessToken,
  publishPagePhotoMultipart,
} from "../integrations/meta/meta-page-graph";
import {
  assertFacebookPublishTarget,
  isMetaLivePublishPlatform,
  mergeMetaPublishMetadata,
  resolvePublishCaption,
} from "../integrations/meta/meta-publish-helpers";
import type { PublishResult, PublishTarget } from "../integrations/ports";

const EDITORIAL_BUCKET = "editorial-media";

export type MetaLivePublishResult = {
  card: ContentCard;
  publish: PublishResult;
  pageId: string;
  connectionId: string;
};

async function loadPublishImage(
  supabase: SupabaseClient,
  card: ContentCard,
): Promise<{ bytes: ArrayBuffer; mimeType: string; fileName: string }> {
  const attachments = await contentCardAttachmentRepository.listByCardId(supabase, card.id);
  const image = attachments.find((a) => a.kind === "image");

  if (image) {
    const { data, error } = await supabase.storage
      .from(EDITORIAL_BUCKET)
      .download(image.storage_path);
    if (error || !data) {
      throw new Error(error?.message ?? "Não foi possível baixar a imagem do storage");
    }
    return {
      bytes: await data.arrayBuffer(),
      mimeType: image.mime_type || "image/jpeg",
      fileName: image.storage_path.split("/").pop() ?? "photo.jpg",
    };
  }

  if (card.capa_url?.trim()) {
    const response = await fetch(card.capa_url.trim());
    if (!response.ok) {
      throw new Error(`Falha ao baixar capa_url (HTTP ${response.status})`);
    }
    const mimeType = response.headers.get("content-type") || "image/jpeg";
    if (!mimeType.startsWith("image/")) {
      throw new Error("capa_url não é uma imagem");
    }
    return {
      bytes: await response.arrayBuffer(),
      mimeType,
      fileName: "capa.jpg",
    };
  }

  throw new Error(
    "Publique no Facebook exige uma imagem anexada (Arquivos) ou capa_url no card.",
  );
}

/**
 * Publica foto na Facebook Page do Hub (Official API) e move o card para `publicado`.
 * Requer OAuth Meta com `pages_manage_posts` e identity `page` na conexão do cliente.
 */
export async function publishContentCardToMetaFacebook(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  input: { cardId: string; target?: PublishTarget },
): Promise<MetaLivePublishResult> {
  assertCardAction({ role: actor.role, action: "move" });
  const target = input.target ?? "facebook";
  assertFacebookPublishTarget(target);

  const card = await contentCardRepository.findById(supabase, input.cardId);
  if (!card) throw new Error("Card não encontrado");

  if (card.status !== "aprovado") {
    throw new Error('Só é possível publicar na Meta a partir do status "Aprovado".');
  }
  if (!isMetaLivePublishPlatform(card.plataforma)) {
    throw new Error(
      `Plataforma do card é "${card.plataforma}". Para publish live, use Facebook.`,
    );
  }

  const existingMeta = card.integration_metadata?.meta_publish;
  if (existingMeta && typeof existingMeta === "object") {
    throw new Error("Este card já possui publicação Meta registrada. Evite republicar.");
  }

  const hub = await createAdminHubStack(getSupabaseAdmin());
  const connections = await hub.adminQueries.listConnections({
    cadastroId: card.cadastro_cliente_id,
    pluginKey: "meta_ads",
  });
  const connection = connections.find(
    (c) => c.status === "active" && c.activeProviderType === "official_api",
  );
  if (!connection) {
    throw new Error(
      "Nenhuma conexão Meta Official ativa para este cliente. Conecte em /admin/conexoes.",
    );
  }

  const connectionId = asConnectionId(connection.id);
  const identities = await hub.identityService.list(connectionId);
  const pageIdentity =
    identities.find((i) => i.identityType === "page" && i.isPrimary) ??
    identities.find((i) => i.identityType === "page");
  if (!pageIdentity) {
    throw new Error(
      "Conexão Meta sem identidade Page. Anexe a Page em /admin/conexoes e reconecte OAuth se necessário.",
    );
  }

  const credentialAccess = createCredentialAccess(hub.credentialVault);
  const oauth = await credentialAccess.retrieveOAuthToken(
    connectionId,
    META_OAUTH_CREDENTIAL_KEY,
  );
  if (!oauth?.accessToken) {
    throw new Error("Token OAuth Meta ausente. Reconecte OAuth na conexão do Hub.");
  }

  const pages = await fetchManagedPagesWithTokens(oauth.accessToken);
  const pageAccessToken = pickPageAccessToken(pages, pageIdentity.externalId);
  if (!pageAccessToken) {
    throw new Error(
      `Page ${pageIdentity.externalId} sem access_token. Reconecte OAuth com scopes pages_manage_posts / pages_show_list.`,
    );
  }

  const image = await loadPublishImage(supabase, card);
  const caption = resolvePublishCaption(card);
  const graphResult = await publishPagePhotoMultipart({
    pageId: pageIdentity.externalId,
    pageAccessToken,
    imageBytes: image.bytes,
    mimeType: image.mimeType,
    fileName: image.fileName,
    caption,
  });

  const publishedAt = new Date().toISOString();
  const externalId = graphResult.postId ?? graphResult.photoId;
  const url = facebookPostPermalink(pageIdentity.externalId, graphResult.postId);
  const publish: PublishResult = { externalId, publishedAt, url };

  const metadata = mergeMetaPublishMetadata(card.integration_metadata ?? {}, {
    ...publish,
    pageId: pageIdentity.externalId,
    photoId: graphResult.photoId,
    connectionId: connection.id,
  });

  await contentCardRepository.update(supabase, card.id, {
    integration_metadata: metadata,
  });

  const moved = await moveContentCard(supabase, actor, {
    id: card.id,
    status: "publicado",
    kanban_ordem: card.kanban_ordem,
  });

  return {
    card: moved,
    publish,
    pageId: pageIdentity.externalId,
    connectionId: connection.id,
  };
}
