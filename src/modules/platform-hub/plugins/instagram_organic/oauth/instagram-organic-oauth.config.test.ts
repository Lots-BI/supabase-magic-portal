import { afterEach, describe, expect, it } from "vitest";
import {
  INSTAGRAM_ORGANIC_COMMENTS_SCOPE,
  INSTAGRAM_ORGANIC_MESSAGES_SCOPE,
  INSTAGRAM_ORGANIC_PUBLISH_SCOPE,
  instagramOrganicOauthScopes,
} from "./instagram-organic-oauth.config";

describe("instagramOrganicOauthScopes", () => {
  const previousPublish = process.env.META_REQUEST_IG_PUBLISH_SCOPE;
  const previousComments = process.env.META_REQUEST_IG_COMMENTS_SCOPE;
  const previousMessages = process.env.META_REQUEST_IG_MESSAGES_SCOPE;

  afterEach(() => {
    if (previousPublish === undefined) delete process.env.META_REQUEST_IG_PUBLISH_SCOPE;
    else process.env.META_REQUEST_IG_PUBLISH_SCOPE = previousPublish;
    if (previousComments === undefined) delete process.env.META_REQUEST_IG_COMMENTS_SCOPE;
    else process.env.META_REQUEST_IG_COMMENTS_SCOPE = previousComments;
    if (previousMessages === undefined) delete process.env.META_REQUEST_IG_MESSAGES_SCOPE;
    else process.env.META_REQUEST_IG_MESSAGES_SCOPE = previousMessages;
  });

  it("asks for Instagram publish, comments and Page/BM scopes by default", () => {
    delete process.env.META_REQUEST_IG_PUBLISH_SCOPE;
    delete process.env.META_REQUEST_IG_COMMENTS_SCOPE;
    const scopes = instagramOrganicOauthScopes();
    expect(scopes).toContain(INSTAGRAM_ORGANIC_PUBLISH_SCOPE);
    expect(scopes).toContain(INSTAGRAM_ORGANIC_COMMENTS_SCOPE);
    expect(scopes).toContain("pages_manage_posts");
    expect(scopes).toContain("ads_read");
  });

  it("can omit instagram_content_publish when the use case is missing", () => {
    process.env.META_REQUEST_IG_PUBLISH_SCOPE = "0";
    expect(instagramOrganicOauthScopes()).not.toContain(INSTAGRAM_ORGANIC_PUBLISH_SCOPE);
  });

  it("omits Direct scopes unless META_REQUEST_IG_MESSAGES_SCOPE=1", () => {
    delete process.env.META_REQUEST_IG_MESSAGES_SCOPE;
    expect(instagramOrganicOauthScopes()).not.toContain(INSTAGRAM_ORGANIC_MESSAGES_SCOPE);
    process.env.META_REQUEST_IG_MESSAGES_SCOPE = "1";
    expect(instagramOrganicOauthScopes()).toContain(INSTAGRAM_ORGANIC_MESSAGES_SCOPE);
  });
});
