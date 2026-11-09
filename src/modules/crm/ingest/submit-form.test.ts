import { describe, expect, it } from "vitest";
import { parseFormSubmitBody } from "./parse-form-submit";

describe("parseFormSubmitBody", () => {
  it("aceita payload PT da landing", () => {
    const parsed = parseFormSubmitBody({
      nome: "Maria Silva",
      email: "Maria@Email.com",
      instagram: "@maria",
      form_key: "landing-lotsbi",
      page_url: "https://exemplo.com/?utm_source=meta",
      utm_source: "meta",
    });
    expect(parsed).toMatchObject({
      nome: "Maria Silva",
      email: "maria@email.com",
      instagram: "maria",
      formKey: "landing-lotsbi",
      utmSource: "meta",
    });
  });

  it("exige ao menos um contato", () => {
    const parsed = parseFormSubmitBody({ nome: "Só nome" });
    expect(parsed).toEqual({
      error: "Informe pelo menos um contato: email, instagram ou telefone.",
    });
  });

  it("rejeita email inválido", () => {
    const parsed = parseFormSubmitBody({ nome: "A", email: "sem-arroba" });
    expect(parsed).toEqual({ error: "email inválido." });
  });
});
