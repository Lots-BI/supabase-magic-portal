import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ALL_META_AD_ACCOUNTS, type MetaAdAccountOption } from "./meta-ad-account";

export { ALL_META_AD_ACCOUNTS, type MetaAdAccountOption } from "./meta-ad-account";

const STORAGE = "lots.dashboard.meta-ad-account";

function readStored(cliente: string): string {
  try {
    return localStorage.getItem(`${STORAGE}:${cliente}`) ?? ALL_META_AD_ACCOUNTS;
  } catch {
    return ALL_META_AD_ACCOUNTS;
  }
}

export function useMetaAdAccountFilter(cliente: string) {
  const query = useQuery({
    queryKey: ["meta-ad-accounts", cliente],
    enabled: Boolean(cliente),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("dashboard_meta_ad_accounts", {
        p_cliente: cliente,
      });
      if (error) throw new Error(error.message);
      return (data ?? []) as MetaAdAccountOption[];
    },
    staleTime: 60_000,
  });

  const [selected, setSelected] = useState(() => readStored(cliente));

  useEffect(() => {
    setSelected(readStored(cliente));
  }, [cliente]);

  const accounts = query.data ?? [];
  const valid =
    query.isPending ||
    selected === ALL_META_AD_ACCOUNTS ||
    accounts.some((item) => item.ad_account_id === selected);
  const value = valid ? selected : ALL_META_AD_ACCOUNTS;

  function select(id: string) {
    setSelected(id);
    try {
      localStorage.setItem(`${STORAGE}:${cliente}`, id);
    } catch {
      /* ignore quota / private mode */
    }
  }

  return { accounts, selected: value, setSelected: select };
}

export function MetaAdAccountSelector({
  accounts,
  selected,
  onSelect,
}: {
  accounts: readonly MetaAdAccountOption[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  if (accounts.length < 2) return null;

  const options: Array<{ id: string; label: string }> = [
    { id: ALL_META_AD_ACCOUNTS, label: "Todas as contas" },
    ...accounts.map((item) => ({
      id: item.ad_account_id,
      label: item.label.trim() || item.ad_account_id,
    })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
        Conta de anúncios
      </span>
      {options.map((option) => {
        const active = option.id === selected;
        return (
          <button
            key={option.id || "all"}
            type="button"
            onClick={() => onSelect(option.id)}
            className={cn(
              "lots-focus rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
              active
                ? "bg-primary/15 text-primary-700 dark:text-primary-200"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
