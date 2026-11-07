import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveIsAdmin } from "@/lib/owner-admin";
import { brtToday } from "@/lib/period";
import type { PeriodPreset } from "@/lib/period";
import {
  loadClientOperationalReport,
  type OperationalReportQuery,
} from "@/modules/operational-report/operational-report.server";
import type { OperationalReport } from "@/modules/operational-report/types";
import { createAnthropicReportAnalyst } from "./anthropic-report-analyst.server";
import {
  REPORT_ANALYST_DAILY_LIMIT,
  REPORT_ANALYST_HISTORY_CAP,
  buildReportAnalystContext,
  renderReportAnalystSystem,
} from "./report-analyst-context";
import type { ReportAnalystPort, ReportAnalystTurn } from "./report-analyst.port";

const PRESETS: PeriodPreset[] = [
  "today",
  "yesterday",
  "last_7",
  "last_30",
  "last_90",
  "this_month",
  "last_month",
  "custom",
];

const turnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

export const reportAnalystInputSchema = z.object({
  cadastroClienteId: z.number().int().positive(),
  preset: z.enum(PRESETS as [PeriodPreset, ...PeriodPreset[]]),
  customFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  customTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  question: z.string().trim().min(1).max(2000),
  history: z.array(turnSchema).max(REPORT_ANALYST_HISTORY_CAP).default([]),
});

export type ReportAnalystAskInput = z.infer<typeof reportAnalystInputSchema>;

export type AskReportAnalystResult =
  | { ok: true; answer: string }
  | { ok: false; code: "not_configured" | "rate_limited" | "upstream"; message: string };

export type ReportAnalystRecord = {
  userId: string;
  cadastroClienteId: number;
  day: string;
  question: string;
  answer: string;
  periodFrom: string;
  periodTo: string;
};

export type ReportAnalystDeps = {
  loadReport: (input: OperationalReportQuery) => Promise<OperationalReport>;
  countToday: (userId: string, cadastroClienteId: number, day: string) => Promise<number>;
  record: (row: ReportAnalystRecord) => Promise<void>;
  port: ReportAnalystPort;
  now?: Date;
};

const RATE_LIMITED = `Você chegou ao limite de ${REPORT_ANALYST_DAILY_LIMIT} perguntas neste cliente hoje. Amanhã o contador zera.`;

export async function executeReportAnalystAsk(
  auth: { userId: string },
  input: ReportAnalystAskInput,
  deps: ReportAnalystDeps,
): Promise<AskReportAnalystResult> {
  if (!deps.port.isConfigured()) {
    return {
      ok: false,
      code: "not_configured",
      message:
        "O analista ainda não está ligado nesta instalação. A leitura automática do período continua disponível.",
    };
  }

  const report = await deps.loadReport({
    cadastroClienteId: input.cadastroClienteId,
    preset: input.preset,
    customFrom: input.customFrom,
    customTo: input.customTo,
  });
  const day = brtToday(deps.now ?? new Date());
  const used = await deps.countToday(auth.userId, input.cadastroClienteId, day);
  if (used >= REPORT_ANALYST_DAILY_LIMIT) {
    return { ok: false, code: "rate_limited", message: RATE_LIMITED };
  }

  const context = buildReportAnalystContext(report);
  const prior: ReportAnalystTurn[] = input.history
    .slice(-(REPORT_ANALYST_HISTORY_CAP - 1))
    .map((turn) => ({ role: turn.role, content: turn.content }));
  const completion = await deps.port.complete({
    system: renderReportAnalystSystem(context),
    messages: [...prior, { role: "user", content: input.question }],
  });
  if (!completion.ok) {
    return completion;
  }

  try {
    await deps.record({
      userId: auth.userId,
      cadastroClienteId: input.cadastroClienteId,
      day,
      question: input.question,
      answer: completion.text,
      periodFrom: report.period.from,
      periodTo: report.period.to,
    });
  } catch (error) {
    console.warn(
      "[report-analyst] uso não gravado:",
      error instanceof Error ? error.message : "erro",
    );
  }

  return { ok: true, answer: completion.text };
}

async function assertAdminOnly(context: {
  supabase: SupabaseClient;
  userId: string;
  claims?: { email?: string | null };
}): Promise<void> {
  const isAdmin = await resolveIsAdmin({
    supabase: context.supabase,
    userId: context.userId,
    email: context.claims?.email ?? undefined,
    repair: true,
  });
  if (!isAdmin) throw new Error("Só admin pode usar o analista.");
}

async function countUsage(
  supabase: SupabaseClient,
  userId: string,
  cadastroClienteId: number,
  day: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("report_analyst_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("cadastro_cliente_id", cadastroClienteId)
    .eq("asked_on", day);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function recordUsage(supabase: SupabaseClient, row: ReportAnalystRecord): Promise<void> {
  const { error: usageError } = await supabase.from("report_analyst_usage").insert({
    user_id: row.userId,
    cadastro_cliente_id: row.cadastroClienteId,
    asked_on: row.day,
  });
  if (usageError) throw new Error(usageError.message);

  const { error: threadError } = await supabase.from("report_analyst_threads").insert({
    user_id: row.userId,
    cadastro_cliente_id: row.cadastroClienteId,
    question: row.question,
    answer: row.answer,
    period_from: row.periodFrom,
    period_to: row.periodTo,
  });
  if (threadError) throw new Error(threadError.message);
}

export const askReportAnalystFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => reportAnalystInputSchema.parse(data))
  .handler(async ({ data, context }): Promise<AskReportAnalystResult> => {
    await assertAdminOnly(context);
    return executeReportAnalystAsk({ userId: context.userId }, data, {
      loadReport: (input) => loadClientOperationalReport(context.supabase, input),
      countToday: (userId, cadastroClienteId, day) =>
        countUsage(context.supabase, userId, cadastroClienteId, day),
      record: (row) => recordUsage(context.supabase, row),
      port: createAnthropicReportAnalyst(),
    });
  });
