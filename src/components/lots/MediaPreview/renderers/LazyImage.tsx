import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaAsset } from "@/lib/media-preview";

export function LazyImage({
  asset,
  className,
  zoom = 1,
  onLoad,
}: {
  asset: MediaAsset;
  className?: string;
  zoom?: number;
  onLoad?: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        className={cn(
          "flex aspect-square items-center justify-center bg-muted/20 text-white/50",
          className,
        )}
      >
        <ImageOff className="h-8 w-8" />
        <span className="sr-only">Mídia indisponível</span>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-white/5" aria-hidden />}
      <img
        src={asset.url}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={cn(
          "h-full w-full object-contain transition-transform duration-300 ease-out",
          !loaded && "opacity-0",
        )}
        style={{ transform: `scale(${zoom})` }}
        onLoad={() => {
          setLoaded(true);
          onLoad?.();
        }}
        onError={() => setError(true)}
      />
    </div>
  );
}
