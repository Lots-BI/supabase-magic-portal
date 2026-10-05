import { CHURN_LABEL } from "./next-action";
import { clampIntent, kindLabel, placeLabel, PROFILE_GROUPS, profileGroupId } from "./present";
import { CRM_CHURN_STATES } from "./types";

export type CrmHeatBand = "all" | "hot" | "warm" | "cold";
export type CrmContactFilter = "all" | "with" | "without";
export type CrmVipFilter = "all" | "vip" | "regular";
export type CrmVolumeFilter = "all" | "once" | "repeat" | "many";
export type CrmPostsFilter = "all" | "one" | "many";
export type CrmRecencyFilter = "all" | "1" | "7" | "30";
export type CrmPeopleSort = "recent" | "heat" | "interactions" | "name";

export type CrmPeopleFilters = {
  channel: string;
  churn: string;
  heat: CrmHeatBand;
  contact: CrmContactFilter;
  vip: CrmVipFilter;
  owner: string;
  place: string;
  pillar: string;
  action: string;
  volume: CrmVolumeFilter;
  posts: CrmPostsFilter;
  recency: CrmRecencyFilter;
  sort: CrmPeopleSort;
};

export const DEFAULT_CRM_PEOPLE_FILTERS: CrmPeopleFilters = {
  channel: "all",
  churn: "all",
  heat: "all",
  contact: "all",
  vip: "all",
  owner: "all",
  place: "all",
  pillar: "all",
  action: "all",
  volume: "all",
  posts: "all",
  recency: "all",
  sort: "recent",
};

export const CRM_CHANNEL_OPTIONS = [
  { value: "all", label: "Todos os canais" },
  ...PROFILE_GROUPS.map((group) => ({ value: group.id, label: group.label })),
];

export const CRM_CHURN_OPTIONS = [
  { value: "all", label: "Qualquer situação" },
  ...CRM_CHURN_STATES.map((state) => ({ value: state, label: CHURN_LABEL[state] })),
];

export const CRM_HEAT_OPTIONS: { value: CrmHeatBand; label: string }[] = [
  { value: "all", label: "Qualquer calor" },
  { value: "hot", label: "Quente, 70–100" },
  { value: "warm", label: "Morno, 40–69" },
  { value: "cold", label: "Frio, 0–39" },
];

export const CRM_CONTACT_OPTIONS: { value: CrmContactFilter; label: string }[] = [
  { value: "all", label: "Com ou sem contato" },
  { value: "with", label: "Com e-mail ou telefone" },
  { value: "without", label: "Sem e-mail e telefone" },
];

export const CRM_VIP_OPTIONS: { value: CrmVipFilter; label: string }[] = [
  { value: "all", label: "VIP e demais" },
  { value: "vip", label: "Só VIP" },
  { value: "regular", label: "Sem VIP" },
];

export const CRM_VOLUME_OPTIONS: { value: CrmVolumeFilter; label: string }[] = [
  { value: "all", label: "Qualquer volume" },
  { value: "once", label: "1 interação" },
  { value: "repeat", label: "2 ou mais" },
  { value: "many", label: "5 ou mais" },
];

export const CRM_POSTS_OPTIONS: { value: CrmPostsFilter; label: string }[] = [
  { value: "all", label: "Qualquer publicação" },
  { value: "one", label: "Uma publicação" },
  { value: "many", label: "Várias publicações" },
];

export const CRM_RECENCY_OPTIONS: { value: CrmRecencyFilter; label: string }[] = [
  { value: "all", label: "Qualquer recência" },
  { value: "1", label: "Falou hoje ou ontem" },
  { value: "7", label: "Falou em 7 dias" },
  { value: "30", label: "Falou em 30 dias" },
];

export const CRM_ACTION_OPTIONS = [
  { value: "all", label: "Qualquer próxima ação" },
  { value: "reply_comment", label: "Responder comentário" },
  { value: "reply_dm", label: "Responder Direct" },
  { value: "open_whatsapp", label: "Responder WhatsApp" },
  { value: "reply_inbox", label: "Responder interação" },
  { value: "person_gone", label: "Pessoa sumiu" },
  { value: "need_lead_form", label: "Sem contato para reativar" },
  { value: "relogin", label: "Refazer login" },
  { value: "watch", label: "Acompanhar" },
];

export const CRM_SORT_OPTIONS: { value: CrmPeopleSort; label: string }[] = [
  { value: "recent", label: "Mais recente" },
  { value: "heat", label: "Maior calor" },
  { value: "interactions", label: "Mais interações" },
  { value: "name", label: "Nome" },
];

export type CrmFilterablePerson = {
  displayName: string;
  igUsername: string | null;
  isVip: boolean;
  signalCount: number;
  churnState: string;
  intentScore: number;
  piiCompleteness: number;
  recencyDays: number;
  lastSignalAt: string | null;
  lastKind: string | null;
  ownerUserId: string | null;
  nextActionCode: string;
  placeCounts: Record<string, number>;
  pillarAffinity: Record<string, number>;
  mediaDistinct: number;
};

export function crmFiltersAreActive(filters: CrmPeopleFilters): boolean {
  return (Object.keys(DEFAULT_CRM_PEOPLE_FILTERS) as (keyof CrmPeopleFilters)[]).some(
    (key) => filters[key] !== DEFAULT_CRM_PEOPLE_FILTERS[key],
  );
}

function heatMatches(score: number, band: CrmHeatBand): boolean {
  const value = clampIntent(score);
  if (band === "hot") return value >= 70;
  if (band === "warm") return value >= 40 && value < 70;
  if (band === "cold") return value < 40;
  return true;
}

function volumeMatches(count: number, volume: CrmVolumeFilter): boolean {
  if (volume === "once") return count === 1;
  if (volume === "repeat") return count >= 2;
  if (volume === "many") return count >= 5;
  return true;
}

function recencyMatches(days: number, recency: CrmRecencyFilter): boolean {
  if (recency === "1") return days <= 1;
  if (recency === "7") return days <= 7;
  if (recency === "30") return days <= 30;
  return true;
}

export function matchesCrmPeopleFilters(
  person: CrmFilterablePerson,
  filters: CrmPeopleFilters,
): boolean {
  if (filters.channel !== "all" && profileGroupId(person.lastKind) !== filters.channel)
    return false;
  if (filters.churn !== "all" && person.churnState !== filters.churn) return false;
  if (!heatMatches(person.intentScore, filters.heat)) return false;
  if (filters.contact === "with" && person.piiCompleteness <= 0) return false;
  if (filters.contact === "without" && person.piiCompleteness > 0) return false;
  if (filters.vip === "vip" && !person.isVip) return false;
  if (filters.vip === "regular" && person.isVip) return false;
  if (filters.owner === "unassigned" && person.ownerUserId) return false;
  if (
    filters.owner !== "all" &&
    filters.owner !== "unassigned" &&
    person.ownerUserId !== filters.owner
  ) {
    return false;
  }
  if (filters.place !== "all" && !(person.placeCounts[filters.place] > 0)) return false;
  if (filters.pillar !== "all" && !(person.pillarAffinity[filters.pillar] > 0)) return false;
  if (filters.action !== "all" && person.nextActionCode !== filters.action) return false;
  if (!volumeMatches(person.signalCount, filters.volume)) return false;
  if (filters.posts === "one" && person.mediaDistinct > 1) return false;
  if (filters.posts === "many" && person.mediaDistinct < 2) return false;
  if (!recencyMatches(person.recencyDays, filters.recency)) return false;
  return true;
}

export function sortCrmPeople<T extends CrmFilterablePerson>(
  people: readonly T[],
  sort: CrmPeopleSort,
): T[] {
  const copy = [...people];
  copy.sort((a, b) => {
    if (sort === "heat")
      return b.intentScore - a.intentScore || a.displayName.localeCompare(b.displayName, "pt");
    if (sort === "interactions") {
      return b.signalCount - a.signalCount || b.intentScore - a.intentScore;
    }
    if (sort === "name") return a.displayName.localeCompare(b.displayName, "pt");
    return (
      (b.lastSignalAt ?? "").localeCompare(a.lastSignalAt ?? "") || b.intentScore - a.intentScore
    );
  });
  return copy;
}

export function applyCrmPeopleFilters<T extends CrmFilterablePerson>(
  people: readonly T[],
  filters: CrmPeopleFilters,
): T[] {
  return sortCrmPeople(
    people.filter((person) => matchesCrmPeopleFilters(person, filters)),
    filters.sort,
  );
}

export function dominantPlace(placeCounts: Record<string, number>): string | null {
  let best: string | null = null;
  let bestCount = 0;
  for (const [place, count] of Object.entries(placeCounts)) {
    if (!placeLabel(place) || count <= bestCount) continue;
    best = place;
    bestCount = count;
  }
  return best;
}

export function collectOwners(
  people: readonly { ownerUserId: string | null; ownerNome: string | null }[],
): { value: string; label: string }[] {
  const byId = new Map<string, string>();
  for (const person of people) {
    if (!person.ownerUserId) continue;
    byId.set(person.ownerUserId, person.ownerNome?.trim() || "Dono sem nome");
  }
  return [...byId.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt"));
}

export function collectCountedKeys(
  people: readonly { counts: Record<string, number> }[],
  labelOf: (key: string) => string,
): { value: string; label: string }[] {
  const keys = new Set<string>();
  for (const person of people) {
    for (const [key, count] of Object.entries(person.counts)) {
      if (count > 0 && labelOf(key)) keys.add(key);
    }
  }
  return [...keys]
    .map((value) => ({ value, label: labelOf(value) }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt"));
}

export function placeOptions(people: readonly { placeCounts: Record<string, number> }[]) {
  return collectCountedKeys(
    people.map((person) => ({ counts: person.placeCounts })),
    placeLabel,
  );
}

export function pillarOptions(people: readonly { pillarAffinity: Record<string, number> }[]) {
  return collectCountedKeys(
    people.map((person) => ({ counts: person.pillarAffinity })),
    (key) => key,
  );
}

export function actionLabel(code: string): string {
  return CRM_ACTION_OPTIONS.find((option) => option.value === code)?.label ?? kindLabel(code);
}

export type CrmFilterChip = {
  key: keyof CrmPeopleFilters;
  label: string;
};

function optionLabel(options: readonly { value: string; label: string }[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function activeFilterChips(
  filters: CrmPeopleFilters,
  context: {
    owners: readonly { value: string; label: string }[];
    places: readonly { value: string; label: string }[];
    pillars: readonly { value: string; label: string }[];
  },
): CrmFilterChip[] {
  const chips: CrmFilterChip[] = [];
  if (filters.channel !== "all") {
    chips.push({ key: "channel", label: optionLabel(CRM_CHANNEL_OPTIONS, filters.channel) });
  }
  if (filters.churn !== "all") {
    chips.push({ key: "churn", label: optionLabel(CRM_CHURN_OPTIONS, filters.churn) });
  }
  if (filters.heat !== "all") {
    chips.push({ key: "heat", label: optionLabel(CRM_HEAT_OPTIONS, filters.heat) });
  }
  if (filters.contact !== "all") {
    chips.push({ key: "contact", label: optionLabel(CRM_CONTACT_OPTIONS, filters.contact) });
  }
  if (filters.vip !== "all") {
    chips.push({ key: "vip", label: optionLabel(CRM_VIP_OPTIONS, filters.vip) });
  }
  if (filters.owner !== "all") {
    const label =
      filters.owner === "unassigned"
        ? "Sem dono"
        : (context.owners.find((owner) => owner.value === filters.owner)?.label ?? "Dono");
    chips.push({ key: "owner", label });
  }
  if (filters.place !== "all") {
    chips.push({
      key: "place",
      label: context.places.find((place) => place.value === filters.place)?.label ?? filters.place,
    });
  }
  if (filters.pillar !== "all") {
    chips.push({
      key: "pillar",
      label:
        context.pillars.find((pillar) => pillar.value === filters.pillar)?.label ?? filters.pillar,
    });
  }
  if (filters.action !== "all") {
    chips.push({ key: "action", label: optionLabel(CRM_ACTION_OPTIONS, filters.action) });
  }
  if (filters.volume !== "all") {
    chips.push({ key: "volume", label: optionLabel(CRM_VOLUME_OPTIONS, filters.volume) });
  }
  if (filters.posts !== "all") {
    chips.push({ key: "posts", label: optionLabel(CRM_POSTS_OPTIONS, filters.posts) });
  }
  if (filters.recency !== "all") {
    chips.push({ key: "recency", label: optionLabel(CRM_RECENCY_OPTIONS, filters.recency) });
  }
  if (filters.sort !== "recent") {
    chips.push({ key: "sort", label: optionLabel(CRM_SORT_OPTIONS, filters.sort) });
  }
  return chips;
}

export function clearFilterChip(
  filters: CrmPeopleFilters,
  key: keyof CrmPeopleFilters,
): CrmPeopleFilters {
  return { ...filters, [key]: DEFAULT_CRM_PEOPLE_FILTERS[key] };
}
