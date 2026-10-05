export function selectFinalVideo<
  T extends { media_role: string; mime_type: string; kind: string; ordem: number },
>(attachments: readonly T[]): T | null {
  const finals = attachments
    .filter((item) => item.media_role === "final")
    .sort((a, b) => a.ordem - b.ordem);
  return (
    finals.find((item) => item.kind === "video" || item.mime_type.startsWith("video/")) ?? null
  );
}
