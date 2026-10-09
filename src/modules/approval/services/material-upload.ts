/** Teto do app antes de recusar. O Storage do plano Free corta antes, em 50 MB. */
export const MATERIAL_MAX_BYTES = 5 * 1024 * 1024 * 1024;

/** Teto global do Storage no plano Free. O bucket pode dizer 5 GB; a plataforma não aceita. */
export const STORAGE_ALLOCATION_BYTES = 50 * 1000 * 1000;

/** Meta da redução, com folga para o arquivo passar no teto de 50 MB. */
export const STORAGE_FIT_TARGET_BYTES = 42 * 1000 * 1000;

export function exceedsStorageAllocation(size: number): boolean {
  return size > STORAGE_ALLOCATION_BYTES;
}

/** Máximo de originais do cliente por conteúdo, em um único envio. */
export const CLIENT_MATERIAL_MAX_FILES = 6;

export const MATERIAL_ACCEPT =
  "image/*,video/*,audio/*,.heic,.heif,.mov,.m4v,.mkv,.avi,.mpeg,.mpg,.3gp,.wav,.mp3,.aac,.m4a,.pdf";

/**
 * O que o seletor do celular deve receber. Extensões (`.mov`, `.heic`) junto de
 * `image/*` fazem o iOS abrir a galeria vazia.
 */
export const MATERIAL_PICKER_ACCEPT = "image/*,video/*,audio/*,application/pdf";

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
    throw new Error(
      "Arquivo vazio ou ainda na nuvem. Abra a foto ou o vídeo no celular para baixar e tente de novo.",
    );
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
  if (b.length >= 12 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    const brand = String.fromCharCode(b[8]!, b[9]!, b[10]!, b[11]!);
    if (brand === "qt  ") return "video/quicktime";
    if (
      brand.startsWith("hei") ||
      brand === "heic" ||
      brand === "heix" ||
      brand === "mif1" ||
      brand === "msf1"
    ) {
      return "image/heic";
    }
    return "video/mp4";
  }
  return null;
}

export async function resolveMaterialFile(
  file: File,
): Promise<{ file: File; mimeType: string; fileName: string }> {
  let mimeType = resolveUploadMime(file.name, file.type);
  if (mimeType === "application/octet-stream") {
    const sniffed = await sniffUploadMime(file);
    if (sniffed) mimeType = sniffed;
  }
  let name = file.name.trim() || "arquivo";
  if (!fileExtension(name) && mimeType !== "application/octet-stream") {
    const ext =
      Object.entries(EXT_MIME).find(([, m]) => m === mimeType)?.[0] ?? mimeType.split("/")[1];
    if (ext) name = `${name}.${ext}`;
  }
  name = name.slice(0, 180);
  assertAllowedMaterial(name, mimeType, file.size);
  // Não recria o File: no celular isso copia o vídeo inteiro e o Safari derruba o envio.
  return { file, mimeType, fileName: name };
}
