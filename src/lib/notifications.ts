/** Central de notificações (camada app — persistência local até backend dedicado). */

export type NotificationKind =
  | "aprovacao"
  | "reprovacao"
  | "publicacao"
  | "sync"
  | "coleta_falha"
  | "usuario"
  | "cliente"
  | "alerta"
  | "tarefa";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  href?: string;
  createdAt: string;
  read: boolean;
}

const STORAGE_KEY = "lots-bi-notifications";
const MAX_ITEMS = 80;

function load(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AppNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(items: AppNotification[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
}

export function listNotifications(): AppNotification[] {
  return load().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function unreadCount(): number {
  return load().filter((n) => !n.read).length;
}

export function pushNotification(
  input: Omit<AppNotification, "id" | "createdAt" | "read"> & { id?: string },
): AppNotification {
  const item: AppNotification = {
    id: input.id ?? crypto.randomUUID(),
    kind: input.kind,
    title: input.title,
    body: input.body,
    href: input.href,
    createdAt: new Date().toISOString(),
    read: false,
  };
  const next = [item, ...load()].slice(0, MAX_ITEMS);
  save(next);
  window.dispatchEvent(new CustomEvent("lots-bi:notifications"));
  return item;
}

export function markRead(id: string) {
  const next = load().map((n) => (n.id === id ? { ...n, read: true } : n));
  save(next);
  window.dispatchEvent(new CustomEvent("lots-bi:notifications"));
}

export function markAllRead() {
  const next = load().map((n) => ({ ...n, read: true }));
  save(next);
  window.dispatchEvent(new CustomEvent("lots-bi:notifications"));
}
