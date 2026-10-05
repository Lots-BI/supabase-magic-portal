export type PublishPlatform = "instagram" | "tiktok" | "youtube";

export function resolvePublishPlatform(value: string | null | undefined): PublishPlatform | null {
  const key = (value ?? "").trim().toLowerCase();
  if (key === "instagram" || key === "instagram_organic") return "instagram";
  if (key === "tiktok") return "tiktok";
  if (key === "youtube") return "youtube";
  return null;
}

export function publishPlatformError(value: string | null | undefined): string {
  const raw = (value ?? "").trim() || "vazia";
  return `Esta plataforma não publica por aqui (${raw}). Use Instagram, TikTok ou YouTube.`;
}
