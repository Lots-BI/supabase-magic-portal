import { describe, expect, it, vi } from "vitest";
import { executeInstagramPublishPlan, formatInstagramPublishError } from "./execute-instagram-publish";
import type { InstagramPublishGraphPort } from "./execute-instagram-publish";

function mockGraph(overrides?: Partial<InstagramPublishGraphPort>): InstagramPublishGraphPort {
  return {
    createMediaContainer: vi.fn(async () => ({ id: "container-1" })),
    getContainerStatus: vi.fn(async () => ({ status_code: "FINISHED" })),
    publishMedia: vi.fn(async () => ({ id: "media-99" })),
    getMediaPermalink: vi.fn(async () => "https://www.instagram.com/p/abc/"),
    ...overrides,
  };
}

const target = { accessToken: "tok", igUserId: "ig1" };

describe("executeInstagramPublishPlan", () => {
  it("creates, waits and publishes an image", async () => {
    const graph = mockGraph();
    const result = await executeInstagramPublishPlan({
      graph,
      target,
      plan: { type: "image", image_url: "https://a.jpg", caption: "oi" },
      sleep: async () => undefined,
    });
    expect(graph.createMediaContainer).toHaveBeenCalledWith("tok", "ig1", {
      image_url: "https://a.jpg",
      caption: "oi",
    });
    expect(graph.publishMedia).toHaveBeenCalledWith("tok", "ig1", "container-1");
    expect(result).toEqual({
      containerId: "container-1",
      mediaId: "media-99",
      permalink: "https://www.instagram.com/p/abc/",
    });
  });

  it("publishes a carousel from child containers", async () => {
    const graph = mockGraph({
      createMediaContainer: vi
        .fn()
        .mockResolvedValueOnce({ id: "c1" })
        .mockResolvedValueOnce({ id: "c2" })
        .mockResolvedValueOnce({ id: "parent" }),
    });
    const result = await executeInstagramPublishPlan({
      graph,
      target,
      plan: {
        type: "carousel",
        caption: "car",
        items: [{ image_url: "https://a.jpg" }, { image_url: "https://b.jpg" }],
      },
      sleep: async () => undefined,
    });
    expect(graph.createMediaContainer).toHaveBeenNthCalledWith(
      3,
      "tok",
      "ig1",
      expect.objectContaining({ media_type: "CAROUSEL", children: "c1,c2" }),
    );
    expect(result.containerId).toBe("parent");
  });

  it("fails when the container reports ERROR", async () => {
    const graph = mockGraph({
      getContainerStatus: vi.fn(async () => ({ status_code: "ERROR" })),
    });
    await expect(
      executeInstagramPublishPlan({
        graph,
        target,
        plan: { type: "reels", video_url: "https://v.mp4", caption: "" },
        sleep: async () => undefined,
      }),
    ).rejects.toThrow(/error/i);
  });
});

describe("formatInstagramPublishError", () => {
  it("prefixes permission errors", () => {
    expect(formatInstagramPublishError(new Error("(#10) Application does not have permission"))).toMatch(
      /^missing_publish_scope:/,
    );
  });
});
