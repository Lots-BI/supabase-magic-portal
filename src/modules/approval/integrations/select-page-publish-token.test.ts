import { describe, expect, it } from "vitest";
import { selectPagePublishToken } from "./select-page-publish-token";

const pages = [
  {
    id: "page-a",
    name: "Cliente A",
    access_token: "PAGE_TOKEN_A",
    instagram_business_account: { id: "ig-a", username: "clientea" },
  },
  {
    id: "page-b",
    name: "Cliente B",
    instagram_business_account: { id: "ig-b" },
  },
];

describe("selectPagePublishToken", () => {
  it("uses the Page token of the Instagram professional account", () => {
    expect(selectPagePublishToken(pages, "ig-a")).toEqual({
      accessToken: "PAGE_TOKEN_A",
      pageId: "page-a",
      igUserId: "ig-a",
    });
  });

  it("falls back to a stored Page id", () => {
    expect(selectPagePublishToken(pages, "ig-unknown", "page-a").pageId).toBe("page-a");
  });

  it("asks to reconnect when the Page has no token", () => {
    expect(() => selectPagePublishToken(pages, "ig-b")).toThrow(/pages_manage_posts/);
  });
});
