import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  batchAttachHubIdentities,
  discoverHubIdentities,
} from "@/modules/platform-hub-admin/hub-admin.server";
import { hubAdminKeys } from "@/modules/platform-hub-admin/query-keys";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  business: "Business",
  ad_account: "Ad Account",
  page: "Página",
  instagram: "Instagram",
  customer: "Customer",
  manager: "Manager (MCC)",
  account: "Conta",
  property: "Propriedade",
  location: "Local",
  channel: "Canal",
};

const OAUTH_PLUGINS = new Set([
  "meta_ads",
  "instagram_organic",
  "google_ads",
  "ga4",
  "google_business",
  "tiktok",
  "youtube",
]);

const PRIMARY_TYPES: Record<string, string> = {
  meta_ads: "ad_account",
  instagram_organic: "instagram",
  google_ads: "customer",
  ga4: "property",
  google_business: "location",
  tiktok: "ad_account",
  youtube: "channel",
};

interface HubIdentityPickerProps {
  connectionId: string;
  pluginKey: string;
  onComplete: () => void;
}

export function HubIdentityPicker({ connectionId, pluginKey, onComplete }: HubIdentityPickerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const {
    data: identities,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [...hubAdminKeys.connection(connectionId), "discover"],
    queryFn: () => discoverHubIdentities({ data: { connectionId } }),
    enabled: OAUTH_PLUGINS.has(pluginKey),
    retry: 1,
  });

  const grouped = useMemo(() => {
    const map = new Map<string, NonNullable<typeof identities>>();
    for (const item of identities ?? []) {
      const list = map.get(item.identityType) ?? [];
      list.push(item);
      map.set(item.identityType, list);
    }
    return map;
  }, [identities]);

  const primaryType = PRIMARY_TYPES[pluginKey];

  const attachMutation = useMutation({
    mutationFn: () => {
      const picked = (identities ?? []).filter((i) => selected.has(i.externalId));
      let primaryAssigned = false;
      return batchAttachHubIdentities({
        data: {
          connectionId,
          identities: picked.map((i) => {
            const isPrimary = primaryType === i.identityType && !primaryAssigned;
            if (isPrimary) primaryAssigned = true;
            return {
              identityType: i.identityType,
              externalId: i.externalId,
              label: i.label,
              isPrimary,
            };
          }),
        },
      });
    },
    onSuccess: (r) => {
      toast.success(`${r.count} identidade(s) vinculada(s)`);
      onComplete();
    },
    onError: (e) => toast.error(e.message),
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!OAUTH_PLUGINS.has(pluginKey)) {
    return (
      <p className="text-sm text-muted-foreground">
        Seleção automática de identidades disponível após OAuth nas plataformas oficiais.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Buscando identidades vinculadas ao token…
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Falha ao listar identidades"}
        </p>
        <Button size="sm" variant="outline" onClick={() => void refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!identities?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma identidade encontrada. Verifique permissões OAuth e reconecte.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {[...grouped.entries()].map(([type, items]) => (
        <div key={type}>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {TYPE_LABELS[type] ?? type}
          </h4>
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.externalId}>
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                    selected.has(item.externalId)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/40",
                  )}
                >
                  <Checkbox
                    checked={selected.has(item.externalId)}
                    onCheckedChange={() => toggle(item.externalId)}
                    aria-label={item.label}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="font-mono text-xs text-muted-foreground">{item.externalId}</p>
                    {item.parentLabel && (
                      <p className="text-xs text-muted-foreground">Conta: {item.parentLabel}</p>
                    )}
                  </div>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <Button
        className="w-full"
        disabled={selected.size === 0 || attachMutation.isPending}
        onClick={() => attachMutation.mutate()}
      >
        {attachMutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Check className="mr-2 h-4 w-4" />
        )}
        Vincular {selected.size} selecionada(s)
      </Button>
    </div>
  );
}
