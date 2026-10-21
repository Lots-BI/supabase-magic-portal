import { describe, expect, it } from "vitest";
import {
  clipAlertError,
  connectionHasFailedSync,
  pluginAlertLabel,
} from "../connection-alerts";

describe("connectionHasFailedSync", () => {
  it("marca unhealthy e last_sync failed/error só em conexão ativa", () => {
    expect(
      connectionHasFailedSync({
        status: "active",
        healthStatus: "unhealthy",
        lastSyncStatus: "success",
      }),
    ).toBe(true);
    expect(
      connectionHasFailedSync({
        status: "active",
        healthStatus: "healthy",
        lastSyncStatus: "failed",
      }),
    ).toBe(true);
    expect(
      connectionHasFailedSync({
        status: "active",
        healthStatus: "healthy",
        lastSyncStatus: "error",
      }),
    ).toBe(true);
    expect(
      connectionHasFailedSync({
        status: "active",
        healthStatus: "healthy",
        lastSyncStatus: "success",
      }),
    ).toBe(false);
    expect(
      connectionHasFailedSync({
        status: "disabled",
        healthStatus: "unhealthy",
        lastSyncStatus: "failed",
      }),
    ).toBe(false);
  });
});

describe("pluginAlertLabel", () => {
  it("usa o nome de produto conhecido", () => {
    expect(pluginAlertLabel("instagram_organic")).toBe("Instagram");
    expect(pluginAlertLabel("meta_ads")).toBe("Meta Ads");
    expect(pluginAlertLabel("outro")).toBe("outro");
  });
});

describe("clipAlertError", () => {
  it("corta mensagem longa sem inventar texto", () => {
    expect(clipAlertError("ok")).toBe("ok");
    expect(clipAlertError("x".repeat(90))?.endsWith("…")).toBe(true);
    expect(clipAlertError("   ")).toBeNull();
  });
});
