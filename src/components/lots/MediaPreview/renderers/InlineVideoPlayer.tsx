import { useCallback, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/media-preview";
import type { MediaAsset } from "@/lib/media-preview";
import { useMediaLazyLoad } from "../hooks/useMediaLazyLoad";

export function InlineVideoPlayer({
  asset,
  className,
  vertical,
  autoPoster = true,
}: {
  asset: MediaAsset;
  className?: string;
  vertical?: boolean;
  autoPoster?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { ref, visible } = useMediaLazyLoad(true);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(asset.durationSeconds ?? 0);

  const toggle = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }, []);

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress(v.currentTime / v.duration);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    v.currentTime = ratio * v.duration;
  };

  return (
    <div
      ref={ref}
      className={cn(
        "group relative bg-black",
        vertical ? "aspect-[9/16] max-h-[520px]" : "aspect-square",
        className,
      )}
    >
      {visible ? (
        <video
          ref={videoRef}
          src={asset.url}
          className="h-full w-full object-contain"
          playsInline
          preload="metadata"
          poster={autoPoster ? (asset.posterUrl ?? undefined) : undefined}
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={() => {
            if (videoRef.current?.duration) setDuration(videoRef.current.duration);
          }}
          onEnded={() => setPlaying(false)}
          onClick={toggle}
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          {asset.posterUrl ? (
            <img src={asset.posterUrl} alt="" className="h-full w-full object-cover opacity-60" />
          ) : (
            <div className="h-full w-full animate-pulse bg-white/5" />
          )}
        </div>
      )}

      <button
        type="button"
        onClick={toggle}
        className={cn(
          "absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-opacity",
          playing ? "opacity-0 group-hover:opacity-100" : "opacity-100",
        )}
        aria-label={playing ? "Pausar" : "Reproduzir"}
      >
        {playing ? <Pause className="h-7 w-7" /> : <Play className="ml-0.5 h-7 w-7" />}
      </button>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6">
        <div
          role="slider"
          aria-valuenow={Math.round(progress * 100)}
          className="h-1 cursor-pointer rounded-full bg-white/25"
          onClick={seek}
        >
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <p className="mt-1 text-right text-[10px] text-white/70">
          {formatDuration(duration * progress)} / {formatDuration(duration)}
        </p>
      </div>
    </div>
  );
}
