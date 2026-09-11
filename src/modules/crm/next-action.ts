import type { CrmChurnState, CrmCollectorStatus, CrmPersonStats } from "./types";

export type NextActionCode =
  | "reply_comment"
  | "reply_dm"
  | "open_whatsapp"
  | "reply_inbox"
  | "person_gone"
  | "need_lead_form"
  | "relogin"
  | "watch";

export type NextAction = {
  code: NextActionCode;
  label: string;
};

export function nextAction(input: {
  stats: CrmPersonStats;
  commentsCollector?: CrmCollectorStatus | null;
  lastKind?: string | null;
}): NextAction {
  if (input.commentsCollector === "scope_missing") {
    return {
      code: "relogin",
      label: "Refazer login Instagram para coletar comentários.",
    };
  }
  if (input.lastKind === "dm" || input.lastKind === "story_reply") {
    return { code: "reply_dm", label: "Responder a mensagem." };
  }
  if (input.lastKind === "whatsapp") {
    return { code: "open_whatsapp", label: "Responder no WhatsApp." };
  }
  if (input.lastKind === "comment" || input.lastKind === "reply") {
    return { code: "reply_comment", label: "Responder o comentário." };
  }
  if (
    input.lastKind === "form" ||
    input.lastKind === "lead_form" ||
    input.lastKind === "email" ||
    input.lastKind === "call" ||
    input.lastKind === "review" ||
    input.lastKind === "mention" ||
    input.lastKind === "other"
  ) {
    return { code: "reply_inbox", label: "Responder a última interação." };
  }
  if (input.stats.churnState === "em_risco" || input.stats.churnState === "dormindo") {
    return {
      code: "person_gone",
      label:
        input.stats.piiCompleteness > 0
          ? "Pessoa sumiu — há contacto consentido para reativar."
          : "Pessoa sumiu — não há e-mail na API de comentários.",
    };
  }
  if (input.stats.piiCompleteness === 0) {
    return {
      code: "need_lead_form",
      label: "E-mail só com formulário Lead Ads ou WhatsApp.",
    };
  }
  return { code: "watch", label: "Acompanhar a jornada." };
}

export const CHURN_LABEL: Record<CrmChurnState, string> = {
  novo: "Nova",
  recorrente: "Recorrente",
  em_risco: "Em risco",
  dormindo: "Dormindo",
  reativado: "Reativada",
};
