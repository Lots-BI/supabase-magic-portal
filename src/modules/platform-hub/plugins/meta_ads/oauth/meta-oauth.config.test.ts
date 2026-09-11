import { afterEach, describe, expect, it } from "vitest";
import { META_LEADS_RETRIEVAL_SCOPE, metaAdsOauthScopes } from "./meta-oauth.config";

describe("metaAdsOauthScopes", () => {
  const previous = process.env.META_REQUEST_LEADS_SCOPE;

  afterEach(() => {
    if (previous === undefined) delete process.env.META_REQUEST_LEADS_SCOPE;
    else process.env.META_REQUEST_LEADS_SCOPE = previous;
  });

  it("omits leads_retrieval unless META_REQUEST_LEADS_SCOPE=1", () => {
    delete process.env.META_REQUEST_LEADS_SCOPE;
    expect(metaAdsOauthScopes()).not.toContain(META_LEADS_RETRIEVAL_SCOPE);
    process.env.META_REQUEST_LEADS_SCOPE = "1";
    expect(metaAdsOauthScopes()).toContain(META_LEADS_RETRIEVAL_SCOPE);
  });
});
