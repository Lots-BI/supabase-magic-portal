export type CohortSignal = {
  personId: string;
  ignored: boolean;
  occurredAt: string;
  igMediaId: string | null;
  pillarTitulo?: string | null;
};

export type RankedMedia = {
  igMediaId: string;
  pillarTitulo: string | null;
  firstTouchPeople: number;
  returnedPeople: number;
  activeInWindow: number;
  returnRate: number;
  activeRate: number;
};

function laterThan(iso: string, than: string): boolean {
  return iso > than;
}

function withinWindow(occurredAt: string, firstSeenAt: string, windowDays: number): boolean {
  const start = new Date(firstSeenAt).getTime();
  const end = start + windowDays * 86_400_000;
  const at = new Date(occurredAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(at)) return false;
  return at > start && at <= end;
}

export function isStillActive(
  firstSeenAt: string,
  laterOccurredAt: readonly string[],
  windowDays: number,
): boolean {
  return laterOccurredAt.some((iso) => withinWindow(iso, firstSeenAt, windowDays));
}

export function firstSignalByPerson(signals: readonly CohortSignal[]): Map<string, CohortSignal> {
  const first = new Map<string, CohortSignal>();
  const sorted = [...signals].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  for (const signal of sorted) {
    if (signal.ignored) continue;
    if (!first.has(signal.personId)) first.set(signal.personId, signal);
  }
  return first;
}

/**
 * Ranking por publicação: pessoas cujo 1º sinal foi neste `ig_media_id`.
 * `returnedPeople` = outro sinal depois, em mídia distinta.
 * `activeInWindow` = outro sinal dentro de N dias (qualquer mídia).
 * Não usa `comments_count` da mídia — isso entra só na UI, coluna à parte.
 */
export function rankMediaByReturn(
  signals: readonly CohortSignal[],
  windowDays: number,
): RankedMedia[] {
  const first = firstSignalByPerson(signals);
  const byMedia = new Map<
    string,
    { pillarTitulo: string | null; people: Set<string>; returned: Set<string>; active: Set<string> }
  >();

  const signalsByPerson = new Map<string, CohortSignal[]>();
  for (const signal of signals) {
    if (signal.ignored) continue;
    const list = signalsByPerson.get(signal.personId) ?? [];
    list.push(signal);
    signalsByPerson.set(signal.personId, list);
  }

  for (const [personId, firstSignal] of first) {
    if (!firstSignal.igMediaId) continue;
    const bucket = byMedia.get(firstSignal.igMediaId) ?? {
      pillarTitulo: firstSignal.pillarTitulo ?? null,
      people: new Set<string>(),
      returned: new Set<string>(),
      active: new Set<string>(),
    };
    if (!bucket.pillarTitulo && firstSignal.pillarTitulo) {
      bucket.pillarTitulo = firstSignal.pillarTitulo;
    }
    bucket.people.add(personId);

    const rest = (signalsByPerson.get(personId) ?? []).filter((s) =>
      laterThan(s.occurredAt, firstSignal.occurredAt),
    );
    if (rest.some((s) => s.igMediaId && s.igMediaId !== firstSignal.igMediaId)) {
      bucket.returned.add(personId);
    }
    if (isStillActive(firstSignal.occurredAt, rest.map((s) => s.occurredAt), windowDays)) {
      bucket.active.add(personId);
    }
    byMedia.set(firstSignal.igMediaId, bucket);
  }

  return [...byMedia.entries()]
    .map(([igMediaId, bucket]) => {
      const firstTouchPeople = bucket.people.size;
      const returnedPeople = bucket.returned.size;
      const activeInWindow = bucket.active.size;
      return {
        igMediaId,
        pillarTitulo: bucket.pillarTitulo,
        firstTouchPeople,
        returnedPeople,
        activeInWindow,
        returnRate: firstTouchPeople === 0 ? 0 : Math.round((returnedPeople / firstTouchPeople) * 100),
        activeRate: firstTouchPeople === 0 ? 0 : Math.round((activeInWindow / firstTouchPeople) * 100),
      };
    })
    .sort((a, b) => b.returnRate - a.returnRate || b.firstTouchPeople - a.firstTouchPeople);
}

export function cohortForMedia(
  signals: readonly CohortSignal[],
  igMediaId: string,
  windowDays: number,
): { firstTouchPeople: number; activeInWindow: number; activeRate: number } {
  const ranked = rankMediaByReturn(signals, windowDays).find((row) => row.igMediaId === igMediaId);
  return {
    firstTouchPeople: ranked?.firstTouchPeople ?? 0,
    activeInWindow: ranked?.activeInWindow ?? 0,
    activeRate: ranked?.activeRate ?? 0,
  };
}
