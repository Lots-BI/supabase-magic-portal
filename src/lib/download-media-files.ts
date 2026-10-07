export type DownloadableFile = {
  url: string;
  fileName: string;
  /** Caminho relativo da pasta, sem o nome do arquivo. Ex.: `07/10 — Post/bastidores`. */
  relativeDir?: string;
};

export function safePathSegment(name: string): string {
  return (
    name
      .replace(/[<>:"/\\|?*]+/g, "_")
      .replace(/\s+/g, " ")
      .trim() || "pasta"
  );
}

function uniqueFileName(used: Set<string>, name: string): string {
  const safe = name.trim() || "arquivo";
  if (!used.has(safe)) {
    used.add(safe);
    return safe;
  }
  const dot = safe.lastIndexOf(".");
  const base = dot > 0 ? safe.slice(0, dot) : safe;
  const ext = dot > 0 ? safe.slice(dot) : "";
  let index = 2;
  let next = `${base} (${index})${ext}`;
  while (used.has(next)) {
    index += 1;
    next = `${base} (${index})${ext}`;
  }
  used.add(next);
  return next;
}

async function directoryAt(
  root: FileSystemDirectoryHandle,
  relativeDir: string | undefined,
): Promise<FileSystemDirectoryHandle> {
  if (!relativeDir) return root;
  let current = root;
  for (const segment of relativeDir.split("/").filter(Boolean).map(safePathSegment)) {
    current = await current.getDirectoryHandle(segment, { create: true });
  }
  return current;
}

async function saveWithDirectoryPicker(files: DownloadableFile[]): Promise<void> {
  const picker = window.showDirectoryPicker;
  if (typeof picker !== "function") {
    throw new Error("Seletor de pasta indisponível");
  }
  const dir = await picker.call(window);
  const usedByDir = new Map<string, Set<string>>();
  for (const file of files) {
    const parent = await directoryAt(dir, file.relativeDir);
    const key = file.relativeDir ?? "";
    const used = usedByDir.get(key) ?? new Set<string>();
    usedByDir.set(key, used);
    const response = await fetch(file.url);
    if (!response.ok) throw new Error(`Não foi possível baixar ${file.fileName}.`);
    const blob = await response.blob();
    const handle = await parent.getFileHandle(uniqueFileName(used, file.fileName), {
      create: true,
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  }
}

function triggerAnchorDownloads(files: DownloadableFile[]): void {
  const used = new Set<string>();
  for (const file of files) {
    const a = document.createElement("a");
    a.href = file.url;
    const prefix = file.relativeDir ? `${file.relativeDir.replaceAll("/", " - ")} - ` : "";
    a.download = uniqueFileName(used, `${prefix}${file.fileName}`);
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

/** Abre o explorador (quando o browser permite) e grava as mídias no local escolhido. */
export async function downloadMediaFiles(files: DownloadableFile[]): Promise<void> {
  if (files.length === 0) return;
  try {
    await saveWithDirectoryPicker(files);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    triggerAnchorDownloads(files);
  }
}
