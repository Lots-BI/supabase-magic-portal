import Anthropic from "@anthropic-ai/sdk";
import type { ReportAnalystPort } from "./report-analyst.port";

export const REPORT_ANALYST_NOT_CONFIGURED =
  "O analista ainda não está ligado nesta instalação. A leitura automática do período continua disponível.";

export const REPORT_ANALYST_UPSTREAM = "Não consegui responder agora. Tente de novo em instantes.";

export const DEFAULT_REPORT_ANALYST_MODEL = "claude-sonnet-5-5";

export function createAnthropicReportAnalyst(): ReportAnalystPort {
  let client: Anthropic | null = null;

  return {
    isConfigured() {
      return Boolean(readKey());
    },
    async complete(input) {
      const apiKey = readKey();
      if (!apiKey) {
        return { ok: false, code: "not_configured", message: REPORT_ANALYST_NOT_CONFIGURED };
      }
      try {
        client ??= new Anthropic({ apiKey });
        const response = await client.messages.create({
          model: readModel(),
          max_tokens: 900,
          system: input.system,
          messages: input.messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        });
        const text = response.content
          .filter((block): block is { type: "text"; text: string } => block.type === "text")
          .map((block) => block.text)
          .join("\n")
          .trim();
        if (!text) {
          return { ok: false, code: "upstream", message: REPORT_ANALYST_UPSTREAM };
        }
        return { ok: true, text };
      } catch (error) {
        console.warn("[report-analyst]", safeError(error));
        return { ok: false, code: "upstream", message: REPORT_ANALYST_UPSTREAM };
      }
    },
  };
}

function readKey(): string {
  return process.env.ANTHROPIC_API_KEY?.trim() ?? "";
}

function readModel(): string {
  return process.env.REPORT_ANALYST_MODEL?.trim() || DEFAULT_REPORT_ANALYST_MODEL;
}

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : "upstream";
  if (/sk-|api[_-]?key/i.test(message)) return "upstream";
  return message.slice(0, 240);
}
