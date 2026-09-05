import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

describe("announceUnseenPlatformReleases", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
    vi.stubGlobal("window", {
      dispatchEvent: () => true,
      focus: () => undefined,
      location: { assign: vi.fn() },
    });
    vi.stubGlobal("Notification", undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("primeira visita anuncia só a novidade mais recente", async () => {
    const { announceUnseenPlatformReleases } = await import("./announce-new-releases");
    const { listNotifications } = await import("@/lib/notifications");

    const count = announceUnseenPlatformReleases();
    expect(count).toBe(1);
    expect(listNotifications()[0]?.href).toBe("/novidades");
    expect(listNotifications()[0]?.title).toMatch(/novidades/i);

    expect(announceUnseenPlatformReleases()).toBe(0);
  });
});
