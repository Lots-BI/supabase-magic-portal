import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../repositories/content-card.repository.server", () => ({
  contentCardRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("./client-access.server", () => ({
  assertCardInClientAccess: vi.fn(async () => undefined),
}));

const createSignedUploadUrl = vi.fn(async () => ({
  data: { path: "content-cards/c1/123-file.mp4", token: "tok", signedUrl: "https://x/upload" },
  error: null,
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  getSupabaseAdmin: vi.fn(() => ({
    storage: { from: () => ({ createSignedUploadUrl }) },
  })),
}));

import { contentCardRepository } from "../repositories/content-card.repository.server";
import { createDirectUploadTicket } from "./attachment-lifecycle.server";

const clientActor = { userId: "u1", email: "client@test.com", role: "cliente" as const };

const baseCard = {
  id: "c1",
  cadastro_cliente_id: 1,
  cliente_nome: "Acme",
};

const uploadInput = {
  cardId: "c1",
  fileName: "video.mp4",
  mimeType: "video/mp4",
  fileSize: 1024,
};

describe("createDirectUploadTicket — cliente_material", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSignedUploadUrl.mockResolvedValue({
      data: { path: "content-cards/c1/123-file.mp4", token: "tok", signedUrl: "https://x/upload" },
      error: null,
    });
  });

  it("permite envio quando o roteiro já foi aprovado (aguardando_material)", async () => {
    vi.mocked(contentCardRepository.findById).mockResolvedValue({
      ...baseCard,
      status: "aguardando_material",
    } as never);

    const ticket = await createDirectUploadTicket({} as never, clientActor, uploadInput);
    expect(ticket.mediaRole).toBe("cliente_material");
  });

  it("bloqueia envio antes da aprovação do roteiro (aguardando_aprovacao)", async () => {
    vi.mocked(contentCardRepository.findById).mockResolvedValue({
      ...baseCard,
      status: "aguardando_aprovacao",
    } as never);

    await expect(createDirectUploadTicket({} as never, clientActor, uploadInput)).rejects.toThrow(
      /depois de aprovar o roteiro/,
    );
  });

  it("bloqueia envio fora da janela do cliente (producao)", async () => {
    vi.mocked(contentCardRepository.findById).mockResolvedValue({
      ...baseCard,
      status: "producao",
    } as never);

    await expect(createDirectUploadTicket({} as never, clientActor, uploadInput)).rejects.toThrow(
      /depois de aprovar o roteiro/,
    );
  });
});
