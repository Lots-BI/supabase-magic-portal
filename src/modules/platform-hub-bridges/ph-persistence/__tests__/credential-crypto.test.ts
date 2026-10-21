import { afterEach, describe, expect, it } from "vitest";
import {
  decryptCredentialPayload,
  encryptCredentialPayload,
  listVaultSecrets,
} from "../credential-crypto";

const previousHub = process.env.HUB_CREDENTIAL_ENCRYPTION_KEY;
const previousRole = process.env.OFFICIAL_SERVICE_ROLE_KEY;

afterEach(() => {
  if (previousHub === undefined) delete process.env.HUB_CREDENTIAL_ENCRYPTION_KEY;
  else process.env.HUB_CREDENTIAL_ENCRYPTION_KEY = previousHub;
  if (previousRole === undefined) delete process.env.OFFICIAL_SERVICE_ROLE_KEY;
  else process.env.OFFICIAL_SERVICE_ROLE_KEY = previousRole;
});

describe("credential vault secrets", () => {
  it("abre token gravado só com a service role quando a chave dedicada falta", () => {
    delete process.env.HUB_CREDENTIAL_ENCRYPTION_KEY;
    process.env.OFFICIAL_SERVICE_ROLE_KEY = "legacy-service-role";
    const encoded = encryptCredentialPayload({ version: 1, data: { access_token: "tok" } });
    expect(listVaultSecrets()).toEqual(["legacy-service-role"]);
    expect(decryptCredentialPayload(encoded).data.access_token).toBe("tok");
  });

  it("lê blob antigo da service role mesmo com chave dedicada nova", () => {
    process.env.OFFICIAL_SERVICE_ROLE_KEY = "legacy-service-role";
    delete process.env.HUB_CREDENTIAL_ENCRYPTION_KEY;
    const encoded = encryptCredentialPayload({ version: 1, data: { access_token: "old" } });
    process.env.HUB_CREDENTIAL_ENCRYPTION_KEY = "dedicated-key";
    expect(decryptCredentialPayload(encoded).data.access_token).toBe("old");
  });

  it("falha só quando nenhuma chave existe", () => {
    delete process.env.HUB_CREDENTIAL_ENCRYPTION_KEY;
    delete process.env.OFFICIAL_SERVICE_ROLE_KEY;
    expect(() => listVaultSecrets()).not.toThrow();
    expect(listVaultSecrets()).toEqual([]);
    expect(() => encryptCredentialPayload({ version: 1, data: {} })).toThrow(
      /Missing HUB_CREDENTIAL_ENCRYPTION_KEY/,
    );
  });
});
