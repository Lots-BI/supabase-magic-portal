import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { contentCardAttachmentRepository } from "../repositories/content-card-attachment.repository.server";
import { contentCardEventRepository } from "../repositories/content-card-event.repository.server";
import { contentCardRepository } from "../repositories/content-card.repository.server";
import type { AttachmentKind } from "../types/content-card-attachment";
import type { LifecycleActor } from "./card-lifecycle.server";
import { capaUrlToAsset, type MediaAsset } from "@/lib/media-preview";
import { assertCardAction } from "../permissions/resolve-card-action";
import { assertCardInClientAccess } from "./client-access.server";
import {
  assertAllowedMaterial,
  resolveUploadMime,
} from "../services/material-upload";
import { persistMediaRole, resolveUploadMediaRole } from "../services/resolve-media-role";

const EDITORIAL_BUCKET = "editorial-media";
const SIGNED_URL_TTL = 3600;
export const PUBLISH_SIGNED_URL_TTL = 6 * 60 * 60;

function storageAdmin(): SupabaseClient {
  return getSupabaseAdmin();
}

export function inferAttachmentKind(mime: string): AttachmentKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf") return "pdf";
  return "document";
}

async function waitForStoredObject(path: string): Promise<boolean> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await storageAdmin()
      .storage.from(EDITORIAL_BUCKET)
      .createSignedUrl(path, 30);
    if (!error && data?.signedUrl) return true;
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }
  return false;
}

async function signedUrlFor(
  path: string,
  opts?: { download?: string; ttl?: number },
): Promise<string> {
  const { data, error } = await storageAdmin()
    .storage.from(EDITORIAL_BUCKET)
    .createSignedUrl(path, opts?.ttl ?? SIGNED_URL_TTL, opts?.download ? { download: opts.download } : undefined);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "URL de mídia indisponível");
  return data.signedUrl;
}

export async function createEditorialSignedUrl(
  path: string,
  ttlSeconds = PUBLISH_SIGNED_URL_TTL,
): Promise<string> {
  return signedUrlFor(path, { ttl: ttlSeconds });
}

async function assertActorCanUploadCard(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  cardId: string,
  role: "preview" | "attachment" | "cliente_material" | "final",
) {
  if (role === "cliente_material") {
    assertCardAction({ role: actor.role, action: "upload_material" });
  } else if (role === "final") {
    assertCardAction({ role: actor.role, action: "upload_final" });
  } else {
    assertCardAction({ role: actor.role, action: "edit" });
  }
  if (actor.role === "cliente" && role !== "cliente_material") {
    throw new Error(
      "Cliente só pode enviar o material original. A peça final é enviada pela agência.",
    );
  }
  const card = await contentCardRepository.findById(supabase, cardId);
  if (!card) throw new Error("Card não encontrado");
  if (actor.role === "cliente") {
    await assertCardInClientAccess(supabase, actor.userId, card.cadastro_cliente_id);
    if (card.status !== "aguardando_aprovacao" && card.status !== "aguardando_material") {
      throw new Error("Envie as mídias quando o roteiro estiver com você para aprovação.");
    }
  }
}

export async function listCardAttachmentsWithUrls(
  supabase: SupabaseClient,
  cardId: string,
  capaUrl: string | null,
): Promise<MediaAsset[]> {
  const rows = await contentCardAttachmentRepository.listByCardId(supabase, cardId);
  if (rows.length === 0) return capaUrlToAsset(capaUrl);

  const assets: MediaAsset[] = [];
  for (const row of rows) {
    assets.push(await attachmentToMediaAsset(row));
  }
  return assets;
}

export async function attachmentToMediaAsset(
  row: import("../types/content-card-attachment").ContentCardAttachment,
): Promise<MediaAsset> {
  const fileName = row.file_name ?? row.storage_path.split("/").pop() ?? "arquivo";
  const [url, downloadUrl] = await Promise.all([
    signedUrlFor(row.storage_path),
    signedUrlFor(row.storage_path, { download: fileName }),
  ]);
  const posterUrl = row.poster_path ? await signedUrlFor(row.poster_path) : null;
  return {
    id: row.id,
    kind: row.kind === "video" ? "video" : "image",
    url,
    downloadUrl,
    fileName,
    fileSize: row.file_size,
    posterUrl,
    mimeType: row.mime_type,
    ordem: row.ordem,
    mediaRole: row.media_role,
  };
}

export async function createDirectUploadTicket(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  input: {
    cardId: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    mediaRole?: "preview" | "attachment" | "cliente_material" | "final";
  },
) {
  const role = resolveUploadMediaRole(actor.role, input.mediaRole);
  await assertActorCanUploadCard(supabase, actor, input.cardId, role);
  assertAllowedMaterial(input.fileName, input.mimeType, input.fileSize);
  const mimeType = resolveUploadMime(input.fileName, input.mimeType);
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `content-cards/${input.cardId}/${Date.now()}-${safeName}`;

  const { data, error } = await storageAdmin()
    .storage.from(EDITORIAL_BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: true });
  if (error || !data?.token) {
    throw new Error(error?.message ?? "Não foi possível preparar o envio. Tente de novo.");
  }

  return {
    path: data.path,
    token: data.token,
    signedUrl: data.signedUrl,
    mimeType,
    mediaRole: role,
  };
}

export async function confirmDirectUpload(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  input: {
    cardId: string;
    path: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    mediaRole?: "preview" | "attachment" | "cliente_material" | "final";
  },
) {
  const role = resolveUploadMediaRole(actor.role, input.mediaRole);
  await assertActorCanUploadCard(supabase, actor, input.cardId, role);
  const expectedPrefix = `content-cards/${input.cardId}/`;
  if (!input.path.startsWith(expectedPrefix)) {
    throw new Error("Caminho de arquivo inválido.");
  }

  const stored = await waitForStoredObject(input.path);
  if (!stored) {
    throw new Error("Arquivo não encontrado no armazenamento. Tente enviar de novo.");
  }

  const mimeType = resolveUploadMime(input.fileName, input.mimeType);
  const existing = await contentCardAttachmentRepository.listByCardId(storageAdmin(), input.cardId);
  const ordem = existing.length;
  const kind = inferAttachmentKind(mimeType);

  const attachment = await contentCardAttachmentRepository.insert(storageAdmin(), {
    card_id: input.cardId,
    storage_path: input.path,
    mime_type: mimeType,
    kind,
    media_role: persistMediaRole(role, ordem),
    file_name: input.fileName,
    file_size: input.fileSize,
    ordem,
    width: null,
    height: null,
    duration_seconds: null,
    poster_path: null,
    legacy_media_id: null,
  });

  await contentCardEventRepository.append(storageAdmin(), {
    card_id: input.cardId,
    actor_id: actor.userId,
    actor_email: actor.email,
    event_type: "attachment_added",
    payload: {
      attachment_id: attachment.id,
      file_name: input.fileName,
      kind,
      media_role: attachment.media_role,
      file_size: input.fileSize,
    },
  });

  const url = await signedUrlFor(input.path);
  const downloadUrl = await signedUrlFor(input.path, { download: input.fileName });
  return { attachment, url, downloadUrl };
}

export async function uploadCardAttachment(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  input: {
    cardId: string;
    fileName: string;
    mimeType: string;
    base64: string;
    ordem?: number;
    mediaRole?: "preview" | "attachment" | "cliente_material" | "final";
  },
) {
  const role = resolveUploadMediaRole(actor.role, input.mediaRole);
  if (role === "cliente_material") {
    assertCardAction({ role: actor.role, action: "upload_material" });
  } else if (role === "final") {
    assertCardAction({ role: actor.role, action: "upload_final" });
  } else {
    assertCardAction({ role: actor.role, action: "edit" });
  }
  if (actor.role === "cliente" && role !== "cliente_material") {
    throw new Error(
      "Cliente só pode enviar o material original. A peça final é enviada pela agência.",
    );
  }

  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `content-cards/${input.cardId}/${Date.now()}-${safeName}`;
  const bytes = Uint8Array.from(atob(input.base64), (c) => c.charCodeAt(0));

  const { error: upErr } = await storageAdmin()
    .storage.from(EDITORIAL_BUCKET)
    .upload(storagePath, bytes, { contentType: input.mimeType, upsert: false });
  if (upErr) throw new Error(upErr.message);

  const existing = await contentCardAttachmentRepository.listByCardId(supabase, input.cardId);
  const ordem = input.ordem ?? existing.length;
  const kind = inferAttachmentKind(input.mimeType);

  const attachment = await contentCardAttachmentRepository.insert(storageAdmin(), {
    card_id: input.cardId,
    storage_path: storagePath,
    mime_type: input.mimeType,
    kind,
    media_role: persistMediaRole(role, ordem),
    file_name: input.fileName,
    file_size: bytes.byteLength,
    ordem,
    width: null,
    height: null,
    duration_seconds: null,
    poster_path: null,
    legacy_media_id: null,
  });

  await contentCardEventRepository.append(supabase, {
    card_id: input.cardId,
    actor_id: actor.userId,
    actor_email: actor.email,
    event_type: "attachment_added",
    payload: {
      attachment_id: attachment.id,
      file_name: input.fileName,
      kind,
      media_role: attachment.media_role,
    },
  });

  const url = await signedUrlFor(storagePath);
  return { attachment, url };
}

export async function deleteCardAttachment(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  input: { cardId: string; attachmentId: string },
) {
  assertCardAction({ role: actor.role, action: "edit" });
  const rows = await contentCardAttachmentRepository.listByCardId(supabase, input.cardId);
  const row = rows.find((r) => r.id === input.attachmentId);
  if (!row) throw new Error("Anexo não encontrado");

  await storageAdmin().storage.from(EDITORIAL_BUCKET).remove([row.storage_path]);
  if (row.poster_path) {
    await storageAdmin().storage.from(EDITORIAL_BUCKET).remove([row.poster_path]);
  }
  await contentCardAttachmentRepository.deleteById(storageAdmin(), input.attachmentId);

  await contentCardEventRepository.append(supabase, {
    card_id: input.cardId,
    actor_id: actor.userId,
    actor_email: actor.email,
    event_type: "attachment_removed",
    payload: { attachment_id: input.attachmentId, file_name: row.file_name },
  });
  return { ok: true };
}
