/** Nome da pasta do conteúdo: `07/10 — Reels bastidores do evento`. */
export function cardLibraryFolderName(dataPublicacao: string, titulo: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dataPublicacao.trim());
  const datePart = match ? `${match[3]}/${match[2]}` : dataPublicacao.trim() || "sem-data";
  const title = titulo.trim() || "Sem título";
  return `${datePart} — ${title}`.slice(0, 120);
}
