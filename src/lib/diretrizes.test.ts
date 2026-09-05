import { describe, expect, it } from "vitest";
import {
  assertPdfUpload,
  DIRETRIZES_MAX_BYTES,
  diretrizesStoragePath,
  formatFileSize,
} from "./diretrizes";

describe("diretrizes PDF", () => {
  it("grava o PDF na pasta do cliente", () => {
    expect(diretrizesStoragePath(42, "abc-123")).toBe("42/abc-123.pdf");
  });

  it("aceita PDF e rejeita outros tipos e arquivos grandes", () => {
    expect(() =>
      assertPdfUpload({ name: "marca.pdf", type: "application/pdf", size: 1024 }),
    ).not.toThrow();
    expect(() =>
      assertPdfUpload({ name: "marca.docx", type: "application/msword", size: 1024 }),
    ).toThrow(/PDF/);
    expect(() =>
      assertPdfUpload({
        name: "marca.pdf",
        type: "application/pdf",
        size: DIRETRIZES_MAX_BYTES + 1,
      }),
    ).toThrow(/50 MB/);
  });

  it("formata tamanho em MB", () => {
    expect(formatFileSize(18801595)).toBe("17.9 MB");
  });
});
