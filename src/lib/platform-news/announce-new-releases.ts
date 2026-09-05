/**
 * Avisa clientes sobre novidades ainda não vistas.
 * - Sempre: notificação in-app (sino).
 * - Se o browser já tiver permissão de notificação ("notificações ativadas"):
 *   dispara Notification nativa apontando para /novidades.
 */
import { listPlatformReleases } from "@/lib/platform-news";
import { listNotifications, pushNotification } from "@/lib/notifications";

const SEEN_KEY = "lots-bi-seen-platform-releases";
const ANNOUNCED_KEY = "lots-bi-announced-platform-releases";

function readIdSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? new Set(parsed.filter((x) => typeof x === "string")) : new Set();
  } catch {
    return new Set();
  }
}

function writeIdSet(key: string, ids: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify([...ids]));
}

export function markPlatformReleasesSeen(ids: readonly string[]) {
  const seen = readIdSet(SEEN_KEY);
  for (const id of ids) seen.add(id);
  writeIdSet(SEEN_KEY, seen);
}

export function markAllClientReleasesSeen() {
  const ids = listPlatformReleases("client").map((r) => r.id);
  markPlatformReleasesSeen(ids);
}

function pushNewsNotification(id: string, title: string, body: string) {
  const already = listNotifications().some((n) => n.id === id);
  if (already) return;
  pushNotification({
    id,
    kind: "alerta",
    title,
    body,
    href: "/novidades",
  });
}

/**
 * Emite avisos para releases client-facing ainda não anunciadas nesta sessão/browser.
 * Idempotente por release id (localStorage).
 */
export function announceUnseenPlatformReleases(): number {
  if (typeof window === "undefined") return 0;

  const releases = listPlatformReleases("client");
  if (releases.length === 0) return 0;

  const announced = readIdSet(ANNOUNCED_KEY);
  const unseen = releases.filter((r) => !announced.has(r.id));
  if (unseen.length === 0) return 0;

  // Primeira visita: marca como anunciado sem spam de todo o histórico.
  if (announced.size === 0) {
    writeIdSet(ANNOUNCED_KEY, new Set(releases.map((r) => r.id)));
    const latest = releases[0];
    pushNewsNotification(
      `platform-news-${latest.id}`,
      "Há novidades na plataforma",
      latest.title,
    );
    maybeNativeNotify(latest.title, latest.summary);
    return 1;
  }

  // Só as mais recentes (topo da lista) que ainda não foram anunciadas.
  const fresh = unseen.filter((r) => releases.findIndex((x) => x.id === r.id) < 5);
  for (const release of fresh.slice(0, 3)) {
    pushNewsNotification(`platform-news-${release.id}`, "Nova novidade disponível", release.title);
    maybeNativeNotify(release.title, release.summary);
    announced.add(release.id);
  }

  // Releases antigas não anunciadas: marca sem notificar.
  for (const release of unseen) announced.add(release.id);
  writeIdSet(ANNOUNCED_KEY, announced);
  return fresh.slice(0, 3).length;
}

function maybeNativeNotify(title: string, body?: string) {
  if (typeof window === "undefined" || typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(`Lots BI — ${title}`, {
      body: body?.slice(0, 140),
      tag: "lots-bi-platform-news",
    });
    n.onclick = () => {
      window.focus();
      window.location.assign("/novidades");
      n.close();
    };
  } catch {
    // Browser pode bloquear mesmo com permission granted.
  }
}
