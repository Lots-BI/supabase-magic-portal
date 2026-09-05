import { useEffect } from "react";
import { announceUnseenPlatformReleases } from "@/lib/platform-news/announce-new-releases";

/** Dispara avisos de /novidades para clientes (in-app + browser se permitido). */
export function PlatformNewsAnnouncer({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(() => {
      announceUnseenPlatformReleases();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  return null;
}
