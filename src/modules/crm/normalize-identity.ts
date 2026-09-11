import type { CrmIdentityKind } from "./types";

export function normalizeUsername(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim().replace(/^@+/, "").toLowerCase();
  return value.length > 0 ? value : null;
}

export function normalizeIdentityValue(
  kind: CrmIdentityKind,
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (kind === "ig_username") return normalizeUsername(trimmed);
  if (kind === "email") return trimmed.toLowerCase();
  if (kind === "phone" || kind === "whatsapp") return trimmed.replace(/[^\d+]/g, "");
  return trimmed;
}
