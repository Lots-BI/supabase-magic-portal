import { describe, expect, it } from "vitest";
import { resolvePublishPlatform } from "./publish-platform";

describe("resolvePublishPlatform", () => {
  it("reconhece as três redes e recusa o resto", () => {
    expect(resolvePublishPlatform("Instagram")).toBe("instagram");
    expect(resolvePublishPlatform("tiktok")).toBe("tiktok");
    expect(resolvePublishPlatform("youtube")).toBe("youtube");
    expect(resolvePublishPlatform("google_ads")).toBeNull();
    expect(resolvePublishPlatform("")).toBeNull();
  });
});
