export const INTENT_LEXICON = {
  purchase: [
    "quero",
    "preço",
    "preco",
    "valor",
    "quanto",
    "custa",
    "comprar",
    "orçamento",
    "orcamento",
    "link",
    "whats",
    "whatsapp",
  ],
  question: ["horário", "horario", "funciona", "como", "onde", "quando", "tem", "ainda"],
  complaint: ["péssimo", "pessimo", "não gostei", "nao gostei", "atraso", "reclama", "horrível", "horrivel"],
} as const;

export type IntentLexiconHit = {
  purchase: boolean;
  question: boolean;
  complaint: boolean;
};

export function matchIntentLexicon(text: string | null | undefined): IntentLexiconHit {
  const hay = (text ?? "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const fold = (word: string) => word.normalize("NFD").replace(/\p{M}/gu, "");
  return {
    purchase: INTENT_LEXICON.purchase.some((w) => hay.includes(fold(w))),
    question: INTENT_LEXICON.question.some((w) => hay.includes(fold(w))),
    complaint: INTENT_LEXICON.complaint.some((w) => hay.includes(fold(w))),
  };
}
