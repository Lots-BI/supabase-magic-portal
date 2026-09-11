import * as tus from "tus-js-client";
import { getSupabaseConfig, supabase } from "@/integrations/supabase/client";
import { formatBytes, resolveMaterialFile } from "../services/material-upload";

export const EDITORIAL_MEDIA_BUCKET = "editorial-media";
/** TUS no Storage exige chunks de 6 MB. */
export const TUS_CHUNK_BYTES = 6 * 1024 * 1024;
/** Abaixo disso o PUT assinado é mais simples e rápido. */
export const SIGNED_PUT_MAX_BYTES = TUS_CHUNK_BYTES;

export type MaterialUploadTicket = {
  path: string;
  token: string;
  signedUrl?: string;
  mimeType: string;
};

export function storageTusEndpoint(supabaseUrl: string): string {
  const trimmed = supabaseUrl.replace(/\/$/, "");
  try {
    const u = new URL(trimmed);
    if (u.hostname.endsWith(".supabase.co") && !u.hostname.includes("storage.supabase.co")) {
      const host = u.hostname.replace(".supabase.co", ".storage.supabase.co");
      return `${u.protocol}//${host}/storage/v1/upload/resumable`;
    }
  } catch {
    /* fallback abaixo */
  }
  return `${trimmed}/storage/v1/upload/resumable`;
}

export function resolveSignedUploadUrl(signedUrl: string, supabaseUrl: string, token: string): string {
  const base = signedUrl.startsWith("http")
    ? signedUrl
    : `${supabaseUrl.replace(/\/$/, "")}${signedUrl.startsWith("/") ? "" : "/"}${signedUrl}`;
  const url = new URL(base);
  if (!url.searchParams.get("token") && token) url.searchParams.set("token", token);
  return url.toString();
}

export function mapStorageError(message: string): string {
  const extracted = extractStorageMessage(message);
  const m = extracted.toLowerCase();
  if (
    m.includes("maximum size") ||
    m.includes("allowed size") ||
    m.includes("payload too large") ||
    m.includes("maximum allowed size") ||
    /\b413\b/.test(m)
  ) {
    return "Este arquivo passou do limite global do Storage. No plano Free o teto é 50 MB; a agência pode subir isso em Storage → Settings.";
  }
  if (m.includes("row-level") || m.includes("unauthorized") || m.includes("42501")) {
    return "Sem permissão para enviar este arquivo. Recarregue a página e tente outra vez.";
  }
  if (m.includes("mime type") || m.includes("not a supported mime") || m.includes("invalid mime")) {
    return "Este formato não foi aceito. Envie mp4, mov, mkv, jpg, png, heic ou pdf.";
  }
  if (m.includes("jwt") || m.includes("signature") || m.includes("expired token")) {
    return "O envio expirou. Toque em enviar de novo.";
  }
  if (m.includes("network") || m.includes("failed to fetch") || m.includes("load failed")) {
    return "A conexão caiu no meio do envio. Toque em tentar de novo — o progresso é retomado.";
  }
  return extracted || message;
}

function extractStorageMessage(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) return trimmed;
  try {
    const parsed = JSON.parse(trimmed) as { message?: string; error?: string };
    return parsed.message || parsed.error || trimmed;
  } catch {
    return trimmed;
  }
}

function requireConfig() {
  const cfg = getSupabaseConfig();
  if (!cfg?.url || !cfg.anonKey) {
    throw new Error("Armazenamento ainda não está pronto. Recarregue a página.");
  }
  return cfg;
}

async function accessToken(): Promise<string> {
  const cfg = requireConfig();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || cfg.anonKey;
}

async function uploadViaSignedPut(
  ticket: MaterialUploadTicket,
  file: File,
  mimeType: string,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (!ticket.token) {
    throw new Error("Ticket de envio inválido. Recarregue e tente de novo.");
  }
  if (signal?.aborted) throw new Error("Envio cancelado.");
  onProgress?.(20);
  const { error } = await supabase.storage.from(EDITORIAL_MEDIA_BUCKET).uploadToSignedUrl(
    ticket.path,
    ticket.token,
    file,
    { contentType: mimeType },
  );
  if (error) throw new Error(mapStorageError(error.message));
  onProgress?.(100);
}

function uploadViaTus(
  ticket: MaterialUploadTicket,
  file: File,
  mimeType: string,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  const cfg = requireConfig();
  if (!ticket.token) {
    throw new Error("Ticket de envio inválido. Recarregue e tente de novo.");
  }

  return new Promise((resolve, reject) => {
    let upload: tus.Upload | null = null;

    const fail = (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      reject(new Error(mapStorageError(msg)));
    };

    void accessToken().then((token) => {
      upload = new tus.Upload(file, {
        endpoint: storageTusEndpoint(cfg.url),
        retryDelays: [0, 2000, 5000, 10000, 20000],
        headers: {
          authorization: `Bearer ${token}`,
          apikey: cfg.anonKey,
          "x-upsert": "true",
          "x-signature": ticket.token,
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        chunkSize: TUS_CHUNK_BYTES,
        metadata: {
          bucketName: EDITORIAL_MEDIA_BUCKET,
          objectName: ticket.path,
          contentType: mimeType || file.type || "application/octet-stream",
          cacheControl: "3600",
        },
        onError: fail,
        onProgress(bytesUploaded, bytesTotal) {
          if (bytesTotal > 0) {
            onProgress?.(Math.min(99, Math.round((bytesUploaded / bytesTotal) * 100)));
          }
        },
        onSuccess() {
          onProgress?.(100);
          resolve();
        },
      });

      if (signal) {
        if (signal.aborted) {
          fail(new Error("Envio cancelado."));
          return;
        }
        signal.addEventListener(
          "abort",
          () => {
            void upload?.abort(true);
            fail(new Error("Envio cancelado."));
          },
          { once: true },
        );
      }

      void upload.findPreviousUploads().then((previous) => {
        if (previous[0]) upload?.resumeFromPreviousUpload(previous[0]);
        upload?.start();
      }, fail);
    }, fail);
  });
}

/** Envia o original com progresso. Arquivos grandes vão em partes de 6 MB (TUS + token assinado). */
export async function uploadMaterialBytes(input: {
  ticket: MaterialUploadTicket;
  file: File;
  onProgress?: (pct: number) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const mimeType = input.ticket.mimeType || input.file.type || "application/octet-stream";
  input.onProgress?.(1);
  if (input.file.size < SIGNED_PUT_MAX_BYTES) {
    await uploadViaSignedPut(input.ticket, input.file, mimeType, input.onProgress, input.signal);
    return;
  }
  await uploadViaTus(input.ticket, input.file, mimeType, input.onProgress, input.signal);
}

/** @deprecated Prefer uploadMaterialBytes — mantido para chamadas antigas. */
export async function uploadOriginalToSignedUrl(
  path: string,
  token: string,
  file: File,
  mimeType: string,
): Promise<void> {
  await uploadMaterialBytes({
    ticket: { path, token, mimeType },
    file,
  });
}

export async function validateMaterialFile(file: File): Promise<{ file: File; mimeType: string }> {
  return resolveMaterialFile(file);
}

export function uploadHint(file: File): string {
  if (file.size >= SIGNED_PUT_MAX_BYTES) {
    return `${formatBytes(file.size)} · envio em partes, pode retomar se a rede cair`;
  }
  return formatBytes(file.size);
}
