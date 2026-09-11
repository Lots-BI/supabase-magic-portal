import { describe, expect, it } from "vitest";
import { mapGraphCommentToSignal, placeFromMediaProductType } from "./map-graph-comment";

describe("mapGraphCommentToSignal", () => {
  it("maps REELS to place reels", () => {
    expect(placeFromMediaProductType("REELS")).toBe("reels");
  });

  it("maps parent_id to kind reply", () => {
    const signal = mapGraphCommentToSignal(
      {
        id: "c2",
        text: "eu também",
        timestamp: "2026-09-11T10:00:00+0000",
        username: "ana",
        parent_id: "c1",
      },
      { igMediaId: "m1", mediaProductType: "REELS" },
    );
    expect(signal.kind).toBe("reply");
    expect(signal.place).toBe("reels");
    expect(signal.source).toBe("instagram_comment_reply");
  });
});
