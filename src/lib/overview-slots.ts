import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Eye,
  MessageCircle,
  MousePointerClick,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { METRIC_META, type OverviewRow } from "@/lib/metrics";

export const OVERVIEW_SLOT_STORAGE = "lots.overview.slot-metric";
export const DEFAULT_OVERVIEW_SLOT = "messaging";
export const ADMIN_OVERVIEW_SLOT_SCOPE = "admin";
export const ADMIN_DEFAULT_OVERVIEW_SLOT = "sessions";

export type OverviewSlotKey =
  | "messaging"
  | "sessions"
  | "impressions"
  | "clicks"
  | "reach"
  | "engagement"
  | "followers"
  | "meta_results";

export type OverviewSlotDef = {
  key: OverviewSlotKey;
  label: string;
  description: string;
  icon: LucideIcon;
  aggregate: "sum" | "max" | "last";
  pick: (row: OverviewRow) => number;
};

export const OVERVIEW_SLOTS: OverviewSlotDef[] = [
  {
    key: "messaging",
    label: "Conversas por mensagem iniciadas",
    description: "Conversas iniciadas nos anúncios da Meta no período.",
    icon: MessageCircle,
    aggregate: "sum",
    pick: (row) => row.meta_messaging_conversations_started ?? 0,
  },
  {
    key: "sessions",
    label: "Sessões GA4",
    description: METRIC_META.sessions.description,
    icon: Activity,
    aggregate: "sum",
    pick: (row) => row.ga4_sessions ?? 0,
  },
  {
    key: "impressions",
    label: "Impressões",
    description: METRIC_META.impressions.description,
    icon: Eye,
    aggregate: "sum",
    pick: (row) => row.total_impressions ?? 0,
  },
  {
    key: "clicks",
    label: "Cliques",
    description: METRIC_META.clicks.description,
    icon: MousePointerClick,
    aggregate: "sum",
    pick: (row) => row.total_clicks ?? 0,
  },
  {
    key: "reach",
    label: "Alcance Instagram",
    description: "Maior alcance diário do Instagram no período. Não soma os dias.",
    icon: Users,
    aggregate: "max",
    pick: (row) => row.instagram_reach ?? 0,
  },
  {
    key: "engagement",
    label: "Interações Instagram",
    description: METRIC_META.engagement.description,
    icon: Sparkles,
    aggregate: "sum",
    pick: (row) => row.instagram_interactions ?? 0,
  },
  {
    key: "followers",
    label: "Seguidores Instagram",
    description: "Total de seguidores do perfil no último dia do período.",
    icon: UserPlus,
    aggregate: "last",
    pick: (row) => row.instagram_followers_count ?? 0,
  },
  {
    key: "meta_results",
    label: "Resultados Meta",
    description: "Coluna Resultados do Gerenciador de Anúncios no período.",
    icon: Trophy,
    aggregate: "sum",
    pick: (row) => row.meta_results ?? 0,
  },
];

export function isOverviewSlot(value: string | null): value is OverviewSlotKey {
  return OVERVIEW_SLOTS.some((slot) => slot.key === value);
}

export function readOverviewSlot(
  scope: string,
  fallback: OverviewSlotKey = DEFAULT_OVERVIEW_SLOT,
): OverviewSlotKey {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(`${OVERVIEW_SLOT_STORAGE}:${scope}`);
    if (isOverviewSlot(stored)) return stored;
  } catch {
    /* navegador sem storage */
  }
  return fallback;
}

export function writeOverviewSlot(scope: string, key: OverviewSlotKey): void {
  try {
    window.localStorage.setItem(`${OVERVIEW_SLOT_STORAGE}:${scope}`, key);
  } catch {
    /* navegador sem storage */
  }
}

function slotByKey(key: OverviewSlotKey): OverviewSlotDef {
  return OVERVIEW_SLOTS.find((item) => item.key === key) ?? OVERVIEW_SLOTS[0]!;
}

function sumByCliente(values: Map<string, number>): number {
  let total = 0;
  for (const value of values.values()) total += value;
  return total;
}

/** Soma, máximo ou último valor por cliente — serve para uma conta e para o portfólio. */
export function sumOverviewSlot(rows: OverviewRow[], key: OverviewSlotKey): number {
  const slot = slotByKey(key);
  if (slot.aggregate === "max") {
    const byCliente = new Map<string, number>();
    for (const row of rows) {
      byCliente.set(row.cliente, Math.max(byCliente.get(row.cliente) ?? 0, slot.pick(row)));
    }
    return sumByCliente(byCliente);
  }
  if (slot.aggregate === "last") {
    const ordered = [...rows].sort((a, b) => (a.data < b.data ? -1 : 1));
    const byCliente = new Map<string, number>();
    for (const row of ordered) {
      const next = slot.pick(row);
      if (next > 0) byCliente.set(row.cliente, next);
    }
    return sumByCliente(byCliente);
  }
  return rows.reduce((sum, row) => sum + slot.pick(row), 0);
}

export function useOverviewSlot(
  scope: string,
  fallback: OverviewSlotKey = DEFAULT_OVERVIEW_SLOT,
) {
  const [slotKey, setSlotKey] = useState<OverviewSlotKey>(() =>
    readOverviewSlot(scope, fallback),
  );

  useEffect(() => {
    setSlotKey(readOverviewSlot(scope, fallback));
  }, [scope, fallback]);

  const slot = slotByKey(slotKey);

  function setSlot(key: OverviewSlotKey) {
    setSlotKey(key);
    writeOverviewSlot(scope, key);
  }

  return { slot, slotKey, setSlot };
}
