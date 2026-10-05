import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { liveDebounceMs, queryKeysForScopes } from "./live-query-map";

/**
 * Escuta `app_live_signals` e marca como velhas as queries da tela aberta.
 * Quem não está com a aba montada só busca de novo na próxima visita.
 */
export function usePlatformLiveSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let disposed = false;
    let joined = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const pending = new Set<string>();

    const flush = () => {
      timer = null;
      const scopes = [...pending];
      pending.clear();
      for (const queryKey of queryKeysForScopes(scopes)) {
        void queryClient.invalidateQueries({ queryKey });
      }
    };

    const schedule = (scope: string) => {
      pending.add(scope);
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, liveDebounceMs(pending));
    };

    let channel: RealtimeChannel | null = null;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (disposed) return;
      const token = data.session?.access_token;
      if (token) await supabase.realtime.setAuth(token);
      if (disposed) return;

      const next = supabase
        .channel("lots-platform-live")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "app_live_signals" },
          (payload) => {
            const scope =
              payload.new && typeof payload.new === "object" && "scope" in payload.new
                ? String((payload.new as { scope?: unknown }).scope ?? "")
                : "";
            if (scope) schedule(scope);
          },
        )
        .subscribe((status) => {
          if (disposed) return;
          if (status === "SUBSCRIBED") {
            if (joined) schedule("reconnect");
            joined = true;
          }
        });
      if (disposed) {
        void supabase.removeChannel(next);
        return;
      }
      channel = next;
    })();

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
