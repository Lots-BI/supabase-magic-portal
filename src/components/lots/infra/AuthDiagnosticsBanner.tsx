import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { getAuthDiagnostics } from "@/lib/admin.functions";

export function AuthDiagnosticsBanner() {
  const fn = useServerFn(getAuthDiagnostics);
  const clientOrigin = typeof window !== "undefined" ? window.location.origin : null;

  const { data } = useQuery({
    queryKey: ["admin", "auth-diagnostics", clientOrigin],
    queryFn: () => fn({ data: { client_origin: clientOrigin } }),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  if (!data || data.invites_allowed) return null;

  return (
    <div
      role="alert"
      className="mb-4 flex gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-[13px]"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium text-destructive">Configuração crítica de autenticação</p>
        <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">
          {data.message ?? data.block_invites_reason}
        </pre>
        <Link
          to="/admin/debug"
          className="inline-block text-[11px] font-medium text-primary underline-offset-2 hover:underline"
        >
          Abrir painel operacional →
        </Link>
      </div>
    </div>
  );
}
