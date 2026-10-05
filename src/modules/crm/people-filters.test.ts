import { describe, expect, it } from "vitest";
import {
  activeFilterChips,
  applyCrmPeopleFilters,
  clearFilterChip,
  DEFAULT_CRM_PEOPLE_FILTERS,
  type CrmFilterablePerson,
} from "./people-filters";

function person(patch: Partial<CrmFilterablePerson> = {}): CrmFilterablePerson {
  return {
    displayName: "@ana",
    igUsername: "ana",
    isVip: false,
    signalCount: 2,
    churnState: "recorrente",
    intentScore: 80,
    piiCompleteness: 0,
    recencyDays: 1,
    lastSignalAt: "2026-10-01T10:00:00.000Z",
    lastKind: "comment",
    ownerUserId: null,
    nextActionCode: "reply_comment",
    placeCounts: { reels: 2 },
    pillarAffinity: { Bastidores: 1 },
    mediaDistinct: 1,
    ...patch,
  };
}

describe("applyCrmPeopleFilters", () => {
  const people = [
    person(),
    person({
      displayName: "@bia",
      igUsername: "bia",
      intentScore: 20,
      churnState: "dormindo",
      recencyDays: 50,
      lastSignalAt: "2026-08-01T10:00:00.000Z",
      lastKind: "dm",
      signalCount: 6,
      mediaDistinct: 3,
      placeCounts: { feed: 1 },
      pillarAffinity: {},
      piiCompleteness: 0.5,
      isVip: true,
      ownerUserId: "owner-1",
      nextActionCode: "reply_dm",
    }),
  ];

  it("keeps everyone when filters are default and sorts by recency", () => {
    const result = applyCrmPeopleFilters(people, DEFAULT_CRM_PEOPLE_FILTERS);
    expect(result.map((row) => row.displayName)).toEqual(["@ana", "@bia"]);
  });

  it("combines channel, heat, place and pillar", () => {
    const result = applyCrmPeopleFilters(people, {
      ...DEFAULT_CRM_PEOPLE_FILTERS,
      channel: "instagram",
      heat: "hot",
      place: "reels",
      pillar: "Bastidores",
    });
    expect(result.map((row) => row.igUsername)).toEqual(["ana"]);
  });

  it("filters contact, vip, owner, volume and posts", () => {
    const result = applyCrmPeopleFilters(people, {
      ...DEFAULT_CRM_PEOPLE_FILTERS,
      contact: "with",
      vip: "vip",
      owner: "owner-1",
      volume: "many",
      posts: "many",
      action: "reply_dm",
      churn: "dormindo",
      recency: "all",
    });
    expect(result.map((row) => row.igUsername)).toEqual(["bia"]);
  });
});

describe("activeFilterChips", () => {
  it("omite o padrão e remove um chip sem apagar os outros", () => {
    const filters = { ...DEFAULT_CRM_PEOPLE_FILTERS, heat: "hot" as const, recency: "7" as const };
    const chips = activeFilterChips(filters, { owners: [], places: [], pillars: [] });
    expect(chips.map((chip) => chip.key)).toEqual(["heat", "recency"]);
    const cleared = clearFilterChip(filters, "heat");
    expect(cleared.heat).toBe("all");
    expect(cleared.recency).toBe("7");
  });
});
