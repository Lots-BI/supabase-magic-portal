import { describe, expect, it } from "vitest";
import { liveDebounceMs, queryKeysForScopes } from "./live-query-map";

describe("queryKeysForScopes", () => {
  it("atualiza a planilha e a fila de tarefas dos dois lados", () => {
    const keys = queryKeysForScopes(["tasks"]);
    expect(keys).toEqual(
      expect.arrayContaining([["lots-pendencias"], ["admin", "tarefas"], ["cliente", "tarefas"]]),
    );
  });

  it("não repete a mesma chave quando dois escopos se cruzam", () => {
    const keys = queryKeysForScopes(["tasks", "content"]);
    const serialized = keys.map((key) => JSON.stringify(key));
    expect(new Set(serialized).size).toBe(serialized.length);
    expect(serialized.filter((key) => key === JSON.stringify(["lots-pendencias"]))).toHaveLength(1);
  });

  it("numa reconexão relê todas as superfícies ao vivo", () => {
    const reconnect = queryKeysForScopes(["reconnect"]);
    const tasks = queryKeysForScopes(["tasks"]);
    expect(reconnect.length).toBeGreaterThan(tasks.length);
    expect(reconnect).toEqual(expect.arrayContaining([["crm"], ["platform-rows"], ["approval"]]));
  });
});

describe("liveDebounceMs", () => {
  it("espera um pouco mais quando a mudança é de métrica ou CRM", () => {
    expect(liveDebounceMs(["tasks"])).toBe(350);
    expect(liveDebounceMs(["tasks", "metrics"])).toBe(1_500);
    expect(liveDebounceMs(["crm"])).toBe(1_500);
  });
});
