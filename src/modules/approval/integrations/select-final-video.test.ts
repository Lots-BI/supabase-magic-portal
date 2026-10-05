import { describe, expect, it } from "vitest";
import { selectFinalVideo } from "./select-final-video";

describe("selectFinalVideo", () => {
  it("escolhe o vídeo final e ignora imagem", () => {
    const video = selectFinalVideo([
      { media_role: "final", mime_type: "image/jpeg", kind: "image", ordem: 0 },
      { media_role: "final", mime_type: "video/mp4", kind: "video", ordem: 1 },
    ]);
    expect(video?.mime_type).toBe("video/mp4");
  });

  it("não usa vídeo que não é a mídia final", () => {
    expect(
      selectFinalVideo([
        { media_role: "preview", mime_type: "video/mp4", kind: "video", ordem: 0 },
      ]),
    ).toBeNull();
  });
});
