import { describe, expect, it } from "vitest";
import { assetsForPublishPreview } from "./utils";
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
