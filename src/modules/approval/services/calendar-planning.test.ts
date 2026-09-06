import { describe, expect, it } from "vitest";
import {
  isoDay,
  resolveCalendarRange,
  mondayOfWeek,
  storyDiaFromDate,
} from "./calendar-date-utils";
import { groupCardsByDate, buildPillarMap } from "./group-cards-by-date";
import type { ContentCard } from "../types/content-card";

function card(
  partial: Partial<ContentCard> & { id: string; data_publicacao: string },
): ContentCard {
  return {
    cadastro_cliente_id: 1,
    cliente_nome: "Cliente",
    titulo: "T",
    status: "producao",
    kanban_ordem: 0,
    plataforma: "instagram",
    formato: null,
    linha_editorial: null,
    tema: null,
    legenda: null,
    copy_text: null,
    roteiro: null,
    direcao_arte: null,
    cta: null,
    observacoes: null,
    responsavel_email: null,
    responsavel_user_id: null,
    pilar_id: null,
    estrategia_id: null,
    hora_publicacao: null,
    capa_url: null,
    localizacao: null,
    tags: null,
    checklist: [],
    ai_metadata: {},
    integration_metadata: {},
    legacy_post_id: null,
    published_at: null,
    archived_at: null,
    publish_status: "none",
    scheduled_publish_at: null,
    publish_target: null,
    external_post_id: null,
    publish_container_id: null,
    publish_error: null,
    publish_attempted_at: null,
    created_by: null,
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

describe("calendar-date-utils", () => {
  it("resolveCalendarRange month", () => {
    expect(resolveCalendarRange("month", "2026-07-15")).toEqual({
      from: "2026-07-01",
      to: "2026-07-31",
    });
  });

  it("resolveCalendarRange day", () => {
    expect(resolveCalendarRange("day", "2026-07-15")).toEqual({
      from: "2026-07-15",
      to: "2026-07-15",
    });
  });

  it("mondayOfWeek returns Monday", () => {
    expect(mondayOfWeek("2026-07-05")).toBe("2026-06-29");
  });

  it("storyDiaFromDate maps Monday to 0", () => {
    expect(storyDiaFromDate("2026-07-06")).toBe(0);
  });

  it("isoDay roundtrip", () => {
    const d = new Date(2026, 6, 15);
    expect(isoDay(d)).toBe("2026-07-15");
  });
});

describe("groupCardsByDate", () => {
  it("groups and sorts by hora", () => {
    const map = groupCardsByDate([
      card({ id: "b", data_publicacao: "2026-07-01", hora_publicacao: "14:00:00", titulo: "B" }),
      card({ id: "a", data_publicacao: "2026-07-01", hora_publicacao: "09:00:00", titulo: "A" }),
    ]);
    expect(map.get("2026-07-01")?.map((c) => c.id)).toEqual(["a", "b"]);
  });
});

describe("buildPillarMap", () => {
  it("indexes by id", () => {
    const map = buildPillarMap([
      {
        id: "p1",
        titulo: "Educação",
        cor: "#fff",
        objetivo: "Ensinar",
      },
    ]);
    expect(map.p1?.titulo).toBe("Educação");
  });
});
