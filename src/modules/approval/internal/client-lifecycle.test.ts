import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../repositories/content-card.repository.server", () => ({
  contentCardRepository: {
    findById: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("../repositories/content-card-event.repository.server", () => ({
  contentCardEventRepository: {
    append: vi.fn(async () => ({ id: "e1" })),
  },
}));

vi.mock("./client-access.server", () => ({
  assertCardInClientAccess: vi.fn(async () => undefined),
}));

const adminClient = { __admin: true };

vi.mock("@/integrations/supabase/client.server", () => ({
  getSupabaseAdmin: vi.fn(() => adminClient),
}));

vi.mock("@/modules/notifications/insert-app-notifications.server", () => ({
  insertAppNotifications: vi.fn(async () => undefined),
}));

import { contentCardRepository } from "../repositories/content-card.repository.server";
import { contentCardEventRepository } from "../repositories/content-card-event.repository.server";
import { clientApproveCard, clientRequestChanges } from "./client-lifecycle.server";

const actor = { userId: "u1", email: "client@test.com", role: "cliente" as const };
const supabase = {} as never;

const baseCard = {
  id: "c1",
  cadastro_cliente_id: 1,
  cliente_nome: "Acme",
  data_publicacao: "2026-09-10",
  hora_publicacao: "10:00:00",
  checklist: [],
};

describe("client-lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("approves roteiro → aguardando_material", async () => {
    vi.mocked(contentCardRepository.findById).mockResolvedValue({
      ...baseCard,
      status: "aguardando_aprovacao",
    } as never);
    vi.mocked(contentCardRepository.update).mockResolvedValue({
      ...baseCard,
      status: "aguardando_material",
    } as never);

    const result = await clientApproveCard(supabase, actor, {
      card_id: "c1",
      legenda: "  Legenda do post  ",
    });
    expect(contentCardRepository.update).toHaveBeenCalledWith(
      adminClient,
      "c1",
      expect.objectContaining({ status: "aguardando_material", legenda: "Legenda do post" }),
    );
    expect(contentCardEventRepository.append).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({ event_type: "approved" }),
    );
    expect(result.status).toBe("aguardando_material");
  });

  it("approves roteiro even without media anexada (mídia vem depois)", async () => {
    vi.mocked(contentCardRepository.findById).mockResolvedValue({
      ...baseCard,
      status: "aguardando_aprovacao",
    } as never);
    vi.mocked(contentCardRepository.update).mockResolvedValue({
      ...baseCard,
      status: "aguardando_material",
    } as never);

    const result = await clientApproveCard(supabase, actor, { card_id: "c1" });
    expect(result.status).toBe("aguardando_material");
  });

  it("rejects approve when not awaiting approval", async () => {
    vi.mocked(contentCardRepository.findById).mockResolvedValue({
      ...baseCard,
      status: "producao",
    } as never);
    await expect(clientApproveCard(supabase, actor, { card_id: "c1" })).rejects.toThrow(
      /aguardando aprovação/,
    );
  });

  it("approves final piece using the creation schedule", async () => {
    vi.mocked(contentCardRepository.findById).mockResolvedValue({
      ...baseCard,
      status: "aguardando_aprovacao_final",
      scheduled_publish_at: "2026-09-10T19:00:00.000Z",
    } as never);
    vi.mocked(contentCardRepository.update).mockResolvedValue({
      ...baseCard,
      status: "agendado",
      publish_status: "scheduled",
    } as never);

    await clientApproveCard(supabase, actor, { card_id: "c1" });
    expect(contentCardRepository.update).toHaveBeenCalledWith(
      adminClient,
      "c1",
      expect.objectContaining({
        status: "agendado",
        publish_status: "scheduled",
        scheduled_publish_at: "2026-09-10T19:00:00.000Z",
      }),
    );
  });

  it("request changes moves roteiro to alteracoes_roteiro", async () => {
    vi.mocked(contentCardRepository.findById).mockResolvedValue({
      ...baseCard,
      status: "aguardando_aprovacao",
    } as never);
    vi.mocked(contentCardRepository.update).mockResolvedValue({
      ...baseCard,
      status: "alteracoes_roteiro",
    } as never);

    await clientRequestChanges(supabase, actor, {
      card_id: "c1",
      mensagem: "Ajustar CTA",
      roteiro: "<p>Novo gancho e CTA</p>",
    });
    expect(contentCardRepository.update).toHaveBeenCalledWith(
      adminClient,
      "c1",
      expect.objectContaining({
        status: "alteracoes_roteiro",
        roteiro: "<p>Novo gancho e CTA</p>",
      }),
    );
    expect(contentCardEventRepository.append).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        event_type: "changes_requested",
        payload: expect.objectContaining({
          mensagem: "Ajustar CTA",
          status_para: "alteracoes_roteiro",
        }),
      }),
    );
  });

  it("grava o roteiro editado mesmo sem mensagem avulsa", async () => {
    vi.mocked(contentCardRepository.findById).mockResolvedValue({
      ...baseCard,
      status: "aguardando_aprovacao",
    } as never);
    vi.mocked(contentCardRepository.update).mockResolvedValue({
      ...baseCard,
      status: "alteracoes_roteiro",
    } as never);

    await clientRequestChanges(supabase, actor, {
      card_id: "c1",
      roteiro: "<p>Trocar o gancho</p>",
    });
    expect(contentCardRepository.update).toHaveBeenCalledWith(
      adminClient,
      "c1",
      expect.objectContaining({
        status: "alteracoes_roteiro",
        roteiro: "<p>Trocar o gancho</p>",
      }),
    );
  });

  it("exige texto ao pedir alteração da peça final", async () => {
    vi.mocked(contentCardRepository.findById).mockResolvedValue({
      ...baseCard,
      status: "aguardando_aprovacao_final",
    } as never);
    await expect(
      clientRequestChanges(supabase, actor, { card_id: "c1", mensagem: "   " }),
    ).rejects.toThrow(/Descreva a alteração/);
  });

  it("request changes on final piece moves to alteracoes_design via admin", async () => {
    vi.mocked(contentCardRepository.findById).mockResolvedValue({
      ...baseCard,
      status: "aguardando_aprovacao_final",
      checklist: [{ id: "preview_ok", label: "Preview", done: true }],
    } as never);
    vi.mocked(contentCardRepository.update).mockResolvedValue({
      ...baseCard,
      status: "alteracoes_design",
    } as never);

    await clientRequestChanges(supabase, actor, {
      card_id: "c1",
      mensagem: "Trocar o corte do vídeo",
    });
    expect(contentCardRepository.update).toHaveBeenCalledWith(
      adminClient,
      "c1",
      expect.objectContaining({ status: "alteracoes_design" }),
    );
  });
});
