import { describe, expect, it } from "vitest";
import {
  buildNextProductionStep,
  syncAutoChecklist,
} from "./build-next-production-step";
import { buildProductionChecklist } from "./build-production-checklist";

describe("buildNextProductionStep", () => {
  it("returns first pending required step copy", () => {
    const checklist = buildProductionChecklist("reels").map((c) =>
      c.id === "material_recebido" || c.id === "roteiro_aprovado" ? { ...c, done: true } : c,
    );
    const step = buildNextProductionStep({ formato: "reels", checklist });
    expect(step?.id).toBe("media_final");
    expect(step?.title).toBe("Anexe a mídia final");
  });

  it("returns null when all required done", () => {
    const checklist = buildProductionChecklist("estatico").map((c) => ({ ...c, done: true }));
    expect(buildNextProductionStep({ formato: "estatico", checklist })).toBeNull();
  });
});

describe("syncAutoChecklist", () => {
  it("marks media/legenda/material from attachments", () => {
    const checklist = buildProductionChecklist("estatico");
    const synced = syncAutoChecklist(
      {
        status: "producao",
        formato: "estatico",
        legenda: "Olá mundo",
        checklist,
      },
      [
        { media_role: "cliente_material", kind: "image" },
        { media_role: "final", kind: "image" },
      ],
    );
    expect(synced.find((c) => c.id === "material_recebido")?.done).toBe(true);
    expect(synced.find((c) => c.id === "roteiro_aprovado")?.done).toBe(true);
    expect(synced.find((c) => c.id === "media_final")?.done).toBe(true);
    expect(synced.find((c) => c.id === "legenda_cta")?.done).toBe(true);
  });
});
