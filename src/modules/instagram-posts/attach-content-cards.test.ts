import { describe, expect, it } from "vitest";
import {
  attachContentCardsToPosts,
  editorialExcerpt,
} from "./attach-content-cards";
import type { IgMediaRow } from "./types";

function post(overrides: Partial<IgMediaRow> = {}): IgMediaRow {
  return {
    id: "media-uuid",
    cadastro_cliente_id: 7,
    ig_media_id: "17890",
    media_product_type: "REELS",
    media_type: "VIDEO",
    caption: "legenda ig",
    permalink: null,
    media_url: null,
    thumbnail_url: null,
    thumbnail_storage_path: null,
    published_at: "2026-09-10T12:00:00.000Z",
    metrics: { views: 10 },
    metrics_collected_at: null,
    last_synced_at: null,
    content_card_id: null,
    ...overrides,
  };
}

describe("editorialExcerpt", () => {
  it("remove HTML e corta o texto", () => {
    expect(editorialExcerpt("<p>Olá <b>mundo</b></p>")).toBe("Olá mundo");
    expect(editorialExcerpt("a".repeat(200))?.endsWith("…")).toBe(true);
    expect(editorialExcerpt("   ")).toBeNull();
  });
});

describe("attachContentCardsToPosts", () => {
  const card = {
    id: "card-1",
    titulo: "Peça de setembro",
    formato: "reels",
    linha_editorial: "Educação",
    tema: "Hábitos",
    cta: "Salve este post",
    pilar_id: "pilar-1",
    status: "publicado",
    data_publicacao: "2026-09-10",
    hora_publicacao: "19:00",
    tags: ["reels"],
    roteiro: "<p>Fale sobre hábitos</p>",
    copy_text: null,
    legenda: null,
    external_post_id: "17890",
  };

  it("liga pelo Graph id quando a FK ainda está vazia", () => {
    const [linked] = attachContentCardsToPosts(
      [post()],
      [card],
      { "pilar-1": "Autoridade" },
    );
    expect(linked.content_card_id).toBe("card-1");
    expect(linked.contentCard?.titulo).toBe("Peça de setembro");
    expect(linked.contentCard?.pilarTitulo).toBe("Autoridade");
    expect(linked.contentCard?.excerpt).toBe("Fale sobre hábitos");
  });

  it("liga pela FK mesmo com Graph id diferente", () => {
    const [linked] = attachContentCardsToPosts(
      [post({ content_card_id: "card-1", ig_media_id: "other" })],
      [{ ...card, external_post_id: "other-id" }],
      {},
    );
    expect(linked.contentCard?.id).toBe("card-1");
  });

  it("não inventa card quando não há match", () => {
    const [row] = attachContentCardsToPosts([post({ ig_media_id: "x" })], [card], {});
    expect(row.contentCard).toBeUndefined();
    expect(row.content_card_id).toBeNull();
  });
});
