import { describe, expect, it } from "vitest";
import { arquivosDaPastaRecursivos } from "./BibliotecaPanel";

describe("arquivosDaPastaRecursivos", () => {
  it("junta os arquivos da pasta e das subpastas com o caminho relativo", () => {
    const folders = [
      { id: "pai", parentId: null, nome: "07/10 — Evento" },
      { id: "sub", parentId: "pai", nome: "Bastidores" },
    ];
    const files = [
      {
        id: "a",
        folderId: "pai",
        nome: "capa.jpg",
        url: "https://x/a",
        downloadUrl: "https://x/a-dl",
        mimeType: "image/jpeg",
      },
      {
        id: "b",
        folderId: "sub",
        nome: "take.mp4",
        url: "https://x/b",
        downloadUrl: "https://x/b-dl",
        mimeType: "video/mp4",
      },
    ];
    expect(arquivosDaPastaRecursivos("pai", folders, files, "07-10 Evento")).toEqual([
      { url: "https://x/a-dl", fileName: "capa.jpg", relativeDir: "07-10 Evento" },
      { url: "https://x/b-dl", fileName: "take.mp4", relativeDir: "07-10 Evento/Bastidores" },
    ]);
  });
});
