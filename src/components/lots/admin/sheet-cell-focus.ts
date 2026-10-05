const CELL = "[data-sheet-cell]";

/** Próximo ou anterior campo da planilha (tarefa, cliente, proprietário, entrega, status). */
export function focusAdjacentSheetCell(from: HTMLElement | null, direction: 1 | -1) {
  if (!from) return;
  const table = from.closest("table");
  if (!table) return;
  const cells = [...table.querySelectorAll<HTMLElement>(CELL)];
  const index = cells.findIndex((cell) => cell === from || cell.contains(from));
  if (index < 0) return;
  cells[index + direction]?.focus();
}
