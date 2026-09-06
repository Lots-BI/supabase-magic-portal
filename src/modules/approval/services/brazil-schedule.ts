/** Brasil sem DST desde 2019 — America/Sao_Paulo = UTC−3. */
const SAO_PAULO_OFFSET = "-03:00";
export const DEFAULT_PUBLISH_TIME = "16:00:00";

function normalizeTime(time: string | null | undefined, fallback: string): string {
  const raw = time && /^\d{2}:\d{2}/.test(time) ? time : fallback;
  return raw.length >= 8 ? raw.slice(0, 8) : `${raw.slice(0, 5)}:00`;
}

/** Converte data+hora do calendário editorial (horário de Brasília) em ISO UTC. */
export function combineBrazilSchedule(
  date: string,
  time: string | null | undefined,
  fallbackTime = DEFAULT_PUBLISH_TIME,
): string {
  const hhmmss = normalizeTime(time, fallbackTime);
  const parsed = new Date(`${date}T${hhmmss}${SAO_PAULO_OFFSET}`);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(Date.now() + 3600_000).toISOString();
  }
  return parsed.toISOString();
}

export function shouldRefreshSchedule(publishStatus: string | null | undefined): boolean {
  return publishStatus !== "published" && publishStatus !== "publishing";
}
