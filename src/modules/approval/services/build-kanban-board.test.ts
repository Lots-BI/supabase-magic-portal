import { describe, expect, it } from "vitest";
import { buildKanbanBoard } from "./build-kanban-board";
import type { ContentCard } from "../types/content-card";

function card(partial: Partial<ContentCard> & Pick<ContentCard, "id" | "status">): ContentCard {
  return {
    cadastro_cliente_id: 1,
    cliente_nome: "Test",
    data_publicacao: "2026-07-01",
    hora_publicacao: null,
    titulo: "T",
    legenda: null,
    copy_text: null,
    roteiro: null,
    direcao_arte: null,
    cta: null,
    plataforma: "instagram",
    formato: null,
    linha_editorial: null,
    tema: null,
    capa_url: null,
    checklist: [],
    localizacao: null,
    tags: null,
    observacoes: null,
    responsavel_email: null,
    responsavel_user_id: null,
    pilar_id: null,
    estrategia_id: null,
    kanban_ordem: 0,
    published_at: null,
    archived_at: null,
    publish_status: "none",
    scheduled_publish_at: null,
    publish_target: null,
    external_post_id: null,
    publish_container_id: null,
    publish_error: null,
    publish_attempted_at: null,
    ai_metadata: {},
    integration_metadata: {},
    legacy_post_id: null,
    created_by: null,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    ...partial,
  };
}

describe("buildKanbanBoard", () => {
  it("groups cards by status and sorts by kanban_ordem", () => {
    const board = buildKanbanBoard([
      card({ id: "a", status: "producao", kanban_ordem: 2, titulo: "B" }),
      card({ id: "b", status: "producao", kanban_ordem: 1, titulo: "A" }),
      card({ id: "c", status: "aguardando_aprovacao", kanban_ordem: 0, titulo: "C" }),
      card({ id: "d", status: "arquivado", kanban_ordem: 0, titulo: "Hidden" }),
      card({ id: "e", status: "edicao", kanban_ordem: 0, titulo: "Legacy" }),
    ]);
    const producao = board.columns.find((c) => c.status === "producao")!;
    expect(producao.cards.map((c) => c.id)).toEqual(["b", "a"]);
    expect(board.columns.find((c) => c.status === "aguardando_aprovacao")!.cards).toHaveLength(1);
    expect(board.columns.some((c) => c.status === "edicao")).toBe(false);
    expect(board.columns.map((c) => c.status)).toEqual([
      "roteiro",
      "aguardando_aprovacao",
      "aguardando_material",
      "producao",
      "aguardando_aprovacao_final",
      "agendado",
      "publicado",
    ]);
  });
});
