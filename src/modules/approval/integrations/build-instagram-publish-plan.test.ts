import { describe, expect, it } from "vitest";
import {
  buildInstagramPublishPlan,
  captionForCard,
} from "./build-instagram-publish-plan";

const image = (url: string) => ({ url, kind: "image" as const, mime_type: "image/jpeg" });
const video = (url: string) => ({ url, kind: "video" as const, mime_type: "video/mp4" });

describe("buildInstagramPublishPlan", () => {
  it("publishes a single image as IMAGE", () => {
    expect(buildInstagramPublishPlan("estatico", "oi", [image("https://a.jpg")])).toEqual({
      type: "image",
      image_url: "https://a.jpg",
      caption: "oi",
    });
  });

  it("publishes a video as REELS", () => {
    expect(buildInstagramPublishPlan("reels", "v", [video("https://v.mp4")])).toEqual({
      type: "reels",
      video_url: "https://v.mp4",
      caption: "v",
    });
  });

  it("falls back to image when formato is reels but file is a photo", () => {
    expect(buildInstagramPublishPlan("reels", "x", [image("https://a.jpg")]).type).toBe("image");
  });

  it("builds a carousel from 2+ images", () => {
    const plan = buildInstagramPublishPlan("carrossel", "c", [
      image("https://a.jpg"),
      image("https://b.jpg"),
    ]);
    expect(plan).toEqual({
      type: "carousel",
      caption: "c",
      items: [{ image_url: "https://a.jpg" }, { image_url: "https://b.jpg" }],
    });
  });

  it("rejects empty media", () => {
    expect(() => buildInstagramPublishPlan("estatico", "x", [])).toThrow(/mídia final/);
  });
});

describe("captionForCard", () => {
  it("prefers legenda over copy", () => {
    expect(captionForCard("legenda", "copy")).toBe("legenda");
  });
});
