export const DIRETRIZES_BUCKET = "diretrizes-marca";
export const DIRETRIZES_MAX_BYTES = 50 * 1024 * 1024;
export const DIRETRIZES_SIGNED_TTL_SEC = 60 * 60;

export function diretrizesStoragePath(cadastroClienteId: number, fileId: string) {
  return `${cadastroClienteId}/${fileId}.pdf`;
}

export function assertPdfUpload(file: { name: string; type: string; size: number }) {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    throw new Error("Envie um arquivo PDF.");
  }
  if (file.size <= 0) {
    throw new Error("O arquivo está vazio.");
  }
  if (file.size > DIRETRIZES_MAX_BYTES) {
    throw new Error("O PDF pode ter no máximo 50 MB.");
  }
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
