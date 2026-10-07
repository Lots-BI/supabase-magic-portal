import { MediaPreview } from "@/components/lots/MediaPreview/MediaPreview";
import type { MediaPreviewContext } from "@/lib/media-preview";
import { cn } from "@/lib/utils";

export function SocialPreviewPanel({
  context,
  className,
  phone = false,
}: {
  context: MediaPreviewContext;
  className?: string;
  /** Largura de um celular — o tamanho do post no feed, não a tela inteira. */
  phone?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card",
        phone && "mx-auto w-full max-w-[390px] shadow-md",
        className,
      )}
    >
      <MediaPreview context={context} interactive={!phone} className="border-0" />
    </div>
  );
}
