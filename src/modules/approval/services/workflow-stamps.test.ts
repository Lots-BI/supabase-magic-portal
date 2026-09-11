import { describe, expect, it } from "vitest";
import type { ContentCard } from "../types/content-card";
import {
  agencyActionKind,
  agencyTurnCards,
  clientTurnCards,
  publicationDayNumber,
  stampForStatus,
} from "./workflow-stamps";

function card(partial: Partial<ContentCard> & Pick<ContentCard, "id" | "status">): ContentCard {
  return {
    cadastro_cliente_id: 1,
    cliente_nome: "Test",
    data_publicacao: "2026-09-12",
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
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...partial,
  };
}

describe("workflow stamps", () => {
  it("agrupa os 9 status em 5 selos", () => {
    expect(stampForStatus("roteiro")?.label).toBe("Ideia");
    expect(stampForStatus("aguardando_aprovacao")?.label).toBe("Cliente");
    expect(stampForStatus("producao")?.label).toBe("Peça");
    expect(stampForStatus("aguardando_aprovacao_final")?.label).toBe("Cliente");
    expect(stampForStatus("publicado")?.label).toBe("No ar");
  });

  it("separa vez da agência e vez do cliente", () => {
    const cards = [
      card({ id: "a", status: "roteiro" }),
      card({ id: "b", status: "aguardando_aprovacao" }),
      card({ id: "c", status: "producao" }),
      card({ id: "d", status: "aguardando_aprovacao_final" }),
      card({ id: "e", status: "agendado" }),
    ];
    expect(agencyTurnCards(cards).map((c) => c.id)).toEqual(["a", "c"]);
    expect(clientTurnCards(cards).map((c) => c.id)).toEqual(["b", "d"]);
  });

  it("nomeia a ação da agência", () => {
    expect(agencyActionKind("roteiro")).toBe("escrever");
    expect(agencyActionKind("aguardando_material")).toBe("baixar");
    expect(agencyActionKind("producao")).toBe("editar");
    expect(agencyActionKind("aguardando_aprovacao")).toBeNull();
  });

  it("extrai o dia da data ISO", () => {
    expect(publicationDayNumber("2026-09-11")).toBe("11");
  });
});
