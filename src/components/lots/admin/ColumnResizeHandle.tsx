import type { PointerEvent as ReactPointerEvent } from "react";

export function ColumnResizeHandle({
  label,
  onPointerDown,
}: {
  label: string;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
}) {
  return (
    <span
      role="separator"
      aria-orientation="vertical"
      aria-label={`Ajustar largura de ${label}`}
      className="absolute -right-1 top-0 z-20 h-full w-2 cursor-col-resize touch-none hover:bg-primary/50"
      onPointerDown={onPointerDown}
    />
  );
}
