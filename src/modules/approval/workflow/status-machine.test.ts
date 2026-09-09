import { describe, expect, it } from "vitest";
import {
  assertValidTransition,
  canClientTransitionStatus,
  canTransitionStatus,
} from "./status-machine";

describe("status-machine", () => {
  it("allows valid admin transitions", () => {
    expect(canTransitionStatus("roteiro", "aguardando_aprovacao")).toBe(true);
    expect(canTransitionStatus("aguardando_aprovacao", "aguardando_material")).toBe(true);
    expect(canTransitionStatus("aguardando_aprovacao", "alteracoes_roteiro")).toBe(true);
    expect(canTransitionStatus("alteracoes_roteiro", "aguardando_aprovacao")).toBe(true);
    expect(canTransitionStatus("aguardando_material", "producao")).toBe(true);
    expect(canTransitionStatus("producao", "aguardando_aprovacao_final")).toBe(true);
    expect(canTransitionStatus("aguardando_aprovacao_final", "agendado")).toBe(true);
    expect(canTransitionStatus("aguardando_aprovacao_final", "alteracoes_design")).toBe(true);
    expect(canTransitionStatus("alteracoes_design", "aguardando_aprovacao_final")).toBe(true);
    expect(canTransitionStatus("agendado", "publicado")).toBe(true);
    expect(canTransitionStatus("edicao", "producao")).toBe(true);
    expect(canTransitionStatus("aprovado", "agendado")).toBe(true);
  });

  it("blocks invalid transitions", () => {
    expect(canTransitionStatus("publicado", "producao")).toBe(false);
    expect(canTransitionStatus("arquivado", "producao")).toBe(false);
  });

  it("assertValidTransition throws on invalid", () => {
    expect(() => assertValidTransition("publicado", "producao")).toThrow();
  });

  it("allows client approval transitions", () => {
    expect(canClientTransitionStatus("aguardando_aprovacao", "aguardando_material")).toBe(true);
    expect(canClientTransitionStatus("aguardando_aprovacao", "alteracoes_roteiro")).toBe(true);
    expect(canClientTransitionStatus("aguardando_aprovacao", "roteiro")).toBe(false);
    expect(canClientTransitionStatus("aguardando_aprovacao_final", "agendado")).toBe(true);
    expect(canClientTransitionStatus("aguardando_aprovacao_final", "alteracoes_design")).toBe(true);
    expect(canClientTransitionStatus("aguardando_aprovacao_final", "producao")).toBe(false);
    expect(canClientTransitionStatus("producao", "agendado")).toBe(false);
  });
});
