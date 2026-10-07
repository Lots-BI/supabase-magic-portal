import { describe, expect, it } from "vitest";
import { contentCardCreateSchema } from "./content-card";

describe("contentCardCreateSchema", () => {
  it("preserva a legenda da criação para o card e a publicação", () => {
    const parsed = contentCardCreateSchema.parse({
      cadastro_cliente_id: 1,
      data_publicacao: "2026-10-12",
      titulo: "Reels de terça",
      legenda: "Texto da postagem\ncom hashtag",
    });
    expect(parsed.legenda).toBe("Texto da postagem\ncom hashtag");
  });
});
