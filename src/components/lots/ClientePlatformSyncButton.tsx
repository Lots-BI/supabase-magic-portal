import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { syncClientePlatformFn } from "@/modules/dashboards/sync-cliente-platform.server";
import {
  CLIENTE_SYNC_LABEL,
  type ClienteSyncPlatform,
} from "@/modules/dashboards/cliente-sync-platform";

export function ClientePlatformSyncButton({
  cadastroClienteId,
  platform,
  compact = false,
}: {
  cadastroClienteId: number;
  platform: ClienteSyncPlatform;
  compact?: boolean;
}) {
  const queryClient = useQueryClient();
  const label = CLIENTE_SYNC_LABEL[platform];

  const mutation = useMutation({
    mutationFn: () =>
      syncClientePlatformFn({
        data: { cadastroClienteId, platform },
      }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error ?? `Não foi possível puxar ${label}`);
        return;
      }
      if (result.error) toast.warning(result.error);
      if (typeof result.mediaCount === "number") {
        toast.success(
          result.mediaCount === 0
            ? `${label}: nenhuma publicação nova`
            : `${label}: ${result.mediaCount} publicação(ões)`,
        );
      } else if (result.daysFilled === 0) {
        toast.success(`${label}: nenhum dia novo`);
      } else {
        toast.success(`${label}: ${result.daysFilled} dia(s) atualizado(s)`);
      }
      void queryClient.invalidateQueries({ queryKey: ["client-overview"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "portfolio"] });
      void queryClient.invalidateQueries({ queryKey: ["platform-rows"] });
      void queryClient.invalidateQueries({ queryKey: ["meta-structure"] });
      void queryClient.invalidateQueries({ queryKey: ["meta-ad-accounts"] });
      void queryClient.invalidateQueries({ queryKey: ["campaign-status"] });
      void queryClient.invalidateQueries({ queryKey: ["cliente-sync-meta"] });
      void queryClient.invalidateQueries({ queryKey: ["cliente-sync-coverage"] });
      void queryClient.invalidateQueries({ queryKey: ["instagram-posts"] });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={mutation.isPending}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        mutation.mutate();
      }}
      aria-label={`Puxar métricas de ${label}`}
      className={cn(compact && "h-7 px-2 text-[11px]")}
    >
      <RefreshCw className={mutation.isPending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
      {mutation.isPending ? "Puxando…" : compact ? "Puxar" : "Puxar métricas"}
    </Button>
  );
}
