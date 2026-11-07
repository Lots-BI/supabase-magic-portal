import { describe, expect, it, vi } from "vitest";
import type { OperationalReport } from "@/modules/operational-report/types";
import {
  executeReportAnalystAsk,
  reportAnalystInputSchema,
  type ReportAnalystDeps,
} from "./report-analyst.server";
import type { ReportAnalystPort } from "./report-analyst.port";

const report: OperationalReport = {
  clienteNome: "Acme",
  cadastroClienteId: 7,
  clienteSlug: "acme",
  period: {
    from: "2026-09-01",
    to: "2026-09-10",
    prevFrom: "2026-08-22",
    prevTo: "2026-08-31",
    label: "1–10 set",
    days: 10,
  },
  reading: { headline: "Investiu R$ 200.", mood: "steady", moodLabel: "Estável" },
  heroes: [],
  movers: [],
  pulse: null,
  mix: [],
  platforms: [],
  posts: null,
  content: null,
  coverage: { withData: ["Meta Ads"], withoutData: [], notes: [] },
};

function port(overrides: Partial<ReportAnalystPort> = {}): ReportAnalystPort {
  return {
    isConfigured: () => true,
    complete: vi.fn(async () => ({ ok: true as const, text: "Resposta curta." })),
    ...overrides,
  };
}

function deps(overrides: Partial<ReportAnalystDeps> = {}): ReportAnalystDeps {
  return {
    loadReport: vi.fn(async () => report),
    countToday: vi.fn(async () => 0),
    record: vi.fn(async () => undefined),
    port: port(),
    now: new Date("2026-09-10T15:00:00.000Z"),
    ...overrides,
  };
}

const input = {
  cadastroClienteId: 7,
  preset: "last_30" as const,
  question: "O que mudou?",
  history: [],
};

describe("executeReportAnalystAsk", () => {
  it("degrada sem chave e não consulta uso nem o relatório", async () => {
    const used = deps({ port: port({ isConfigured: () => false }) });
    const result = await executeReportAnalystAsk({ userId: "user-1" }, input, used);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("not_configured");
    expect(used.loadReport).not.toHaveBeenCalled();
    expect(used.countToday).not.toHaveBeenCalled();
    expect(used.record).not.toHaveBeenCalled();
  });

  it("recusa a 30ª pergunta do dia sem chamar o modelo", async () => {
    const analyst = port();
    const used = deps({ countToday: vi.fn(async () => 30), port: analyst });
    const result = await executeReportAnalystAsk({ userId: "user-1" }, input, used);
    expect(result).toMatchObject({ ok: false, code: "rate_limited" });
    expect(analyst.complete).not.toHaveBeenCalled();
    expect(used.record).not.toHaveBeenCalled();
  });

  it("manda no máximo 8 mensagens e grava só a resposta ok", async () => {
    const analyst = port();
    const used = deps({ port: analyst });
    const history = Array.from({ length: 8 }, (_, index) => ({
      role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `turno ${index}`,
    }));
    const result = await executeReportAnalystAsk({ userId: "user-1" }, { ...input, history }, used);
    expect(result).toEqual({ ok: true, answer: "Resposta curta." });
    expect(analyst.complete).toHaveBeenCalledOnce();
    const sent = vi.mocked(analyst.complete).mock.calls[0]?.[0];
    expect(sent?.messages).toHaveLength(8);
    expect(sent?.messages.at(-1)).toEqual({ role: "user", content: "O que mudou?" });
    expect(sent?.system).toContain("Acme");
    expect(sent?.system).toContain("Meta Ads");
    expect(used.record).toHaveBeenCalledOnce();
  });

  it("não conta falha do modelo", async () => {
    const used = deps({
      port: port({
        complete: vi.fn(async () => ({
          ok: false as const,
          code: "upstream" as const,
          message: "x",
        })),
      }),
    });
    const result = await executeReportAnalystAsk({ userId: "user-1" }, input, used);
    expect(result).toMatchObject({ ok: false, code: "upstream" });
    expect(used.record).not.toHaveBeenCalled();
  });
});

describe("reportAnalystInputSchema", () => {
  it("rejeita histórico acima de 8 turnos", () => {
    const history = Array.from({ length: 9 }, () => ({ role: "user" as const, content: "oi" }));
    expect(() => reportAnalystInputSchema.parse({ ...input, history })).toThrow();
  });
});
