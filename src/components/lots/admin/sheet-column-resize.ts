import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const MIN_WIDTH = 40;

export function useSheetColumnWidths(storageKey: string, defaults: readonly number[]) {
  const [widths, setWidths] = useState<number[]>(() => readWidths(storageKey, defaults));
  const widthsRef = useRef(widths);
  widthsRef.current = widths;

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(widths));
    } catch {
      // A largura continua nesta sessão se o navegador bloquear o armazenamento.
    }
  }, [storageKey, widths]);

  function startResize(index: number, event: ReactPointerEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startW = widthsRef.current[index] ?? defaults[index] ?? MIN_WIDTH;
    const previousCursor = document.body.style.cursor;
    const previousSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function move(next: PointerEvent) {
      const width = Math.max(MIN_WIDTH, Math.round(startW + next.clientX - startX));
      setWidths((current) =>
        current.map((item, itemIndex) => (itemIndex === index ? width : item)),
      );
    }
    function end(next: PointerEvent) {
      if (handle.hasPointerCapture(next.pointerId)) handle.releasePointerCapture(next.pointerId);
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", end);
      handle.removeEventListener("pointercancel", end);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelect;
    }
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  }

  return { widths, startResize };
}

function readWidths(storageKey: string, defaults: readonly number[]) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [...defaults];
    const parsed = JSON.parse(raw) as unknown;
    if (
      !Array.isArray(parsed) ||
      parsed.length !== defaults.length ||
      parsed.some((item) => typeof item !== "number" || item < MIN_WIDTH)
    ) {
      return [...defaults];
    }
    return parsed;
  } catch {
    return [...defaults];
  }
}
