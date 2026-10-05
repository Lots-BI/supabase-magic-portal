import { describe, expect, it } from "vitest";
import {
  classifyDocument,
  isValidCpf,
  normalizeWhatsapp,
  resolveAcquisitionGate,
  slugFromName,
} from "./brazil-document";

describe("documento e funil", () => {
  it("aceita CPF válido e recusa sequência repetida", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(classifyDocument("52998224725")?.kind).toBe("cpf");
    expect(classifyDocument("11.444.777/0001-61")?.kind).toBe("cnpj");
  });

  it("normaliza WhatsApp brasileiro", () => {
    expect(normalizeWhatsapp("(11) 98888-7777")).toBe("5511988887777");
    expect(normalizeWhatsapp("123")).toBeNull();
  });

  it("não manda quem já é da Lots para o pedido", () => {
    expect(
      resolveAcquisitionGate({
        orgTablesReady: true,
        isPlatformOwner: false,
        hasMembership: true,
        hasClientAccess: false,
        applicationStatus: null,
      }),
    ).toBe("allow");
    expect(
      resolveAcquisitionGate({
        orgTablesReady: false,
        isPlatformOwner: false,
        hasMembership: false,
        hasClientAccess: false,
        applicationStatus: null,
      }),
    ).toBe("allow");
  });

  it("segura conta nova na espera e devolve recusado ao formulário", () => {
    expect(
      resolveAcquisitionGate({
        orgTablesReady: true,
        isPlatformOwner: false,
        hasMembership: false,
        hasClientAccess: false,
        applicationStatus: "pending",
      }),
    ).toBe("wait");
    expect(
      resolveAcquisitionGate({
        orgTablesReady: true,
        isPlatformOwner: false,
        hasMembership: false,
        hasClientAccess: false,
        applicationStatus: "approved",
      }),
    ).toBe("wait");
    expect(
      resolveAcquisitionGate({
        orgTablesReady: true,
        isPlatformOwner: false,
        hasMembership: false,
        hasClientAccess: false,
        applicationStatus: "rejected",
      }),
    ).toBe("form");
  });

  it("gera slug estável", () => {
    expect(slugFromName("Ágência Norte")).toBe("agencia-norte");
  });
});
