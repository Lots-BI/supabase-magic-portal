import { useEffect, useRef, useState } from "react";

/** Lazy-load vídeos: só carrega src quando visível no viewport. */
export function useMediaLazyLoad(enabled = true) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(!enabled);

  useEffect(() => {
    if (!enabled || visible) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [enabled, visible]);

  return { ref, visible };
}
