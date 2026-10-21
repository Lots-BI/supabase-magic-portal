import { describe, expect, it } from "vitest";
import { sumOverviewSlot, type OverviewSlotKey } from "@/lib/overview-slots";
import type { OverviewRow } from "@/lib/metrics";

function row(
  cliente: string,
  data: string,
  extra: Partial<OverviewRow>,
): OverviewRow {
  return {
    data,
    cliente,
    meta_spend: 0,
    google_spend: 0,
    total_impressions: 0,
    total_clicks: 0,
    ga4_sessions: 0,
    ga4_conversions: 0,
    instagram_reach: 0,
    instagram_interactions: 0,
    ...extra,
  };
}

describe("sumOverviewSlot", () => {
  it("soma sessões de todos os clientes", () => {
    const rows = [
      row("A", "2026-10-01", { ga4_sessions: 10 }),
      row("B", "2026-10-01", { ga4_sessions: 7 }),
      row("A", "2026-10-02", { ga4_sessions: 3 }),
    ];
    expect(sumOverviewSlot(rows, "sessions")).toBe(20);
  });

  it("alcance é o máximo do cliente, depois a soma da carteira", () => {
    const rows = [
      row("A", "2026-10-01", { instagram_reach: 100 }),
      row("A", "2026-10-02", { instagram_reach: 40 }),
      row("B", "2026-10-02", { instagram_reach: 25 }),
    ];
    expect(sumOverviewSlot(rows, "reach")).toBe(125);
  });

  it("seguidores usa o último dia com estoque de cada cliente", () => {
    const rows = [
      row("A", "2026-10-01", { instagram_followers_count: 200 }),
      row("A", "2026-10-03", { instagram_followers_count: 210 }),
      row("B", "2026-10-02", { instagram_followers_count: 50 }),
      row("B", "2026-10-03", { instagram_followers_count: 0 }),
    ];
    expect(sumOverviewSlot(rows, "followers")).toBe(260);
  });

  it("aceita as chaves do seletor", () => {
    const keys: OverviewSlotKey[] = [
      "messaging",
      "sessions",
      "impressions",
      "clicks",
      "reach",
      "engagement",
      "followers",
      "meta_results",
    ];
    expect(keys).toHaveLength(8);
  });
});
