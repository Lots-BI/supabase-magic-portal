import { describe, expect, it } from "vitest";
import { mapLeadForm } from "./map-lead-form";
import {
  classifyMetaGraphFailure,
  extractLeadFields,
  formOriginBadge,
  formOriginKind,
  instantFormContextLine,
  mapInstantFormSubmission,
  META_INSTANT_FORM_KEY,
  META_INSTANT_FORM_SOURCE,
  parseGraphLead,
  parseLeadCreatedAt,
  parseLeadgenFormList,
  parseLeadList,
} from "./meta-instant-form";

describe("mapLeadForm", () => {
  it("stores email and phone only from structured fields", () => {
    const mapped = mapLeadForm({
      id: "lead-1",
      createdTime: "2026-09-11T10:00:00.000Z",
      fieldData: [
        { name: "email", values: ["Ana@Marca.com"] },
        { name: "phone_number", values: ["11988887777"] },
        { name: "custom_question", values: ["meu outro email é x@y.com"] },
      ],
    });
    expect(mapped?.facts.map((fact) => fact.field).sort()).toEqual(["email", "phone"]);
    expect(
      mapped?.identities.some((item) => item.kind === "email" && item.value === "ana@marca.com"),
    ).toBe(true);
    expect(mapped?.facts.some((fact) => fact.value.includes("x@y.com"))).toBe(false);
    expect(mapped?.signal.body).toContain("x@y.com");
  });
});

describe("mapInstantFormSubmission", () => {
  it("tags the lead as a Meta instant form and keeps the campaign", () => {
    const row = mapInstantFormSubmission({
      id: "lead-9",
      createdTime: 1_700_000_000,
      campaignName: "Captação Rafa",
      adName: "Criativo 1",
      formName: "Quero entrar",
      platform: "ig",
      fieldData: [
        { name: "full_name", values: ["Maria Silva"] },
        { name: "email", values: ["maria@email.com"] },
        { name: "phone_number", values: ["+55 (11) 98888-7777"] },
        { name: "Qual seu Instagram?", values: ["https://instagram.com/mariasilva"] },
        { name: "Como nos achou?", values: ["meu email secreto é x@y.com"] },
      ],
    });
    expect(row?.formKey).toBe(META_INSTANT_FORM_KEY);
    expect(row?.source).toBe(META_INSTANT_FORM_SOURCE);
    expect(row?.nome).toBe("Maria Silva");
    expect(row?.email).toBe("maria@email.com");
    expect(row?.telefone).toBe("+5511988887777");
    expect(row?.instagram).toBe("mariasilva");
    expect(row?.utmSource).toBe("meta");
    expect(row?.utmMedium).toBe("instagram");
    expect(row?.utmCampaign).toBe("Captação Rafa");
    expect(row?.utmContent).toBe("Criativo 1");
    expect(row?.utmTerm).toBe("Quero entrar");
    expect(row?.mensagem).toContain("Como nos achou?");
    expect(row?.mensagem).not.toContain("maria@email.com");
    expect(row?.createdAt).toBe(new Date(1_700_000_000 * 1000).toISOString());
  });

  it("joins first and last name and ignores a free-text email", () => {
    const extracted = extractLeadFields([
      { name: "first_name", values: ["Ana"] },
      { name: "last_name", values: ["Souza"] },
      { name: "observacao", values: ["escrevi ana@x.com no meio"] },
    ]);
    expect(extracted.nome).toBe("Ana Souza");
    expect(extracted.email).toBeNull();
    expect(extracted.custom).toEqual([{ label: "observacao", value: "escrevi ana@x.com no meio" }]);
  });
});

describe("form origin", () => {
  it("keeps the landing key and labels instant forms", () => {
    expect(formOriginKind("landing", "landing-lotsbi")).toBe("landing");
    expect(formOriginBadge("landing", "landing-lotsbi")).toBe("landing-lotsbi");
    expect(formOriginKind(META_INSTANT_FORM_SOURCE, META_INSTANT_FORM_KEY)).toBe("meta_instant");
    expect(formOriginBadge(META_INSTANT_FORM_SOURCE, META_INSTANT_FORM_KEY)).toBe(
      "Formulário instantâneo",
    );
    expect(instantFormContextLine("Captação Rafa", "Criativo 1", "Quero entrar")).toBe(
      "Campanha · Captação Rafa",
    );
  });
});

describe("parseGraphLead", () => {
  it("reads field_data and campaign fields from the Graph payload", () => {
    const lead = parseGraphLead({
      id: "555",
      created_time: "2026-11-13T15:00:00+0000",
      campaign_id: "777",
      campaign_name: "Captação",
      platform: "fb",
      field_data: [{ name: "email", values: ["a@b.com"] }],
    });
    expect(lead?.id).toBe("555");
    expect(lead?.campaignName).toBe("Captação");
    expect(parseLeadCreatedAt(lead?.createdTime)).toBe("2026-11-13T15:00:00.000Z");
    const forms = parseLeadgenFormList({
      data: [{ id: "42", name: "Quero entrar", status: "ACTIVE" }],
    });
    expect(parseLeadList({ data: [{ id: "555", field_data: [] }] }, forms[0]!)).toEqual([
      expect.objectContaining({ id: "555", formId: "42", formName: "Quero entrar" }),
    ]);
  });
});

describe("classifyMetaGraphFailure", () => {
  it("asks for a retry on rate limit and skips missing leads permission", () => {
    expect(classifyMetaGraphFailure(429, "limit")).toBe("retry");
    expect(classifyMetaGraphFailure(400, "(#200) Requires leads_retrieval permission")).toBe(
      "skip",
    );
    expect(classifyMetaGraphFailure(400, "Tried accessing nonexisting field (campaign_name)")).toBe(
      "field",
    );
  });
});
