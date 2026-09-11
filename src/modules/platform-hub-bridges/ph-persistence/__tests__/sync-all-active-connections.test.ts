import { describe, expect, it } from "vitest";
import { buildConnectionMetricSyncPatch } from "../sync-all-active-connections";

describe("buildConnectionMetricSyncPatch", () => {
  it("sucesso sem dias novos não zera metrics_count nem inventa erro", () => {
    const patch = buildConnectionMetricSyncPatch({ ok: true, daysFilled: 0 });
    expect(patch.last_sync_status).toBe("success");
    expect(patch.last_error).toBeNull();
    expect(patch.health_status).toBe("healthy");
    expect(patch).not.toHaveProperty("metrics_count");
  });

  it("sucesso com dias preenchidos atualiza metrics_count", () => {
    const patch = buildConnectionMetricSyncPatch({ ok: true, daysFilled: 14 });
    expect(patch.metrics_count).toBe(14);
    expect(patch.last_sync_status).toBe("success");
  });

  it("sucesso parcial guarda o aviso", () => {
    const patch = buildConnectionMetricSyncPatch({
      ok: true,
      daysFilled: 3,
      error: "range antigo falhou",
    });
    expect(patch.last_sync_status).toBe("degraded");
    expect(patch.last_error).toBe("range antigo falhou");
    expect(patch.health_status).toBe("degraded");
    expect(patch.metrics_count).toBe(3);
  });

  it("falha não zera metrics_count", () => {
    const patch = buildConnectionMetricSyncPatch({ ok: false, error: "401" });
    expect(patch.last_sync_status).toBe("error");
    expect(patch.health_status).toBe("unhealthy");
    expect(patch.last_error).toBe("401");
    expect(patch).not.toHaveProperty("metrics_count");
  });
});
