import type { SupabaseClient } from "@supabase/supabase-js";
import { asConnectionId } from "../../../../contracts/connection/connection-id.v1";
import { createCredentialAccess } from "@/modules/platform-hub/plugins/_internal/oauth/credential-access.port";
import { YOUTUBE_OAUTH_CREDENTIAL_KEY } from "@/modules/platform-hub/plugins/youtube/youtube-credential-keys";
import { SupabaseCredentialVault } from "@/modules/platform-hub-bridges/ph-persistence/repositories/supabase-credential-vault";
import { contentCardAttachmentRepository } from "../repositories/content-card-attachment.repository.server";
import { contentCardEventRepository } from "../repositories/content-card-event.repository.server";
import { contentCardRepository } from "../repositories/content-card.repository.server";
import { createEditorialSignedUrl } from "../internal/attachment-lifecycle.server";
import { captionForCard } from "./build-instagram-publish-plan";
import { selectFinalVideo } from "./select-final-video";
import { uploadYouTubeVideo } from "./youtube-resumable-upload";

const URL_TTL_SECONDS = 60 * 30;

export async function publishYouTubeCard(supabase: SupabaseClient, cardId: string): Promise<void> {
  const card = await contentCardRepository.findById(supabase, cardId);
  if (!card) throw new Error("Card não encontrado");
  if (card.external_post_id) {
    if (card.publish_status !== "published") {
      await contentCardRepository.update(supabase, cardId, {
        publish_status: "published",
        status: "publicado",
        published_at: card.published_at ?? new Date().toISOString(),
        publish_error: null,
      });
    }
    return;
  }

  const attachments = await contentCardAttachmentRepository.listByCardId(supabase, cardId);
  const video = selectFinalVideo(attachments);
  if (!video) throw new Error("Anexe um vídeo final antes de publicar no YouTube.");

  const { data: connections, error } = await supabase
    .from("ph_connections")
    .select("id, status")
    .eq("cadastro_id", card.cadastro_cliente_id)
    .eq("plugin_key", "youtube")
    .order("updated_at", { ascending: false })
    .limit(8);
  if (error) throw new Error(error.message);
  const rows = (connections ?? []) as { id: string; status: string | null }[];
  const connection = rows.find((row) => row.status === "active") ?? rows[0];
  if (!connection) {
    throw new Error("Conecte o YouTube deste cliente em Conexões antes de publicar.");
  }

  const token = await createCredentialAccess(
    new SupabaseCredentialVault(supabase),
  ).retrieveOAuthToken(asConnectionId(connection.id), YOUTUBE_OAUTH_CREDENTIAL_KEY);
  if (!token?.accessToken) {
    throw new Error("Reconecte o YouTube em Conexões para obter permissão de upload.");
  }

  const signed = await createEditorialSignedUrl(video.storage_path, URL_TTL_SECONDS);
  const downloaded = await fetch(signed);
  if (!downloaded.ok) throw new Error("Não foi possível ler o vídeo anexado.");
  const bytes = new Uint8Array(await downloaded.arrayBuffer());
  const title = captionForCard(card.legenda, card.copy_text).trim() || "Publicação";
  const uploaded = await uploadYouTubeVideo({
    accessToken: token.accessToken,
    title,
    description: title,
    mimeType: video.mime_type || "video/mp4",
    bytes,
  });

  const publishedAt = new Date().toISOString();
  await contentCardRepository.update(supabase, cardId, {
    external_post_id: uploaded.videoId,
    publish_error: null,
    publish_attempted_at: publishedAt,
  });
  await contentCardRepository.update(supabase, cardId, {
    publish_status: "published",
    status: "publicado",
    published_at: publishedAt,
  });
  await contentCardEventRepository.append(supabase, {
    card_id: cardId,
    actor_id: null,
    actor_email: "system@lots",
    event_type: "publish_succeeded",
    payload: { external_post_id: uploaded.videoId, platform: "youtube" },
  });
}
