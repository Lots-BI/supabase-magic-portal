import { describe, expect, it } from "vitest";
import {
  composeRoteiroHtml,
  isRoteiroHtmlEmpty,
  parseRoteiroScenes,
} from "./roteiro-scenes";

describe("parseRoteiroScenes", () => {
  it("lê seções data-scene", () => {
    const html = composeRoteiroHtml({
      gancho: "<p>Abre</p>",
      meio: "<p>Desenvolve</p>",
      cta: "<p>Fecha</p>",
    });
    expect(parseRoteiroScenes(html)).toEqual({
      gancho: "<p>Abre</p>",
      meio: "<p>Desenvolve</p>",
      cta: "<p>Fecha</p>",
    });
  });

  it("quebra HTML legado em primeiro / meio / último bloco", () => {
    const html = "<p>Um</p><p>Dois</p><p>Três</p>";
    expect(parseRoteiroScenes(html)).toEqual({
      gancho: "<p>Um</p>",
      meio: "<p>Dois</p>",
      cta: "<p>Três</p>",
    });
  });

  it("usa títulos gancho/meio/cta quando existirem", () => {
    const html = "<h2>Gancho</h2><p>Abre</p><h2>Meio</h2><p>Corpo</p><h2>CTA</h2><p>Fecha</p>";
    expect(parseRoteiroScenes(html)).toEqual({
      gancho: "<p>Abre</p>",
      meio: "<p>Corpo</p>",
      cta: "<p>Fecha</p>",
    });
  });
});

describe("composeRoteiroHtml", () => {
  it("roundtrip estável", () => {
    const scenes = { gancho: "<p>A</p>", meio: "<p>B</p>", cta: "<p>C</p>" };
    expect(parseRoteiroScenes(composeRoteiroHtml(scenes))).toEqual(scenes);
  });
});

describe("isRoteiroHtmlEmpty", () => {
  it("trata parágrafo vazio como vazio", () => {
    expect(isRoteiroHtmlEmpty("<p></p>")).toBe(true);
    expect(isRoteiroHtmlEmpty("<p>Oi</p>")).toBe(false);
  });
});
