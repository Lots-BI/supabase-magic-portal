import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveInstagramPublishTarget } from "./resolve-instagram-publish-target.server";

function mockSupabase(tables: Record<string, unknown[]>) {
  return {
    from(table: string) {
      const result = { data: tables[table] ?? [], error: null };
      const chain: {
        select: () => unknown;
        eq: () => unknown;
        order: () => unknown;
        limit: () => Promise<typeof result>;
        then: (resolve: (value: typeof result) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown>;
      } = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: () => Promise.resolve(result),
        then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
      };
      return chain;
    },
  } as unknown as SupabaseClient;
}

const pages = [
  {
    id: "page-a",
    access_token: "PAGE_TOKEN",
    instagram_business_account: { id: "ig-a" },
  },
];

describe("resolveInstagramPublishTarget", () => {
  it("uses the Page token for the client's Instagram identity", async () => {
    const target = await resolveInstagramPublishTarget(
      mockSupabase({
        ph_connections: [{ id: "c1", status: "active" }],
        ph_identities: [
          { external_id: "ig-a", is_primary: true, identity_type: "instagram" },
          { external_id: "page-a", is_primary: false, identity_type: "page" },
        ],
      }),
      12,
      {
        retrieveToken: async () => ({ accessToken: "USER_TOKEN" }),
        fetchPages: async () => pages,
      },
    );
    expect(target).toEqual({ accessToken: "PAGE_TOKEN", igUserId: "ig-a" });
  });

  it("asks to reconnect when there is no Instagram connection", async () => {
    await expect(
      resolveInstagramPublishTarget(mockSupabase({ ph_connections: [], ph_identities: [] }), 12, {
        retrieveToken: async () => ({ accessToken: "USER_TOKEN" }),
        fetchPages: async () => pages,
      }),
    ).rejects.toThrow(/missing_connection/);
  });
});
