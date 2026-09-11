import { describe, expect, it } from "vitest";
import { cronAuthResponse } from "./http";

describe("cronAuthResponse", () => {
  it("returns 503 when CRON_SECRET is missing", () => {
    const prev = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    const res = cronAuthResponse(new Request("http://localhost/api/cron/x"));
    process.env.CRON_SECRET = prev;
    expect(res?.status).toBe(503);
  });

  it("returns 401 on a wrong bearer", () => {
    process.env.CRON_SECRET = "secret-test";
    const res = cronAuthResponse(
      new Request("http://localhost/api/cron/x", { headers: { authorization: "Bearer nope" } }),
    );
    expect(res?.status).toBe(401);
  });

  it("returns null when the bearer matches", () => {
    process.env.CRON_SECRET = "secret-test";
    const res = cronAuthResponse(
      new Request("http://localhost/api/cron/x", {
        headers: { authorization: "Bearer secret-test" },
      }),
    );
    expect(res).toBeNull();
  });
});
