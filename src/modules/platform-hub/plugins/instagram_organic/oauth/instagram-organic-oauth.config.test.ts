import { afterEach, describe, expect, it } from "vitest";
import {
  INSTAGRAM_ORGANIC_PUBLISH_SCOPE,
  instagramOrganicOauthScopes,
} from "./instagram-organic-oauth.config";

describe("instagramOrganicOauthScopes", () => {
  const previous = process.env.META_REQUEST_IG_PUBLISH_SCOPE;

  afterEach(() => {
    if (previous === undefined) delete process.env.META_REQUEST_IG_PUBLISH_SCOPE;
    else process.env.META_REQUEST_IG_PUBLISH_SCOPE = previous;
  });

  it("asks for Instagram publish and Page/BM scopes by default", () => {
    delete process.env.META_REQUEST_IG_PUBLISH_SCOPE;
    const scopes = instagramOrganicOauthScopes();
    expect(scopes).toContain(INSTAGRAM_ORGANIC_PUBLISH_SCOPE);
    expect(scopes).toContain("pages_manage_posts");
    expect(scopes).toContain("ads_read");
  });

  it("can omit instagram_content_publish when the use case is missing", () => {
    process.env.META_REQUEST_IG_PUBLISH_SCOPE = "0";
    expect(instagramOrganicOauthScopes()).not.toContain(INSTAGRAM_ORGANIC_PUBLISH_SCOPE);
  });
});
