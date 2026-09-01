import { describe, expect, it } from "vitest";
import { MockHttpClient } from "@/modules/platform-hub/plugins/_internal/http/mock-http-client";
import { discoverInstagramOrganicIdentities } from "../instagram-organic-identity-discovery";

describe("discoverInstagramOrganicIdentities", () => {
  it("lista páginas e perfis Instagram sem chamar endpoints de Ads", async () => {
    const http = new MockHttpClient([
      {
        match: (url) => url.includes("/me/accounts"),
        respond: () => ({
          body: {
            data: [
              {
                id: "page-1",
                name: "Página A",
                instagram_business_account: { id: "ig-1", username: "marca_a" },
              },
              {
                id: "page-2",
                name: "Página B",
              },
            ],
          },
        }),
      },
    ]);

    const identities = await discoverInstagramOrganicIdentities(http, "token");
    expect(identities).toEqual([
      { identityType: "page", externalId: "page-1", label: "Página A" },
      {
        identityType: "instagram",
        externalId: "ig-1",
        label: "@marca_a",
        parentLabel: "Página A",
      },
      { identityType: "page", externalId: "page-2", label: "Página B" },
    ]);
  });
});
