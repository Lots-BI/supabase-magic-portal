import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import {
  listNotifications,
  markAllRead,
  markRead,
  unreadCount,
  type AppNotification,
} from "@/lib/notifications";
import {
  listAppNotificationsFn,
  markAllAppNotificationsReadFn,
  markAppNotificationReadFn,
} from "@/modules/notifications/app-notifications.server";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<AppNotification["kind"], string> = {
  aprovacao: "Aprovação",
  reprovacao: "Reprovação",
  publicacao: "Publicação",
  sync: "Sincronização",
  coleta_falha: "Coleta",
  usuario: "Usuário",
  cliente: "Cliente",
  alerta: "Alerta",
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationCenter() {
  const queryClient = useQueryClient();
  const [localItems, setLocalItems] = useState<AppNotification[]>([]);
  const [localUnread, setLocalUnread] = useState(0);

  const serverQuery = useQuery({
    queryKey: ["app-notifications"],
    queryFn: () => listAppNotificationsFn(),
    staleTime: 30_000,
    retry: 1,
  });

  const refreshLocal = () => {
    setLocalItems(listNotifications());
    setLocalUnread(unreadCount());
  };

  useEffect(() => {
    refreshLocal();
    const handler = () => refreshLocal();
    window.addEventListener("lots-bi:notifications", handler);
    return () => window.removeEventListener("lots-bi:notifications", handler);
  }, []);

  const serverItems = serverQuery.data ?? [];
  const items = mergeNotifications(serverItems, localItems);
  const unread =
    serverItems.filter((n) => !n.read).length + localUnread;

  const markOne = useMutation({
    mutationFn: async (id: string) => {
      if (serverItems.some((n) => n.id === id)) {
        await markAppNotificationReadFn({ data: { id } });
      } else {
        markRead(id);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["app-notifications"] });
      refreshLocal();
    },
  });

  const markAll = useMutation({
    mutationFn: async () => {
      try {
        await markAllAppNotificationsReadFn();
      } catch {
        // localStorage ainda marca
      }
      markAllRead();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["app-notifications"] });
      refreshLocal();
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative h-10 w-10 shrink-0 sm:h-9 sm:w-9"
          aria-label="Central de notificações"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(100vw-2rem,360px)]">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notificações</DropdownMenuLabel>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => markAll.mutate()}
              className="lots-focus inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="h-3 w-3" />
              Marcar todas
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            Nenhuma notificação ainda.
          </p>
        ) : (
          items.slice(0, 12).map((n) => (
            <DropdownMenuItem
              key={n.id}
              className={cn("flex flex-col items-start gap-0.5 py-2.5", !n.read && "bg-primary/5")}
              onSelect={() => markOne.mutate(n.id)}
              asChild={!!n.href}
            >
              {n.href ? (
                <a href={n.href} className="w-full">
                  <NotificationRow n={n} />
                </a>
              ) : (
                <div className="w-full">
                  <NotificationRow n={n} />
                </div>
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationRow({ n }: { n: AppNotification }) {
  return (
    <>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-300">
        {KIND_LABEL[n.kind]}
      </span>
      <span className="text-[13px] font-medium leading-snug text-foreground">{n.title}</span>
      {n.body && <span className="text-[11px] text-muted-foreground line-clamp-2">{n.body}</span>}
      <span className="text-[10px] text-muted-foreground">{formatWhen(n.createdAt)}</span>
    </>
  );
}

function mergeNotifications(
  server: AppNotification[],
  local: AppNotification[],
): AppNotification[] {
  const seen = new Set(server.map((item) => item.id));
  return [...server, ...local.filter((item) => !seen.has(item.id))].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}
