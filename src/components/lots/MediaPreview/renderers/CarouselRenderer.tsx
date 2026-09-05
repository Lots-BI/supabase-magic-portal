import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaAsset } from "@/lib/media-preview";
import { LazyImage } from "./LazyImage";
import { InlineVideoPlayer } from "./InlineVideoPlayer";

export type CarouselControls = {
  scrollPrev: () => void;
  scrollNext: () => void;
};

export function CarouselRenderer({
  assets,
  zoom = 1,
  onIndexChange,
  onControlsReady,
}: {
  assets: MediaAsset[];
  zoom?: number;
  onIndexChange?: (index: number) => void;
  onControlsReady?: (controls: CarouselControls) => void;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, dragFree: false });
  const [index, setIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onControlsReady?.({
      scrollPrev: () => emblaApi.scrollPrev(),
      scrollNext: () => emblaApi.scrollNext(),
    });
    const onSelect = () => {
      const i = emblaApi.selectedScrollSnap();
      setIndex(i);
      onIndexChange?.(i);
    };
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onIndexChange, onControlsReady]);

  return (
    <div className="relative">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {assets.map((asset) => (
            <div key={asset.id} className="min-w-0 flex-[0_0_100%]">
              {asset.kind === "video" ? (
                <InlineVideoPlayer asset={asset} />
              ) : (
                <LazyImage asset={asset} className="aspect-square" zoom={zoom} />
              )}
            </div>
          ))}
        </div>
      </div>

      {assets.length > 1 && (
        <>
          <button
            type="button"
            onClick={scrollPrev}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white opacity-80 hover:opacity-100"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={scrollNext}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white opacity-80 hover:opacity-100"
            aria-label="Próximo"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute right-3 top-3 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
            {index + 1}/{assets.length}
          </div>

          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1">
            {assets.map((a, i) => (
              <span
                key={a.id}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-4 bg-white" : "w-1.5 bg-white/40",
                )}
              />
            ))}
          </div>

          <div className="flex gap-1 overflow-x-auto border-t border-white/10 bg-black/40 p-2">
            {assets.map((asset, i) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => emblaApi?.scrollTo(i)}
                className={cn(
                  "h-10 w-10 shrink-0 overflow-hidden rounded border-2 transition-colors",
                  i === index ? "border-primary" : "border-transparent opacity-60",
                )}
              >
                {asset.kind === "video" ? (
                  asset.posterUrl ? (
                    <img src={asset.posterUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-white/10 text-[9px]">
                      ▶
                    </div>
                  )
                ) : (
                  <img
                    src={asset.url}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
