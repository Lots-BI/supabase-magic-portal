type DiretrizesPdfViewerProps = {
  url: string;
  title: string;
  className?: string;
};

/** PDF em tela cheia, sem chrome extra do visualizador. */
export function DiretrizesPdfViewer({ url, title, className }: DiretrizesPdfViewerProps) {
  const src = `${url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`;

  return (
    <iframe
      title={title}
      src={src}
      className={
        className ??
        "block h-[calc(100dvh-3.5rem)] w-full border-0 bg-neutral-200 dark:bg-neutral-950"
      }
    />
  );
}
