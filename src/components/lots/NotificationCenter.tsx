import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import {
  listNotifications,
  markAllRead,
  markRead,
  unreadCount,
  type AppNotification,
} from "@/lib/notifications";
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
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const refresh = () => {
    setItems(listNotifications());
    setUnread(unreadCount());
  };

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("lots-bi:notifications", handler);
    return () => window.removeEventListener("lots-bi:notifications", handler);
  }, []);

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
              onClick={() => markAllRead()}
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
              onSelect={() => markRead(n.id)}
              asChild={!!n.href}
            >
              {n.href ? (
                <Link to={n.href} className="w-full">
                  <NotificationRow n={n} />
                </Link>
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
