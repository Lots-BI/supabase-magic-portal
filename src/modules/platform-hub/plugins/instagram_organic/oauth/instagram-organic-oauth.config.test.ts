import { afterEach, describe, expect, it } from "vitest";
import {
  INSTAGRAM_ORGANIC_METRICS_SCOPES,
  INSTAGRAM_ORGANIC_PUBLISH_SCOPE,
  instagramOrganicOauthScopes,
} from "./instagram-organic-oauth.config";

describe("instagramOrganicOauthScopes", () => {
  const previous = process.env.META_REQUEST_IG_PUBLISH_SCOPE;

  afterEach(() => {
    if (previous === undefined) delete process.env.META_REQUEST_IG_PUBLISH_SCOPE;
    else process.env.META_REQUEST_IG_PUBLISH_SCOPE = previous;
  });

  it("asks for Page publish by default, without the Instagram publish scope", () => {
    delete process.env.META_REQUEST_IG_PUBLISH_SCOPE;
    const scopes = instagramOrganicOauthScopes();
    expect(scopes).toContain("pages_manage_posts");
    expect(scopes).toContain("pages_show_list");
    expect(scopes).not.toContain(INSTAGRAM_ORGANIC_PUBLISH_SCOPE);
    expect(scopes).toEqual([...INSTAGRAM_ORGANIC_METRICS_SCOPES]);
  });

  it("adds instagram_content_publish only when explicitly enabled", () => {
    process.env.META_REQUEST_IG_PUBLISH_SCOPE = "1";
    expect(instagramOrganicOauthScopes()).toContain(INSTAGRAM_ORGANIC_PUBLISH_SCOPE);
  });
});
