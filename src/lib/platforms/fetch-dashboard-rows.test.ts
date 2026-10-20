import { describe, expect, it, vi } from "vitest";
import { fetchHubLongPages, HUB_LONG_PAGE_SIZE, IncompleteHubReadError } from "./fetch-dashboard-rows";
import type { LongMetricRow } from "./pivot-long";

function row(index: number): LongMetricRow {
  return {
    data: "2026-10-01",
    cliente: "Cliente",
    campanha: "Campanha",
    metrica: "spend",
    valor: index,
  };
}

describe("fetchHubLongPages", () => {
  it("busca a página seguinte quando a anterior vem cheia", async () => {
    const loadPage = vi.fn(async (from: number, to: number) => {
      if (from === 0) return Array.from({ length: HUB_LONG_PAGE_SIZE }, (_, i) => row(i));
      expect(to).toBe(HUB_LONG_PAGE_SIZE * 2 - 1);
      return [row(HUB_LONG_PAGE_SIZE)];
    });

    const rows = await fetchHubLongPages(loadPage);
    expect(loadPage).toHaveBeenCalledTimes(2);
    expect(rows).toHaveLength(HUB_LONG_PAGE_SIZE + 1);
  });

  it("para na primeira página incompleta", async () => {
    const loadPage = vi.fn(async () => [row(1)]);
    const rows = await fetchHubLongPages(loadPage);
    expect(loadPage).toHaveBeenCalledTimes(1);
    expect(rows).toHaveLength(1);
  });

  it("recusa a leitura quando a última página ainda vem cheia", async () => {
    const loadPage = vi.fn(async (from: number) =>
      Array.from({ length: HUB_LONG_PAGE_SIZE }, (_, i) => row(from + i)),
    );
    await expect(fetchHubLongPages(loadPage)).rejects.toBeInstanceOf(IncompleteHubReadError);
  });
});
