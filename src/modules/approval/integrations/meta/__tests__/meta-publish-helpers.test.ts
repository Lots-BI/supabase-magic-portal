import { describe, expect, it } from "vitest";
import {
  assertFacebookPublishTarget,
  isMetaLivePublishPlatform,
  mergeMetaPublishMetadata,
  readMetaPublishFromMetadata,
  resolvePublishCaption,
} from "../meta-publish-helpers";
import { pickPageAccessToken } from "../meta-page-graph";
import type { ContentCard } from "../../../types/content-card";

function stubCard(overrides: Partial<ContentCard> = {}): ContentCard {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    cadastro_cliente_id: 15,
    cliente_nome: "Agência Lots",
    data_publicacao: "2026-08-04",
    hora_publicacao: null,
    titulo: "Título do post",
    legenda: null,
    copy_text: null,
    roteiro: null,
    direcao_arte: null,
    cta: null,
    plataforma: "facebook",
    formato: "feed",
    capa_url: null,
    status: "aprovado",
    checklist: [],
    localizacao: null,
    tags: null,
    observacoes: null,
    responsavel_email: null,
    responsavel_user_id: null,
    pilar_id: null,
    estrategia_id: null,
    kanban_ordem: 0,
    published_at: null,
    archived_at: null,
    ai_metadata: {},
    integration_metadata: {},
    legacy_post_id: null,
    created_by: null,
    created_at: "2026-08-04T00:00:00.000Z",
    updated_at: "2026-08-04T00:00:00.000Z",
    ...overrides,
  };
}

describe("meta-publish-helpers", () => {
  it("resolvePublishCaption prioriza legenda > copy > título", () => {
    expect(resolvePublishCaption(stubCard({ legenda: " L1 ", copy_text: "C1" }))).toBe("L1");
    expect(resolvePublishCaption(stubCard({ copy_text: " C1 " }))).toBe("C1");
    expect(resolvePublishCaption(stubCard())).toBe("Título do post");
  });

  it("isMetaLivePublishPlatform aceita facebook/meta", () => {
    expect(isMetaLivePublishPlatform("facebook")).toBe(true);
    expect(isMetaLivePublishPlatform("Meta")).toBe(true);
    expect(isMetaLivePublishPlatform("instagram")).toBe(false);
  });

  it("assertFacebookPublishTarget bloqueia IG no MVP", () => {
    expect(() => assertFacebookPublishTarget("instagram")).toThrow(/Instagram/);
    expect(() => assertFacebookPublishTarget("facebook")).not.toThrow();
  });

  it("merge/read meta_publish metadata", () => {
    const merged = mergeMetaPublishMetadata(
      {},
      {
        externalId: "1_2",
        publishedAt: "2026-08-04T12:00:00.000Z",
        url: "https://www.facebook.com/1/posts/2",
        pageId: "1",
        photoId: "99",
        connectionId: "conn",
      },
    );
    const read = readMetaPublishFromMetadata(merged);
    expect(read?.externalId).toBe("1_2");
    expect(read?.url).toContain("facebook.com");
  });
});

describe("meta-page-graph pickPageAccessToken", () => {
  it("seleciona token da page correta", () => {
    expect(
      pickPageAccessToken(
        [
          { id: "a", access_token: "ta" },
          { id: "b", access_token: "tb" },
        ],
        "b",
      ),
    ).toBe("tb");
    expect(pickPageAccessToken([{ id: "a" }], "a")).toBeNull();
  });
});
