import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseMetaWebhookBody, verifyMetaSignature, verifySubscribeQuery } from "./meta-webhook";

describe("verifySubscribeQuery", () => {
  it("returns the challenge when the token matches", () => {
    expect(
      verifySubscribeQuery(
        { "hub.mode": "subscribe", "hub.verify_token": "abc", "hub.challenge": "123" },
        "abc",
      ),
    ).toEqual({ ok: true, challenge: "123" });
  });

  it("rejects a wrong token", () => {
    expect(
      verifySubscribeQuery(
        { "hub.mode": "subscribe", "hub.verify_token": "nope", "hub.challenge": "123" },
        "abc",
      ),
    ).toEqual({ ok: false });
  });
});

describe("verifyMetaSignature", () => {
  const secret = "app-secret";
  const body = '{"object":"instagram"}';

  it("accepts a valid HMAC", () => {
    const header = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
    expect(verifyMetaSignature(body, header, secret)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const header = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
    expect(verifyMetaSignature('{"object":"page"}', header, secret)).toBe(false);
  });
});

describe("parseMetaWebhookBody", () => {
  it("extracts comment changes", () => {
    const events = parseMetaWebhookBody({
      object: "instagram",
      entry: [
        {
          id: "ig-1",
          changes: [{ field: "comments", value: { id: "c1", text: "oi", from: { id: "u1" } } }],
        },
      ],
    });
    expect(events).toEqual([
      expect.objectContaining({ object: "instagram", field: "comments", externalId: "c1" }),
    ]);
  });
});
