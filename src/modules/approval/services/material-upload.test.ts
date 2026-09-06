import { describe, expect, it } from "vitest";
import {
  assertAllowedMaterial,
  MATERIAL_MAX_BYTES,
  resolveUploadMime,
} from "./material-upload";

describe("material-upload", () => {
  it("aceita vídeo longo sem mime do browser", () => {
    expect(() => assertAllowedMaterial("bastidores.mov", "", 1_800_000_000)).not.toThrow();
    expect(resolveUploadMime("bastidores.mov", "")).toBe("video/quicktime");
  });

  it("aceita heic, mkv e png com mime de download (image/x-png)", () => {
    expect(() => assertAllowedMaterial("foto.HEIC", "image/heic", 12_000_000)).not.toThrow();
    expect(() => assertAllowedMaterial("take.mkv", "video/x-matroska", 4_000_000_000)).not.toThrow();
    expect(() => assertAllowedMaterial("arte.png", "image/x-png", 1_300_000)).not.toThrow();
    expect(resolveUploadMime("arte.png", "image/x-png")).toBe("image/png");
    expect(resolveUploadMime("arte.png", "")).toBe("image/png");
  });

  it("rejeita acima de 5 GB e extensão desconhecida", () => {
    expect(() => assertAllowedMaterial("a.mp4", "video/mp4", MATERIAL_MAX_BYTES + 1)).toThrow(
      /5 GB/,
    );
    expect(() => assertAllowedMaterial("virus.exe", "application/x-msdownload", 100)).toThrow(
      /Formato/,
    );
  });
});
