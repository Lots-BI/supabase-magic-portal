import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("90_hub_ad_account_id.sql", () => {
  const sql = readFileSync(
    resolve(process.cwd(), "supabase/migrations-official/90_hub_ad_account_id.sql"),
    "utf8",
  );

  it("isola a série Hub por conta de anúncios sem tocar em fin_*", () => {
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS ad_account_id text");
    expect(sql).toContain("COALESCE(ad_account_id, ''::text)");
    expect(sql).toContain("h.ad_account_id IS NOT DISTINCT FROM v_ad_account");
    expect(sql).toContain("COALESCE(NULLIF(btrim(COALESCE(r->>'ad_account_id', '')), ''), v_ad_account)");
    expect(sql).toContain("dashboard_meta_ad_accounts");
    expect(sql).toContain("ph_campaign_status");
    expect(sql).not.toContain("PRIMARY KEY (cliente, plataforma, campanha, ad_account_id)");
    expect(sql).not.toMatch(/\bfin_(cobrancas|nfse|pagamentos|recibos|config)\b/);
  });
});
