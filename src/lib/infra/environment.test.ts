import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRODUCTION_APP_URL,
  detectLotsEnvironment,
  hostnamesMatch,
  resolveExpectedAppUrl,
} from "./environment";

describe("environment", () => {
  it("detecta development em localhost", () => {
    expect(detectLotsEnvironment("http://localhost:5173")).toBe("development");
    expect(detectLotsEnvironment("127.0.0.1")).toBe("development");
  });

  it("detecta staging em preview/pages.dev", () => {
    expect(detectLotsEnvironment("https://lotsbi-preview.pages.dev")).toBe("staging");
    expect(detectLotsEnvironment("https://staging.lotsbi.example.com")).toBe("staging");
  });

  it("detecta production no domínio oficial", () => {
    expect(
      detectLotsEnvironment("https://lotsbi.leandromajr.com", { nodeEnv: "production" }),
    ).toBe("production");
  });

  it("resolve URL esperada por ambiente", () => {
    expect(resolveExpectedAppUrl("development")).toBe("http://localhost:5173");
    expect(resolveExpectedAppUrl("production")).toBe(DEFAULT_PRODUCTION_APP_URL);
    expect(
      resolveExpectedAppUrl("production", {
        productionUrl: "https://custom.prod",
      }),
    ).toBe("https://custom.prod");
  });

  it("compara hostnames ignorando protocolo e porta", () => {
    expect(hostnamesMatch("https://lotsbi.leandromajr.com", "lotsbi.leandromajr.com")).toBe(true);
    expect(hostnamesMatch("http://localhost:5173", "localhost")).toBe(true);
    expect(hostnamesMatch("https://a.com", "https://b.com")).toBe(false);
  });
});
