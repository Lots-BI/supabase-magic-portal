/** Limite por arquivo — original, sem compressão. 5 GB. */
export const MATERIAL_MAX_BYTES = 5 * 1024 * 1024 * 1024;

export const MATERIAL_ACCEPT =
  "image/*,video/*,audio/*,.heic,.heif,.mov,.m4v,.mkv,.avi,.mpeg,.mpg,.3gp,.wav,.mp3,.aac,.m4a,.pdf";

const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  avif: "image/avif",
  tif: "image/tiff",
  tiff: "image/tiff",
  mp4: "video/mp4",
  m4v: "video/x-m4v",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  mpeg: "video/mpeg",
  mpg: "video/mpeg",
  "3gp": "video/3gpp",
  "3gpp": "video/3gpp",
  wav: "audio/wav",
  mp3: "audio/mpeg",
  aac: "audio/aac",
  m4a: "audio/mp4",
  pdf: "application/pdf",
};

const ALLOWED_EXT = new Set(Object.keys(EXT_MIME));

const MIME_ALIASES: Record<string, string> = {
  "image/x-png": "image/png",
  "image/png": "image/png",
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/x-jpeg": "image/jpeg",
  "image/heic-sequence": "image/heic",
  "video/x-quicktime": "video/quicktime",
  "application/x-pdf": "application/pdf",
};

export function fileExtension(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  if (i < 0) return "";
  return fileName.slice(i + 1).toLowerCase();
}

export function canonicalizeMime(mimeType: string): string {
  const raw = mimeType.trim().toLowerCase().split(";")[0]?.trim() ?? "";
  if (!raw || raw === "application/octet-stream" || raw === "binary/octet-stream") return "";
  return MIME_ALIASES[raw] ?? raw;
}

export function resolveUploadMime(fileName: string, mimeType: string): string {
  const fromName = EXT_MIME[fileExtension(fileName)];
  const fromBrowser = canonicalizeMime(mimeType);
  if (fromName) return fromName;
  if (fromBrowser) return fromBrowser;
  return "application/octet-stream";
}

export function assertAllowedMaterial(fileName: string, mimeType: string, size: number): void {
  if (!Number.isFinite(size) || size <= 0) {
    throw new Error("Arquivo vazio.");
  }
  if (size > MATERIAL_MAX_BYTES) {
    throw new Error("Arquivo acima de 5 GB. Envie em partes ou use outro arquivo.");
  }
  const ext = fileExtension(fileName);
  const mime = resolveUploadMime(fileName, mimeType);
  const mimeOk =
    mime.startsWith("image/") ||
    mime.startsWith("video/") ||
    mime.startsWith("audio/") ||
    mime === "application/pdf";
  if (!ALLOWED_EXT.has(ext) && !mimeOk) {
    throw new Error(
      "Formato não suportado. Envie foto, vídeo, áudio ou PDF (mp4, mov, mkv, jpg, png, heic, pdf…).",
    );
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** Lê a assinatura do arquivo quando o browser some com o MIME (download do Windows). */
export async function sniffUploadMime(file: File): Promise<string | null> {
  const buf = await file.slice(0, 16).arrayBuffer();
  const b = new Uint8Array(buf);
  if (b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return "image/png";
  }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 4 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) {
    return "image/gif";
  }
  if (b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) {
    return "application/pdf";
  }
  if (b.length >= 8 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    return "video/mp4";
  }
  return null;
}

export async function resolveMaterialFile(file: File): Promise<{ file: File; mimeType: string }> {
  let mimeType = resolveUploadMime(file.name, file.type);
  if (mimeType === "application/octet-stream") {
    const sniffed = await sniffUploadMime(file);
    if (sniffed) mimeType = sniffed;
  }
  let name = file.name || "arquivo";
  if (!fileExtension(name) && mimeType !== "application/octet-stream") {
    const ext =
      Object.entries(EXT_MIME).find(([, m]) => m === mimeType)?.[0] ?? mimeType.split("/")[1];
    name = `${name}.${ext}`;
  }
  assertAllowedMaterial(name, mimeType, file.size);
  return {
    file: new File([file], name, { type: mimeType, lastModified: file.lastModified }),
    mimeType,
  };
}
