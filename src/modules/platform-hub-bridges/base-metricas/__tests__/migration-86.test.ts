import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("86_portfolio_overview_slot_metrics.sql", () => {
  const sql = readFileSync(
    resolve(process.cwd(), "supabase/migrations-official/86_portfolio_overview_slot_metrics.sql"),
    "utf8",
  );

  it("acrescenta conversas e seguidores no fim do RPC", () => {
    expect(sql).toContain("DROP FUNCTION IF EXISTS public.portfolio_overview(date, date)");
    expect(sql).toContain("meta_messaging_conversations_started double precision");
    expect(sql).toContain("instagram_followers_count double precision");
    expect(sql).toContain("n.metrica = 'messaging_conversations_started'");
    expect(sql).toContain("n.metrica = 'followers_count'");
    expect(sql).toContain("SECURITY DEFINER");
    expect(sql).toContain("TO authenticated, service_role");
  });
});
