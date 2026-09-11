import { cn } from "@/lib/utils";
import type { MediaAsset } from "@/lib/media-preview";

export function CardAttachedMedia({
  assets,
  className,
}: {
  assets: MediaAsset[];
  className?: string;
}) {
  const hero = assets[0];
  if (!hero) return null;
  const rest = assets.slice(1);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="overflow-hidden rounded-2xl border border-border bg-black">
        {hero.kind === "video" ? (
          <video
            src={hero.url}
            poster={hero.posterUrl ?? undefined}
            controls
            playsInline
            className="mx-auto max-h-[70vh] w-full object-contain"
          />
        ) : (
          <img src={hero.url} alt="" className="mx-auto max-h-[70vh] w-full object-contain" />
        )}
      </div>
      {rest.length > 0 ? (
        <ul className="grid grid-cols-4 gap-2">
          {rest.map((asset) => (
            <li key={asset.id} className="overflow-hidden rounded-xl border border-border bg-muted">
              {asset.kind === "video" ? (
                <video
                  src={asset.url}
                  poster={asset.posterUrl ?? undefined}
                  muted
                  playsInline
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <img src={asset.url} alt="" className="aspect-square w-full object-cover" />
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
