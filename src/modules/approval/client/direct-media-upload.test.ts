import { describe, expect, it } from "vitest";
import { mapStorageError, resolveSignedUploadUrl, storageTusEndpoint } from "./direct-media-upload";

describe("direct-media-upload", () => {
  it("usa o hostname direto de storage para TUS", () => {
    expect(storageTusEndpoint("https://abc.supabase.co")).toBe(
      "https://abc.storage.supabase.co/storage/v1/upload/resumable",
    );
  });

  it("não altera host que já é storage", () => {
    expect(storageTusEndpoint("https://abc.storage.supabase.co")).toBe(
      "https://abc.storage.supabase.co/storage/v1/upload/resumable",
    );
  });

  it("explica 413 Maximum size exceeded (limite global do Storage)", () => {
    expect(
      mapStorageError(
        "tus: unexpected response while creating upload, originated from request (method: POST, url: https://x.storage.supabase.co/storage/v1/upload/resumable, response code: 413, response text: Maximum size exceeded , request id: n/a)",
      ),
    ).toMatch(/limite global/i);
  });

  it("não trata JWT inválido como formato", () => {
    expect(mapStorageError('{"statusCode":"400","error":"InvalidJwt","message":"Invalid JWT"}')).toBe(
      "O envio expirou. Toque em enviar de novo.",
    );
  });

  it("completa URL assinada relativa com token", () => {
    const url = resolveSignedUploadUrl(
      "/storage/v1/object/upload/sign/editorial-media/a.mp4",
      "https://abc.supabase.co",
      "tok",
    );
    expect(url).toContain("https://abc.supabase.co/storage/v1/object/upload/sign/");
    expect(url).toContain("token=tok");
  });
});
