import { useEffect } from "react";

interface MediaKeyboardOpts {
  onPrev?: () => void;
  onNext?: () => void;
  onFullscreen?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onEscape?: () => void;
  enabled?: boolean;
}

export function useMediaKeyboard({
  onPrev,
  onNext,
  onFullscreen,
  onZoomIn,
  onZoomOut,
  onEscape,
  enabled = true,
}: MediaKeyboardOpts) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      switch (e.key) {
        case "ArrowLeft":
          onPrev?.();
          break;
        case "ArrowRight":
          onNext?.();
          break;
        case "f":
        case "F":
          onFullscreen?.();
          break;
        case "+":
        case "=":
          onZoomIn?.();
          break;
        case "-":
          onZoomOut?.();
          break;
        case "Escape":
          onEscape?.();
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, onPrev, onNext, onFullscreen, onZoomIn, onZoomOut, onEscape]);
}
