import { beforeEach, describe, expect, it, vi } from "vitest";

const adminClient = { __admin: true };

vi.mock("@/integrations/supabase/client.server", () => ({
  getSupabaseAdmin: vi.fn(() => adminClient),
}));

vi.mock("../repositories/content-card.repository.server", () => ({
  contentCardRepository: {
    findById: vi.fn(),
    update: vi.fn(async (_db, _id, patch) => patch),
  },
}));

vi.mock("../repositories/content-card-attachment.repository.server", () => ({
  contentCardAttachmentRepository: {
    listByCardId: vi.fn(),
  },
}));

vi.mock("../repositories/content-card-event.repository.server", () => ({
  contentCardEventRepository: {
    append: vi.fn(async () => ({ id: "e1" })),
  },
}));

vi.mock("../internal/attachment-lifecycle.server", () => ({
  createEditorialSignedUrl: vi.fn(async (path: string) => `https://signed/${path}`),
}));

import { contentCardRepository } from "../repositories/content-card.repository.server";
import { contentCardAttachmentRepository } from "../repositories/content-card-attachment.repository.server";
import { contentCardEventRepository } from "../repositories/content-card-event.repository.server";
import { publishCardWithClient } from "./meta-instagram-publisher.server";

const card = {
  id: "c1",
  cadastro_cliente_id: 7,
  formato: "estatico",
  legenda: "Legenda final",
  copy_text: null,
  publish_status: "scheduled",
  external_post_id: null,
  published_at: null,
  integration_metadata: {},
};

describe("publishCardWithClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(contentCardRepository.findById).mockResolvedValue(card as never);
    vi.mocked(contentCardAttachmentRepository.listByCardId).mockResolvedValue([
      {
        media_role: "final",
        storage_path: "finals/a.jpg",
        kind: "image",
        mime_type: "image/jpeg",
        ordem: 0,
      },
    ] as never);
  });

  it("publishes via Graph and marks the card published", async () => {
    const graph = {
      createMediaContainer: vi.fn(async () => ({ id: "cont-1" })),
      getContainerStatus: vi.fn(async () => ({ status_code: "FINISHED" })),
      publishMedia: vi.fn(async () => ({ id: "ig-media" })),
      getMediaPermalink: vi.fn(async () => "https://www.instagram.com/p/xyz/"),
    };

    const result = await publishCardWithClient(adminClient as never, "c1", {
      resolveTarget: async () => ({ accessToken: "tok", igUserId: "ig1" }),
      graph,
      now: () => new Date("2026-09-10T19:00:00.000Z"),
    });

    expect(graph.createMediaContainer).toHaveBeenCalled();
    expect(graph.publishMedia).toHaveBeenCalledWith("tok", "ig1", "cont-1");
    expect(contentCardRepository.update).toHaveBeenCalledWith(
      adminClient,
      "c1",
      expect.objectContaining({
        status: "publicado",
        publish_status: "published",
        external_post_id: "ig-media",
        publish_container_id: "cont-1",
      }),
    );
    expect(contentCardEventRepository.append).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({ event_type: "publish_succeeded" }),
    );
    expect(result.externalId).toBe("ig-media");
    expect(result.url).toBe("https://www.instagram.com/p/xyz/");
  });

  it("fails soft when Instagram is not connected", async () => {
    await expect(
      publishCardWithClient(adminClient as never, "c1", {
        resolveTarget: async () => {
          throw new Error("missing_connection: Conecte o Instagram");
        },
        graph: {
          createMediaContainer: vi.fn(),
          getContainerStatus: vi.fn(),
          publishMedia: vi.fn(),
        },
      }),
    ).rejects.toThrow(/missing_connection/);

    expect(contentCardRepository.update).toHaveBeenCalledWith(
      adminClient,
      "c1",
      expect.objectContaining({ publish_status: "failed" }),
    );
    expect(contentCardEventRepository.append).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({ event_type: "publish_failed" }),
    );
  });

  it("returns the existing post when already published", async () => {
    vi.mocked(contentCardRepository.findById).mockResolvedValue({
      ...card,
      publish_status: "published",
      external_post_id: "already",
      published_at: "2026-09-01T12:00:00.000Z",
    } as never);

    const result = await publishCardWithClient(adminClient as never, "c1", {
      resolveTarget: async () => ({ accessToken: "tok", igUserId: "ig1" }),
    });
    expect(result.externalId).toBe("already");
    expect(contentCardAttachmentRepository.listByCardId).not.toHaveBeenCalled();
  });
});
