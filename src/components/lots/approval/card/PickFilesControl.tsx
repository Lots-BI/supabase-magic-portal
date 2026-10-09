import type { DragEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * O toque precisa cair no próprio input. No iOS, `display: none` + `.click()`
 * não abre a galeria — principalmente dentro de um popup.
 */
export function PickFilesControl({
  accept,
  multiple = false,
  capture,
  disabled,
  onFiles,
  onDragOver,
  onDrop,
  className,
  children,
  ariaLabel,
}: {
  accept?: string;
  multiple?: boolean;
  capture?: "environment" | "user";
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  onDragOver?: (event: DragEvent) => void;
  onDrop?: (event: DragEvent) => void;
  className?: string;
  children: ReactNode;
  ariaLabel: string;
}) {
  return (
    <label className={cn("relative", disabled && "pointer-events-none opacity-60", className)}>
      <input
        type="file"
        multiple={multiple}
        accept={accept}
        disabled={disabled}
        aria-label={ariaLabel}
        ref={(node) => {
          if (!node) return;
          if (capture) node.setAttribute("capture", capture);
          else node.removeAttribute("capture");
        }}
        className="absolute inset-0 z-10 block h-full w-full cursor-pointer opacity-0"
        onDragOver={onDragOver}
        onDrop={onDrop}
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          event.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
      {children}
    </label>
  );
}
