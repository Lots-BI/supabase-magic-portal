import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { syncMyDueTaskAlerts } from "@/modules/agency-os/tasks-sheet.server";

const seenKey = (id: string, entrega: string) => `lots-task-browser:${id}:${entrega}`;

function showBrowserAlerts(
  alerts: { id: string; titulo: string; entrega: string; clienteNome: string }[],
) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  for (const alert of alerts) {
    const key = seenKey(alert.id, alert.entrega);
    if (localStorage.getItem(key)) continue;
    localStorage.setItem(key, "1");
    const body = alert.clienteNome
      ? `Entrega de ${alert.clienteNome} chegou.`
      : "A data de entrega chegou.";
    new Notification(`Tarefa para hoje: ${alert.titulo}`, { body, tag: key });
  }
}

/** Avisa o proprietário no navegador quando a entrega da tarefa é hoje. */
export function TaskDueBrowserAlert() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let timer = 0;
    let asked = false;

    async function check() {
      try {
        const alerts = await syncMyDueTaskAlerts();
        if (alerts.length > 0) {
          void queryClient.invalidateQueries({ queryKey: ["app-notifications"] });
        }
        if (typeof Notification === "undefined") return;
        if (Notification.permission === "granted") {
          showBrowserAlerts(alerts);
          return;
        }
        if (Notification.permission !== "default" || alerts.length === 0 || asked) return;
        asked = true;
        const ask = () => {
          window.removeEventListener("pointerdown", ask);
          void Notification.requestPermission().then((permission) => {
            if (permission === "granted") showBrowserAlerts(alerts);
          });
        };
        window.addEventListener("pointerdown", ask);
      } catch {
        // Sem a coluna de aviso, o sino simplesmente não dispara.
      }
    }

    void check();
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    timer = window.setInterval(() => void check(), 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [queryClient]);

  return null;
}
