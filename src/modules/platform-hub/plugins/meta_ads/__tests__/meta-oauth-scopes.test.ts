import { afterEach, describe, expect, it } from "vitest";
import {
  META_OAUTH_CONNECT_SCOPES,
  META_OAUTH_PUBLISH_SCOPES,
  resolveMetaOAuthDialogScopes,
} from "../oauth/meta-oauth.config";

describe("resolveMetaOAuthDialogScopes", () => {
  const prev = process.env.META_OAUTH_INCLUDE_PUBLISH_SCOPES;

  afterEach(() => {
    if (prev === undefined) delete process.env.META_OAUTH_INCLUDE_PUBLISH_SCOPES;
    else process.env.META_OAUTH_INCLUDE_PUBLISH_SCOPES = prev;
  });

  it("default = só connect (métricas)", () => {
    delete process.env.META_OAUTH_INCLUDE_PUBLISH_SCOPES;
    expect(resolveMetaOAuthDialogScopes()).toEqual([...META_OAUTH_CONNECT_SCOPES]);
  });

  it("includePublish=true une connect + publish", () => {
    delete process.env.META_OAUTH_INCLUDE_PUBLISH_SCOPES;
    const scopes = resolveMetaOAuthDialogScopes({ includePublish: true });
    for (const s of META_OAUTH_CONNECT_SCOPES) expect(scopes).toContain(s);
    for (const s of META_OAUTH_PUBLISH_SCOPES) expect(scopes).toContain(s);
  });

  it("env META_OAUTH_INCLUDE_PUBLISH_SCOPES=1 habilita publish", () => {
    process.env.META_OAUTH_INCLUDE_PUBLISH_SCOPES = "1";
    const scopes = resolveMetaOAuthDialogScopes();
    expect(scopes).toContain("pages_manage_posts");
  });
});
