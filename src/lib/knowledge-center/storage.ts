const FAVORITES_KEY = "lots-knowledge-favorites";
const RECENT_KEY = "lots-knowledge-recent";
const MAX_RECENT = 12;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded — ignore */
  }
}

export function getFavorites(): string[] {
  return readJson<string[]>(FAVORITES_KEY, []);
}

export function isFavorite(slug: string): boolean {
  return getFavorites().includes(slug);
}

export function toggleFavorite(slug: string): string[] {
  const current = getFavorites();
  const next = current.includes(slug) ? current.filter((s) => s !== slug) : [slug, ...current];
  writeJson(FAVORITES_KEY, next);
  return next;
}

export function getRecent(): string[] {
  return readJson<string[]>(RECENT_KEY, []);
}

export function trackRecent(slug: string): string[] {
  const prev = getRecent().filter((s) => s !== slug);
  const next = [slug, ...prev].slice(0, MAX_RECENT);
  writeJson(RECENT_KEY, next);
  return next;
}
