import { describe, expect, it } from "vitest";
import { buildProductionChecklist } from "./build-production-checklist";

describe("buildProductionChecklist", () => {
  it("builds estatico checklist with exact ids/labels", () => {
    const items = buildProductionChecklist("estatico");
    expect(items.map((i) => i.id)).toEqual([
      "material_recebido",
      "roteiro_aprovado",
      "media_final",
      "legenda_cta",
      "preview_ok",
    ]);
    expect(items.find((i) => i.id === "media_final")?.label).toBe("Imagem final anexada");
  });

  it("builds carrossel media label", () => {
    const items = buildProductionChecklist("carrossel");
    expect(items.find((i) => i.id === "media_final")?.label).toBe(
      "Pelo menos 2 imagens finais anexadas",
    );
  });

  it("builds reels media label", () => {
    const items = buildProductionChecklist("reels");
    expect(items.find((i) => i.id === "media_final")?.label).toBe("Vídeo do Reels anexado");
  });
});
