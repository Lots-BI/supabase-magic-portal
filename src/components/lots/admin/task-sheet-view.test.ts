import { describe, expect, it } from "vitest";
import { applyTaskSheetView, type ColumnFilter } from "./task-sheet-view";
import type { TaskSheetTask } from "@/modules/agency-os/tasks-sheet";

function task(
  partial: Partial<TaskSheetTask> & Pick<TaskSheetTask, "id" | "titulo">,
): TaskSheetTask {
  return {
    cadastro_cliente_id: 1,
    cliente_nome: "Alfa",
    entrega: "",
    status: "open",
    descricao: null,
    responsavel_user_id: null,
    responsavel_nome: null,
    aba: null,
    repete: null,
    concluida_em: null,
    ...partial,
  };
}

describe("filtro da planilha", () => {
  const tasks = [
    task({ id: "b", titulo: "Beta", cliente_nome: "Norte", entrega: "2026-10-20" }),
    task({
      id: "a",
      titulo: "alfa",
      cliente_nome: "Sul",
      entrega: "2026-10-02",
      status: "completed",
    }),
    task({ id: "c", titulo: "Tarefa 10", cliente_nome: "Norte", entrega: "2026-11-01" }),
    task({ id: "d", titulo: "Tarefa 2", cliente_nome: "Leste", entrega: "" }),
  ];

  it("ordena texto com números e data", () => {
    const titles = applyTaskSheetView(tasks, { column: "titulo", dir: "asc" }, {}).map(
      (item) => item.titulo,
    );
    expect(titles).toEqual(["alfa", "Beta", "Tarefa 2", "Tarefa 10"]);
    const dates = applyTaskSheetView(tasks, { column: "entrega", dir: "asc" }, {}).map(
      (item) => item.id,
    );
    expect(dates.at(-1)).toBe("d");
    expect(dates[0]).toBe("a");
  });

  it("filtra termo exato e por valor da coluna", () => {
    const exact: ColumnFilter = { condition: "exact", query: "Beta", values: null };
    expect(applyTaskSheetView(tasks, null, { titulo: exact }).map((item) => item.id)).toEqual([
      "b",
    ]);
    const clients: ColumnFilter = { condition: "", query: "", values: ["Norte"] };
    expect(applyTaskSheetView(tasks, null, { cliente: clients }).map((item) => item.id)).toEqual([
      "b",
      "c",
    ]);
  });
});
