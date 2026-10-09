import { describe, expect, it } from "vitest";
import {
  estimateVideoBitsPerSecond,
  prepareUploadFile,
  replaceExtension,
} from "./fit-media-to-allocation";
import { exceedsStorageAllocation, STORAGE_ALLOCATION_BYTES } from "./material-upload";

describe("alocação de mídia", () => {
  it("só marca o que passa de 50 MB", () => {
    expect(exceedsStorageAllocation(34 * 1024 * 1024)).toBe(false);
    expect(exceedsStorageAllocation(STORAGE_ALLOCATION_BYTES)).toBe(false);
    expect(exceedsStorageAllocation(STORAGE_ALLOCATION_BYTES + 1)).toBe(true);
  });

  it("calcula um bitrate que cabe na meta", () => {
    const bits = estimateVideoBitsPerSecond(180, 42 * 1000 * 1000);
    const bytes = ((bits + 128_000) * 180) / 8;
    expect(bytes).toBeLessThanOrEqual(42 * 1000 * 1000 + 1);
    expect(bits).toBeGreaterThan(80_000);
  });

  it("troca a extensão sem perder o nome", () => {
    expect(replaceExtension("IMG_0001.MOV", "mp4")).toBe("IMG_0001.mp4");
  });

  it("não recria arquivo que já cabe", async () => {
    const file = new File([Uint8Array.from([0xff, 0xd8, 0xff, 0x00])], "foto.jpg", {
      type: "image/jpeg",
    });
    const prepared = await prepareUploadFile(file);
    expect(prepared.compressed).toBe(false);
    expect(prepared.file).toBe(file);
  });
});
