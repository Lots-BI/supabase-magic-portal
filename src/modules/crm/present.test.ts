import { describe, expect, it } from "vitest";
import {
  clampIntent,
  formatIdentityValue,
  groupPeopleByProfile,
  personListTitle,
  profileGroupId,
} from "./present";

describe("profileGroupId", () => {
  it("separa comentário, direct, whatsapp e formulário", () => {
    expect(profileGroupId("comment")).toBe("instagram");
    expect(profileGroupId("mention")).toBe("instagram");
    expect(profileGroupId("dm")).toBe("direct");
    expect(profileGroupId("story_reply")).toBe("direct");
    expect(profileGroupId("whatsapp")).toBe("whatsapp");
    expect(profileGroupId("lead_form")).toBe("form");
    expect(profileGroupId("form")).toBe("form");
    expect(profileGroupId(null)).toBe("other");
  });
});

describe("groupPeopleByProfile", () => {
  it("omite canais vazios e mantém a ordem dos perfis", () => {
    const groups = groupPeopleByProfile([
      { id: "a", lastKind: "whatsapp" },
      { id: "b", lastKind: "comment" },
      { id: "c", lastKind: "reply" },
    ]);
    expect(groups.map((group) => group.id)).toEqual(["instagram", "whatsapp"]);
    expect(groups[0]?.people.map((person) => person.id)).toEqual(["b", "c"]);
  });
});

describe("formatIdentityValue", () => {
  it("prefixa o @ do Instagram uma vez", () => {
    expect(formatIdentityValue("ig_username", "ana")).toBe("@ana");
    expect(formatIdentityValue("ig_username", "@ana")).toBe("@ana");
    expect(formatIdentityValue("email", "ana@marca.com")).toBe("ana@marca.com");
  });
});

describe("personListTitle", () => {
  it("não repete o @ quando o nome já é o username", () => {
    expect(personListTitle("@rodrigorobertoantena", "rodrigorobertoantena")).toBe(
      "@rodrigorobertoantena",
    );
    expect(personListTitle("@dlgn8.9", "@dlgn8.9")).toBe("@dlgn8.9");
  });

  it("mantém nome e @ quando são pessoas diferentes na mesma ficha", () => {
    expect(personListTitle("Ana Silva", "anasilva")).toBe("Ana Silva · @anasilva");
  });
});

describe("clampIntent", () => {
  it("prende o calor visível entre 0 e 100", () => {
    expect(clampIntent(72.4)).toBe(72);
    expect(clampIntent(140)).toBe(100);
    expect(clampIntent(-3)).toBe(0);
    expect(clampIntent(Number.NaN)).toBe(0);
  });
});
