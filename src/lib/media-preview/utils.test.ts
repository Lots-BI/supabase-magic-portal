import { describe, expect, it } from "vitest";
import { assetsForCardDisplay, assetsForPublishPreview } from "./utils";
import type { MediaAsset } from "./types";

const asset = (id: string, mediaRole?: string): MediaAsset => ({
  id,
  kind: "image",
  url: `https://x/${id}`,
  mediaRole,
});

describe("assetsForPublishPreview", () => {
  it("uses only the agency final for publish preview", () => {
    const assets = [
      asset("c", "cliente_material"),
      asset("f", "final"),
      asset("p", "preview"),
    ];
    expect(assetsForPublishPreview(assets, "final").map((a) => a.id)).toEqual(["f"]);
  });

  it("keeps client originals out of draft preview", () => {
    const assets = [asset("c", "cliente_material"), asset("p", "preview")];
    expect(assetsForPublishPreview(assets, "draft").map((a) => a.id)).toEqual(["p"]);
  });
});

describe("assetsForCardDisplay", () => {
  it("mostra a mídia da agência e ignora o original do cliente quando há as duas", () => {
    const assets = [
      asset("c", "cliente_material"),
      asset("p", "preview"),
      asset("a", "attachment"),
    ];
    expect(assetsForCardDisplay(assets).map((row) => row.id)).toEqual(["p", "a"]);
  });

  it("cai no original do cliente se for a única mídia", () => {
    expect(assetsForCardDisplay([asset("c", "cliente_material")]).map((row) => row.id)).toEqual([
      "c",
    ]);
  });
});
