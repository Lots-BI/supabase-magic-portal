import { useEffect, useState, type ReactNode } from "react";
import { bootstrapSupabase } from "@/integrations/supabase/client";
import { LotsBIWordmark } from "@/components/lots/LotsMark";
import { BRAND_NAME } from "@/lib/brand";

type GateState = "loading" | "ready" | "error";

/**
 * Garante Supabase inicializado antes de renderizar rotas.
 * Build: VITE_OFFICIAL_* ou VITE_SUPABASE_* (Lovable).
 * Fallback: runtime secrets via getPublicSupabaseConfig (server fn).
 */
export function SupabaseBootstrapGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    bootstrapSupabase()
      .then(() => {
        if (!cancelled) setState("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Não foi possível conectar ao Supabase.";
        setError(msg);
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="space-y-3 text-center">
          <LotsBIWordmark size="md" className="mx-auto" />
          <p className="text-sm text-muted-foreground">Conectando ao {BRAND_NAME}…</p>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <LotsBIWordmark size="md" className="mx-auto" />
          <h1 className="text-lg font-semibold text-foreground">
            {BRAND_NAME} — configuração Supabase
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{error}</p>
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-left text-xs leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground">
              Integração customizada (prefixo <code className="text-foreground">OFFICIAL_</code>,
              não Supabase nativo do Lovable):
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>
                <code className="text-foreground">OFFICIAL_SUPABASE_ANON_KEY</code> — runtime secret
                (obrigatório sem build env)
              </li>
              <li>
                <code className="text-foreground">OFFICIAL_SUPABASE_URL</code> ={" "}
                https://ywvhoctcmibjitvwkkhb.supabase.co
              </li>
              <li>
                Opcional no build:{" "}
                <code className="text-foreground">VITE_OFFICIAL_SUPABASE_ANON_KEY</code> e{" "}
                <code className="text-foreground">VITE_OFFICIAL_SUPABASE_URL</code>
              </li>
            </ul>
            <p className="mt-2">
              Chave anon: Supabase Dashboard → Project Settings → API → anon public.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
