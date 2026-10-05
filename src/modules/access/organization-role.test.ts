import { describe, expect, it } from "vitest";
import {
  findCrossOrgNameClash,
  memberRolesGrantOperations,
  pickWriteOrganization,
} from "./organization-role";
import { resolvePostAuthDestination } from "./services/resolve-post-auth-destination";

describe("organization roles", () => {
  it("trata dono e social como operação, e cliente como fora do painel", () => {
    expect(memberRolesGrantOperations(["cliente"])).toBe(false);
    expect(memberRolesGrantOperations(["visualizador"])).toBe(false);
    expect(memberRolesGrantOperations(["owner"])).toBe(true);
    expect(memberRolesGrantOperations(["social_media"])).toBe(true);
  });

  it("não deixa um gestor escrever na organização de outra agência", () => {
    expect(() =>
      pickWriteOrganization({
        isPlatformOwner: false,
        manageableOrganizationIds: ["lots"],
        requestedOrganizationId: "norte",
      }),
    ).toThrow(/Forbidden/);
  });

  it("usa a única org do gestor e a Lots quando o operador não escolhe", () => {
    expect(
      pickWriteOrganization({
        isPlatformOwner: false,
        manageableOrganizationIds: ["norte"],
      }),
    ).toBe("norte");
    expect(
      pickWriteOrganization({
        isPlatformOwner: true,
        manageableOrganizationIds: [],
        lotsOrganizationId: "lots",
      }),
    ).toBe("lots");
  });

  it("recusa o mesmo nome de cliente em outra organização", () => {
    expect(
      findCrossOrgNameClash(
        [{ organization_id: "lots", nome_cliente: "Padaria Sol" }],
        "padaria sol",
        "norte",
      ),
    ).toBe(true);
    expect(
      findCrossOrgNameClash(
        [{ organization_id: "norte", nome_cliente: "Padaria Sol" }],
        "Padaria Sol",
        "norte",
      ),
    ).toBe(false);
  });

  it("manda staff operacional para o admin e o cliente final para o dashboard", () => {
    expect(resolvePostAuthDestination(true, null)).toBe("/admin");
    expect(resolvePostAuthDestination(false, null)).toBe("/dashboard");
    expect(resolvePostAuthDestination(false, "/aprovacoes")).toBe("/aprovacoes");
    expect(resolvePostAuthDestination(true, "//evil")).toBe("/admin");
  });
});
