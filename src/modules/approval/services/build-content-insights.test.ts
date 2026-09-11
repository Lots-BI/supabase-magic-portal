import { describe, expect, it } from "vitest";
import type { IgMediaRow } from "@/modules/instagram-posts/types";
import {
  brazilWeekdayAndHour,
  buildContentInsights,
  interactionScore,
} from "./build-content-insights";

function post(overrides: Partial<IgMediaRow> = {}): IgMediaRow {
  return {
    id: "media-1",
    cadastro_cliente_id: 7,
    ig_media_id: "17890",
    media_product_type: "REELS",
    media_type: "VIDEO",
    caption: null,
    permalink: null,
    media_url: null,
    thumbnail_url: "https://example.com/t.jpg",
    thumbnail_storage_path: null,
    published_at: "2026-09-11T18:00:00.000Z",
    metrics: { total_interactions: 10 },
    metrics_collected_at: null,
    last_synced_at: null,
    content_card_id: null,
    ...overrides,
  };
}

describe("interactionScore", () => {
  it("prefere interações, depois alcance, depois likes", () => {
    expect(interactionScore({ total_interactions: 9, reach: 80, likes: 2 })).toBe(9);
    expect(interactionScore({ reach: 80, likes: 2 })).toBe(80);
    expect(interactionScore({ likes: 2 })).toBe(2);
    expect(interactionScore({})).toBe(0);
  });
});

describe("brazilWeekdayAndHour", () => {
  it("converte UTC para Brasília", () => {
    const parts = brazilWeekdayAndHour("2026-09-11T18:00:00.000Z");
    expect(parts).toEqual({ weekday: 5, hour: 15 });
  });
});

describe("buildContentInsights", () => {
  it("ordena top 7 por score e monta barras", () => {
    const posts = [
      post({ id: "low", metrics: { likes: 1 }, published_at: "2026-09-07T15:00:00.000Z" }),
      post({
        id: "high",
        metrics: { total_interactions: 40 },
        published_at: "2026-09-11T18:00:00.000Z",
        contentCard: {
          id: "card-1",
          titulo: "Peça",
          formato: "reels",
          linhaEditorial: "Educação",
          tema: null,
          cta: null,
          pilarTitulo: null,
          status: "publicado",
          dataPublicacao: "2026-09-11",
          horaPublicacao: "15:00:00",
          tags: null,
          excerpt: null,
        },
      }),
    ];
    const insights = buildContentInsights(posts);
    expect(insights.top7.map((row) => row.post.id)).toEqual(["high", "low"]);
    expect(insights.top7[0]?.post.contentCard?.linhaEditorial).toBe("Educação");
    expect(insights.days.find((d) => d.label === "Sex")?.count).toBe(1);
    expect(insights.peakHour).toBe("15:00");
    expect(insights.sampleSize).toBe(2);
  });
});
