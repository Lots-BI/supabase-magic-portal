import { useCallback, useRef, useState } from "react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveMediaFormat, type MediaPreviewContext } from "@/lib/media-preview";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InstagramChrome } from "./InstagramChrome";
import { MediaPreviewSkeleton } from "./MediaPreviewSkeleton";
import { CarouselRenderer, type CarouselControls } from "./renderers/CarouselRenderer";
import { InlineVideoPlayer } from "./renderers/InlineVideoPlayer";
import { LazyImage } from "./renderers/LazyImage";
import { ReelRenderer, StoryRenderer } from "./renderers/VerticalFormats";
import { useMediaKeyboard } from "./hooks/useMediaKeyboard";

export interface MediaPreviewProps {
  context: MediaPreviewContext;
  loading?: boolean;
  className?: string;
  /** Exibir controles de zoom / fullscreen */
  interactive?: boolean;
  /** Modo compacto — só mídia + header mínimo */
  compact?: boolean;
}

export function MediaPreview({
  context,
  loading,
  className,
  interactive = true,
  compact,
}: MediaPreviewProps) {
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const carouselControls = useRef<CarouselControls | null>(null);

  const format = resolveMediaFormat(context);
  const assets = context.assets;

  const zoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.25, 2.5)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(z - 0.25, 1)), []);

  useMediaKeyboard({
    enabled: interactive && !loading,
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
    onFullscreen: () => setFullscreen(true),
    onEscape: () => setFullscreen(false),
    onPrev: format === "carousel" ? () => carouselControls.current?.scrollPrev() : undefined,
    onNext: format === "carousel" ? () => carouselControls.current?.scrollNext() : undefined,
  });

  if (loading) {
    return <MediaPreviewSkeleton className={className} />;
  }

  if (assets.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-[12px] text-muted-foreground",
          className,
        )}
      >
        Nenhuma mídia enviada pelo administrador
      </div>
    );
  }

  const renderMedia = () => {
    switch (format) {
      case "story":
        return <StoryRenderer ctx={context} />;
      case "reel":
        return <ReelRenderer ctx={context} />;
      case "carousel":
        return (
          <CarouselRenderer
            assets={assets}
            zoom={zoom}
            onControlsReady={(c) => {
              carouselControls.current = c;
            }}
          />
        );
      case "video":
        return <InlineVideoPlayer asset={assets[0]} />;
      case "feed":
      default:
        return <LazyImage asset={assets[0]} className="aspect-square" zoom={zoom} />;
    }
  };

  const useChrome = format === "feed" || format === "carousel" || format === "video";

  const previewBody = useChrome ? (
    <InstagramChrome ctx={context} compact={compact}>
      {renderMedia()}
    </InstagramChrome>
  ) : (
    renderMedia()
  );

  return (
    <div className={cn("relative", className)}>
      <div className="transition-opacity duration-300">{previewBody}</div>

      {interactive && useChrome && (
        <div className="absolute right-2 top-14 z-20 flex flex-col gap-1">
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 bg-black/50 text-white hover:bg-black/70"
            onClick={zoomIn}
            aria-label="Ampliar"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 bg-black/50 text-white hover:bg-black/70"
            onClick={zoomOut}
            aria-label="Reduzir"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 bg-black/50 text-white hover:bg-black/70"
            onClick={() => setFullscreen(true)}
            aria-label="Tela cheia"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-h-[95vh] max-w-5xl border-border bg-background p-2 sm:p-4">
          <DialogHeader className="sr-only">
            <DialogTitle>Preview em tela cheia</DialogTitle>
          </DialogHeader>
          <div className="max-h-[85vh] overflow-auto">
            <MediaPreview context={context} interactive={false} compact />
          </div>
          <p className="text-center text-[10px] text-muted-foreground">
            Esc · sair · F · tela cheia · +/- · zoom
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { MediaPreviewSkeleton } from "./MediaPreviewSkeleton";
