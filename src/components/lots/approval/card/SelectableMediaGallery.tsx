import { useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { downloadMediaFiles } from "@/lib/download-media-files";
import type { MediaAsset } from "@/lib/media-preview";

export function SelectableMediaGallery({
  assets,
  title = "Mídia do cliente",
  className,
}: {
  assets: MediaAsset[];
  title?: string;
  className?: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [downloading, setDownloading] = useState(false);

  if (assets.length === 0) return null;

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function handleDownload() {
    const chosen = assets.filter((asset) => selected.includes(asset.id));
    if (chosen.length === 0) return;
    setDownloading(true);
    try {
      await downloadMediaFiles(
        chosen.map((asset) => ({
          url: asset.downloadUrl || asset.url,
          fileName: asset.fileName?.trim() || `${asset.id}.bin`,
        })),
      );
      toast.success(chosen.length === 1 ? "Arquivo salvo." : `${chosen.length} arquivos salvos.`);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(error instanceof Error ? error.message : "Não foi possível baixar.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">{title}</p>
        {selected.length > 0 ? (
          <Button type="button" onClick={() => void handleDownload()} disabled={downloading}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">Selecione as mídias para baixar</p>
        )}
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {assets.map((asset) => {
          const isOn = selected.includes(asset.id);
          return (
            <li key={asset.id}>
              <button
                type="button"
                onClick={() => toggle(asset.id)}
                className={cn(
                  "group relative block w-full overflow-hidden rounded-lg border bg-muted/30 text-left",
                  isOn ? "border-primary ring-2 ring-primary" : "border-border",
                )}
              >
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
                <span
                  className={cn(
                    "absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded border bg-background text-[11px] font-semibold",
                    isOn ? "border-primary bg-primary text-primary-foreground" : "border-border",
                  )}
                  aria-hidden
                >
                  {isOn ? "✓" : ""}
                </span>
                <span className="absolute inset-x-0 bottom-0 truncate bg-background/80 px-2 py-1 text-[11px]">
                  {asset.fileName ?? "arquivo"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
