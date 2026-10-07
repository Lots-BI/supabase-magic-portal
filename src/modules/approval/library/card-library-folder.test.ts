import { describe, expect, it } from "vitest";
import { cardLibraryFolderName } from "./card-library-folder";

describe("cardLibraryFolderName", () => {
  it("usa dia/mês e o título do conteúdo", () => {
    expect(cardLibraryFolderName("2026-10-07", "Reels bastidores do evento")).toBe(
      "07/10 — Reels bastidores do evento",
    );
  });

  it("aceita data ISO com hora", () => {
    expect(cardLibraryFolderName("2026-01-03T12:00:00.000Z", "Post")).toBe("03/01 — Post");
  });

  it("cai em Sem título quando o nome vem vazio", () => {
    expect(cardLibraryFolderName("2026-10-07", "   ")).toBe("07/10 — Sem título");
  });
});
