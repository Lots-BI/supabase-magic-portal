import { describe, expect, it } from "vitest";
import { generateCrmIngestToken, hashCrmIngestToken } from "./ingest-token";

describe("hashCrmIngestToken", () => {
  it("is a stable sha256 hex", () => {
    expect(hashCrmIngestToken("lots_crm_demo")).toBe(
      "0b2bc6ab75c086965aafb0f38b6b44842e3c15fec1297924f5ee0a892b1a5a8e",
    );
  });
});

describe("generateCrmIngestToken", () => {
  it("never returns the hash as the token shown once", () => {
    const token = generateCrmIngestToken();
    expect(token.plaintext.startsWith("lots_crm_")).toBe(true);
    expect(token.hash).toBe(hashCrmIngestToken(token.plaintext));
    expect(token.hash).not.toBe(token.plaintext);
    expect(token.prefix).toBe(token.plaintext.slice(0, 16));
  });
});
