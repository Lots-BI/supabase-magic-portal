import { describe, expect, it, vi } from "vitest";
import { linkIgMediaToContentCards } from "./link-ig-media-to-content-cards.server";

function chain<T>(result: { data: T; error: null }) {
  const api: Record<string, unknown> = {};
  const self = () => api;
  api.select = vi.fn(self);
  api.eq = vi.fn(self);
  api.not = vi.fn(self);
  api.in = vi.fn(self);
  api.is = vi.fn(self);
  api.update = vi.fn(self);
  api.then = (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve);
  return api;
}

describe("linkIgMediaToContentCards", () => {
  it("grava content_card_id nas mídias ainda sem FK", async () => {
    const cards = chain({
      data: [{ id: "card-1", external_post_id: "17890" }],
      error: null,
    });
    const media = chain({
      data: [{ id: "media-uuid", ig_media_id: "17890" }],
      error: null,
    });
    const update = chain({ data: null, error: null });

    let igMediaCalls = 0;
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "content_cards") return cards;
        igMediaCalls += 1;
        return igMediaCalls === 1 ? media : update;
      }),
    };

    const linked = await linkIgMediaToContentCards(supabase as never, {
      cadastroClienteId: 7,
      igMediaIds: ["17890"],
    });

    expect(linked).toBe(1);
    expect(update.update).toHaveBeenCalledWith({ content_card_id: "card-1" });
  });

  it("não atualiza quando não há card com external_post_id", async () => {
    const cards = chain({ data: [], error: null });
    const supabase = { from: vi.fn(() => cards) };
    const linked = await linkIgMediaToContentCards(supabase as never, {
      cadastroClienteId: 7,
    });
    expect(linked).toBe(0);
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });
});
