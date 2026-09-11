import { describe, expect, it } from "vitest";
import { groupRowsForReplaceDays } from "../group-rows-for-replace-days";

describe("groupRowsForReplaceDays", () => {
  it("agrupa por cliente+plataforma e lista datas distintas", () => {
    const groups = groupRowsForReplaceDays([
      {
        cliente: "Acme",
        plataforma: "Meta Ads",
        metrica: "spend",
        valor: 10,
        data: "2026-07-02",
        campanha: "A",
      },
      {
        cliente: "Acme",
        plataforma: "Meta Ads",
        metrica: "clicks",
        valor: 3,
        data: "2026-07-01",
        campanha: "A",
      },
      {
        cliente: "Acme",
        plataforma: "Instagram",
        metrica: "reach",
        valor: 9,
        data: "2026-07-01",
        campanha: null,
      },
    ]);

    expect(groups).toHaveLength(2);
    const meta = groups.find((group) => group.plataforma === "Meta Ads");
    expect(meta?.dates).toEqual(["2026-07-01", "2026-07-02"]);
    expect(meta?.rows).toHaveLength(2);
    const ig = groups.find((group) => group.plataforma === "Instagram");
    expect(ig?.dates).toEqual(["2026-07-01"]);
  });

  it("dedupe — última linha da mesma chave natural ganha", () => {
    const groups = groupRowsForReplaceDays([
      {
        cliente: "Acme",
        plataforma: "Meta Ads",
        metrica: "spend",
        valor: 10,
        data: "2026-07-01",
        campanha: "A",
      },
      {
        cliente: "Acme",
        plataforma: "Meta Ads",
        metrica: "spend",
        valor: 12,
        data: "2026-07-01",
        campanha: "A",
      },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.rows).toHaveLength(1);
    expect(groups[0]?.rows[0]?.valor).toBe(12);
  });
});
