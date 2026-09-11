import type { CrmChurnState } from "./types";

export function computeChurnState(input: {
  signalCount: number;
  recencyDays: number;
  previousGapDays: number | null;
}): CrmChurnState {
  if (input.signalCount < 2) return "novo";
  if (input.recencyDays <= 14 && (input.previousGapDays ?? 0) > 45) return "reativado";
  if (input.recencyDays > 45) return "dormindo";
  if (input.recencyDays > 14) return "em_risco";
  return "recorrente";
}
