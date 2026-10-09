import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  File,
  Folder,
  FolderPlus,
  Home,
  Upload,
} from "lucide-react";
import {
  downloadMediaFiles,
  safePathSegment,
  type DownloadableFile,
} from "@/lib/download-media-files";
import { MATERIAL_PICKER_ACCEPT } from "@/modules/approval/services/material-upload";
import { uploadMaterialBytes } from "@/modules/approval/client/direct-media-upload";
import { prepareUploadFile } from "@/modules/approval/services/fit-media-to-allocation";
import { PickFilesControl } from "../card/PickFilesControl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  confirmLibraryFile,
  createLibraryFolder,
  listContentLibrary,
  moveLibraryFile,
  prepareLibraryUpload,
  renameLibraryItem,
} from "@/modules/approval/library/content-library.server";

const ARQUIVO = "application/x-lots-arquivo";

type Pasta = { id: string; parentId: string | null; nome: string };
type Arquivo = {
  id: string;
  folderId: string | null;
  nome: string;
  url: string | null;
  downloadUrl?: string | null;
  mimeType: string | null;
};
type ItemRef = { kind: "file" | "folder"; id: string };

function chave(item: ItemRef) {
  return `${item.kind}:${item.id}`;
}

function dataDaPasta(nome: string): number | null {
  const match = /^(\d{2})\/(\d{2})/.exec(nome);
  if (!match) return null;
  return Number(match[2]) * 100 + Number(match[1]);
}

function ordenarPastas(a: Pasta, b: Pasta): number {
  const da = dataDaPasta(a.nome);
  const db = dataDaPasta(b.nome);
  if (da != null && db != null && da !== db) return db - da;
  if (da != null && db == null) return -1;
  if (db != null && da == null) return 1;
  return a.nome.localeCompare(b.nome, "pt");
}

/** Arquivos da pasta e das subpastas, com caminho relativo para gravar no explorador. */
export function arquivosDaPastaRecursivos(
  folderId: string,
  folders: Pasta[],
  files: Arquivo[],
  prefix: string,
): DownloadableFile[] {
  const diretos = files.filter(
    (file) => file.folderId === folderId && (file.downloadUrl || file.url),
  );
  const itens: DownloadableFile[] = diretos.map((file) => ({
    url: file.downloadUrl || file.url || "",
    fileName: file.nome,
    relativeDir: prefix || undefined,
  }));
  for (const sub of folders.filter((folder) => folder.parentId === folderId)) {
    const next = prefix ? `${prefix}/${safePathSegment(sub.nome)}` : safePathSegment(sub.nome);
    itens.push(...arquivosDaPastaRecursivos(sub.id, folders, files, next));
  }
  return itens;
}

export function BibliotecaPanel({
  cadastroClienteId,
  readOnly = false,
}: {
  cadastroClienteId: number;
  readOnly?: boolean;
}) {
  const qc = useQueryClient();
  const painelRef = useRef<HTMLElement>(null);
  const listFn = useServerFn(listContentLibrary);
  const folderFn = useServerFn(createLibraryFolder);
  const prepareFn = useServerFn(prepareLibraryUpload);
  const confirmFn = useServerFn(confirmLibraryFile);
  const moveFn = useServerFn(moveLibraryFile);
  const renameFn = useServerFn(renameLibraryItem);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [nomePasta, setNomePasta] = useState("");
  const [criando, setCriando] = useState(false);
  const [alvo, setAlvo] = useState<string | null>(null);
  const [soltando, setSoltando] = useState(false);
  const [selecao, setSelecao] = useState<string[]>([]);
  const [ancora, setAncora] = useState<string | null>(null);
  const [renomeando, setRenomeando] = useState<ItemRef | null>(null);

  const library = useQuery({
    queryKey: ["content-library", cadastroClienteId],
    queryFn: () => listFn({ data: { cadastroClienteId } }),
  });

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["content-library", cadastroClienteId] });
  }

  const criar = useMutation({
    mutationFn: () =>
      folderFn({
        data: { cadastroClienteId, parentId: folderId, nome: nomePasta.trim() },
      }),
    onSuccess: () => {
      setNomePasta("");
      setCriando(false);
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const mover = useMutation({
    mutationFn: (input: { fileIds: string[]; folderId: string | null }) =>
      moveFn({ data: { cadastroClienteId, ...input } }),
    onSuccess: () => {
      setSelecao([]);
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const renomear = useMutation({
    mutationFn: (input: ItemRef & { nome: string }) =>
      renameFn({ data: { cadastroClienteId, ...input } }),
    onSuccess: () => {
      setRenomeando(null);
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function enviarArquivo(file: File, destino: string | null) {
    const prepared = await prepareUploadFile(file);
    if (prepared.compressed) {
      toast.info(`${prepared.fileName} foi reduzido para caber nos 50 MB do armazenamento.`);
    }
    const ticket = await prepareFn({
      data: { cadastroClienteId, folderId: destino, nome: prepared.fileName },
    });
    await uploadMaterialBytes({
      ticket: {
        path: ticket.path,
        token: ticket.token,
        mimeType: prepared.mimeType,
      },
      file: prepared.file,
    });
    await confirmFn({
      data: {
        cadastroClienteId,
        folderId: destino,
        nome: prepared.fileName,
        path: ticket.path,
        mimeType: prepared.mimeType,
        fileSize: prepared.file.size,
      },
    });
  }

  async function enviarVarios(files: File[], destino: string | null) {
    try {
      for (const file of files) await enviarArquivo(file, destino);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar.");
    }
  }

  const pastas = (library.data?.folders ?? [])
    .filter((folder) => folder.parentId === folderId)
    .slice()
    .sort(ordenarPastas);
  const arquivos = (library.data?.files ?? []).filter((file) => file.folderId === folderId);
  const naRaiz = folderId == null;

  function contarItens(pastaId: string) {
    const sub = (library.data?.folders ?? []).filter(
      (folder) => folder.parentId === pastaId,
    ).length;
    const files = (library.data?.files ?? []).filter((file) => file.folderId === pastaId).length;
    const n = sub + files;
    if (n === 0) return "Vazia";
    if (n === 1) return "1 item";
    return `${n} itens`;
  }

  function voltar() {
    const atual = (library.data?.folders ?? []).find((folder) => folder.id === folderId);
    setFolderId(atual?.parentId ?? null);
    setSelecao([]);
    setAncora(null);
  }
  const ordem = useMemo(
    () => [
      ...pastas.map((pasta) => chave({ kind: "folder", id: pasta.id })),
      ...arquivos.map((file) => chave({ kind: "file", id: file.id })),
    ],
    [pastas, arquivos],
  );

  function selecionar(item: ItemRef, event: MouseEvent) {
    const id = chave(item);
    if (event.shiftKey && ancora) {
      const inicio = ordem.indexOf(ancora);
      const fim = ordem.indexOf(id);
      if (inicio >= 0 && fim >= 0) {
        const [de, ate] = inicio < fim ? [inicio, fim] : [fim, inicio];
        setSelecao(ordem.slice(de, ate + 1));
        return;
      }
    }
    if (event.metaKey || event.ctrlKey) {
      setSelecao((atual) =>
        atual.includes(id) ? atual.filter((itemId) => itemId !== id) : [...atual, id],
      );
      setAncora(id);
      return;
    }
    if (selecao.length === 1 && selecao[0] === id) {
      setSelecao([]);
      setAncora(null);
      return;
    }
    setSelecao([id]);
    setAncora(id);
  }

  function abrir(item: ItemRef) {
    if (item.kind === "folder") {
      setFolderId(item.id);
      setSelecao([]);
      setAncora(null);
      return;
    }
    const arquivo = arquivos.find((file) => file.id === item.id);
    if (arquivo?.url) window.open(arquivo.url, "_blank", "noopener");
  }

  function soltar(destino: string | null, event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    setAlvo(null);
    setSoltando(false);
    if (readOnly) return;
    const bruto = event.dataTransfer.getData(ARQUIVO);
    if (bruto) {
      const ids = bruto.split(",").filter(Boolean);
      if (ids.length) mover.mutate({ fileIds: ids, folderId: destino });
      return;
    }
    const files = [...event.dataTransfer.files];
    if (files.length > 0) void enviarVarios(files, destino);
  }

  useEffect(() => {
    const painel = painelRef.current;
    if (!painel) return;
    function noTeclado(event: KeyboardEvent) {
      const alvoTecla = event.target;
      if (
        alvoTecla instanceof HTMLInputElement ||
        alvoTecla instanceof HTMLTextAreaElement ||
        (alvoTecla instanceof HTMLElement && alvoTecla.isContentEditable)
      ) {
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelecao(ordem);
        return;
      }
      if (event.key === "Escape") {
        setSelecao([]);
        setRenomeando(null);
        return;
      }
      if (event.key === "Backspace" && !naRaiz) {
        event.preventDefault();
        voltar();
        return;
      }
      if (event.key === "Enter" && selecao.length === 1) {
        event.preventDefault();
        const [kind, id] = selecao[0].split(":") as [ItemRef["kind"], string];
        abrir({ kind, id });
        return;
      }
      if (event.key === "F2" && selecao.length === 1) {
        event.preventDefault();
        const [kind, id] = selecao[0].split(":") as [ItemRef["kind"], string];
        setRenomeando({ kind, id });
      }
    }
    painel.addEventListener("keydown", noTeclado);
    return () => painel.removeEventListener("keydown", noTeclado);
  }, [ordem, selecao, naRaiz, folderId, library.data?.folders]);

  const trilha = useMemo(() => {
    const todas = library.data?.folders ?? [];
    const caminho: Pasta[] = [];
    let atual = folderId;
    while (atual) {
      const pasta = todas.find((item) => item.id === atual);
      if (!pasta) break;
      caminho.unshift(pasta);
      atual = pasta.parentId;
    }
    return caminho;
  }, [folderId, library.data?.folders]);

  const unico = selecao.length === 1 ? selecao[0] : null;
  const arquivosSelecionados = arquivos.filter((file) =>
    selecao.includes(chave({ kind: "file", id: file.id })),
  );
  const pastasSelecionadas = pastas.filter((folder) =>
    selecao.includes(chave({ kind: "folder", id: folder.id })),
  );
  const podeBaixar = arquivosSelecionados.length > 0 || pastasSelecionadas.length > 0;

  async function baixarSelecionados() {
    const todasPastas = library.data?.folders ?? [];
    const todosArquivos = library.data?.files ?? [];
    const prontos: DownloadableFile[] = [
      ...arquivosSelecionados
        .filter((file) => file.downloadUrl || file.url)
        .map((file) => ({
          url: file.downloadUrl || file.url || "",
          fileName: file.nome,
        })),
      ...pastasSelecionadas.flatMap((pasta) =>
        arquivosDaPastaRecursivos(
          pasta.id,
          todasPastas,
          todosArquivos,
          safePathSegment(pasta.nome),
        ),
      ),
    ];
    if (prontos.length === 0) {
      toast.error("Nenhum arquivo pronto para download.");
      return;
    }
    try {
      await downloadMediaFiles(prontos);
      toast.success(prontos.length === 1 ? "Arquivo salvo." : `${prontos.length} arquivos salvos.`);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(error instanceof Error ? error.message : "Não foi possível baixar.");
    }
  }

  return (
    <section
      ref={painelRef}
      tabIndex={0}
      className={cn(
        "lots-surface relative overflow-hidden border border-muted outline-none",
        soltando && alvo == null && "ring-2 ring-primary ring-inset",
      )}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setSelecao([]);
      }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        setSoltando(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        setSoltando(false);
        setAlvo(null);
      }}
      onDrop={(event) => {
        if (readOnly) return;
        soltar(folderId, event);
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-muted px-4 py-3">
        <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm" aria-label="Pastas">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={naRaiz}
            onClick={voltar}
            aria-label="Pasta anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium",
              naRaiz ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
              alvo === "raiz" && "bg-primary/15 text-primary",
            )}
            onClick={() => {
              setFolderId(null);
              setSelecao([]);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setAlvo("raiz");
            }}
            onDragLeave={() => setAlvo((atual) => (atual === "raiz" ? null : atual))}
            onDrop={(event) => soltar(null, event)}
          >
            <Home className="h-3.5 w-3.5" />
            Biblioteca
          </button>
          {trilha.map((pasta, index) => (
            <span key={pasta.id} className="flex min-w-0 items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <button
                type="button"
                className={cn(
                  "max-w-[220px] truncate rounded-md px-2 py-1 font-medium",
                  index === trilha.length - 1
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                  alvo === pasta.id && "bg-primary/15 text-primary",
                )}
                onClick={() => {
                  setFolderId(pasta.id);
                  setSelecao([]);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setAlvo(pasta.id);
                }}
                onDrop={(event) => soltar(pasta.id, event)}
              >
                {pasta.nome}
              </button>
            </span>
          ))}
        </nav>
        <div className="flex flex-wrap gap-2">
          {readOnly ? null : (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={!unico}
                onClick={() => {
                  if (!unico) return;
                  const [kind, id] = unico.split(":") as [ItemRef["kind"], string];
                  setRenomeando({ kind, id });
                }}
              >
                Renomear
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCriando((aberto) => !aberto)}
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                Nova pasta
              </Button>
            </>
          )}
          {podeBaixar ? (
            <Button type="button" onClick={() => void baixarSelecionados()}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          ) : null}
          {readOnly ? null : (
            <PickFilesControl
              multiple
              accept={MATERIAL_PICKER_ACCEPT}
              ariaLabel="Fazer upload"
              onFiles={(files) => void enviarVarios(files, folderId)}
              className="inline-flex"
            >
              <span className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90">
                <Upload className="mr-2 h-4 w-4" />
                Fazer upload
              </span>
            </PickFilesControl>
          )}
        </div>
      </div>

      {criando ? (
        <form
          className="flex gap-2 border-b border-muted px-4 py-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (nomePasta.trim()) criar.mutate();
          }}
        >
          <input
            value={nomePasta}
            onChange={(event) => setNomePasta(event.target.value)}
            placeholder="Nome da pasta"
            autoFocus
            className="h-9 min-w-0 flex-1 rounded-md border border-muted bg-card px-2 text-sm"
          />
          <Button type="submit" disabled={criar.isPending || !nomePasta.trim()}>
            Criar
          </Button>
        </form>
      ) : null}

      {library.isLoading ? (
        <p className="px-4 py-8 text-sm text-muted-foreground">Carregando arquivos…</p>
      ) : pastas.length === 0 && arquivos.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <Folder className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
          <p className="text-sm font-medium">
            {naRaiz ? "Biblioteca da marca" : "Esta pasta está vazia"}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {naRaiz
              ? "Cada conteúdo ganha uma pasta com a data e o título. Arraste arquivos ou crie uma pasta."
              : "Arraste arquivos para cá ou use Fazer upload."}
          </p>
        </div>
      ) : (
        <ul
          className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelecao([]);
          }}
        >
          {naRaiz ? (
            <p className="col-span-full text-xs text-muted-foreground">
              Um clique seleciona. Dois cliques abrem a pasta. Selecione uma pasta para baixar tudo
              o que está dentro.
            </p>
          ) : null}
          {pastas.map((folder) => (
            <ItemMiniatura
              key={folder.id}
              nome={folder.nome}
              subtitulo={contarItens(folder.id)}
              selecionado={selecao.includes(chave({ kind: "folder", id: folder.id }))}
              alvo={alvo === folder.id}
              renomeando={renomeando?.kind === "folder" && renomeando.id === folder.id}
              onSelect={(event) => selecionar({ kind: "folder", id: folder.id }, event)}
              onOpen={() => abrir({ kind: "folder", id: folder.id })}
              onRename={(nome) => renomear.mutate({ kind: "folder", id: folder.id, nome })}
              onCancelRename={() => setRenomeando(null)}
              onDragOver={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setAlvo(folder.id);
              }}
              onDragLeave={() => setAlvo((atual) => (atual === folder.id ? null : atual))}
              onDrop={(event) => soltar(folder.id, event)}
            >
              <FolderPreview files={arquivosDaPasta(folder.id, library.data?.files ?? [])} />
            </ItemMiniatura>
          ))}
          {arquivos.map((file) => (
            <ItemMiniatura
              key={file.id}
              nome={file.nome}
              selecionado={selecao.includes(chave({ kind: "file", id: file.id }))}
              renomeando={renomeando?.kind === "file" && renomeando.id === file.id}
              draggable
              onSelect={(event) => selecionar({ kind: "file", id: file.id }, event)}
              onOpen={() => abrir({ kind: "file", id: file.id })}
              onRename={(nome) => renomear.mutate({ kind: "file", id: file.id, nome })}
              onCancelRename={() => setRenomeando(null)}
              onDragStart={(event) => {
                const id = chave({ kind: "file", id: file.id });
                const ids = selecao.includes(id)
                  ? selecao.filter((item) => item.startsWith("file:")).map((item) => item.slice(5))
                  : [file.id];
                event.dataTransfer.setData(ARQUIVO, ids.join(","));
                event.dataTransfer.effectAllowed = "move";
              }}
            >
              <Miniatura file={file} />
            </ItemMiniatura>
          ))}
        </ul>
      )}
      {soltando && alvo == null ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-primary/10">
          <p className="rounded-full bg-card px-4 py-2 text-sm font-medium shadow">
            Solte para enviar
          </p>
        </div>
      ) : null}
    </section>
  );
}

function arquivosDaPasta(folderId: string, files: Arquivo[]): Arquivo[] {
  return files.filter((file) => file.folderId === folderId);
}

function FolderPreview({ files }: { files: Arquivo[] }) {
  const thumbs = files
    .filter(
      (file) =>
        Boolean(file.url) &&
        (file.mimeType?.startsWith("image/") || file.mimeType?.startsWith("video/")),
    )
    .slice(0, 4);
  if (thumbs.length === 0) {
    return <Folder className="h-16 w-16 text-primary" />;
  }
  if (thumbs.length === 1) {
    return (
      <div className="relative h-full w-full">
        <span className="absolute left-2 top-0 z-10 h-2 w-[38%] rounded-t-sm bg-amber-500" />
        <div className="absolute inset-x-0 bottom-0 top-2 overflow-hidden rounded-md bg-muted">
          <Miniatura file={thumbs[0]} />
        </div>
      </div>
    );
  }
  return (
    <div className="relative h-full w-full">
      <span className="absolute left-2 top-0 z-10 h-2 w-[38%] rounded-t-sm bg-amber-500" />
      <div className="absolute inset-x-0 bottom-0 top-2 grid grid-cols-2 grid-rows-2 gap-px overflow-hidden rounded-md bg-background">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={thumbs[index]?.id ?? `vazio-${index}`} className="overflow-hidden bg-muted/80">
            {thumbs[index] ? <Miniatura file={thumbs[index]} /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function Miniatura({ file }: { file: Arquivo }) {
  if (file.mimeType?.startsWith("image/") && file.url) {
    return <img src={file.url} alt="" className="h-full w-full object-cover" />;
  }
  if (file.mimeType?.startsWith("video/") && file.url) {
    return <video src={file.url} muted preload="metadata" className="h-full w-full object-cover" />;
  }
  return <File className="h-16 w-16 text-muted-foreground" />;
}

function ItemMiniatura({
  nome,
  subtitulo,
  selecionado,
  alvo = false,
  renomeando,
  draggable = false,
  children,
  onSelect,
  onOpen,
  onRename,
  onCancelRename,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  nome: string;
  subtitulo?: string;
  selecionado: boolean;
  alvo?: boolean;
  renomeando: boolean;
  draggable?: boolean;
  children: ReactNode;
  onSelect: (event: MouseEvent) => void;
  onOpen: () => void;
  onRename: (nome: string) => void;
  onCancelRename: () => void;
  onDragStart?: (event: DragEvent) => void;
  onDragOver?: (event: DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (event: DragEvent) => void;
}) {
  const [texto, setTexto] = useState(nome);
  const arrastou = useRef(false);
  const fechou = useRef(false);
  useEffect(() => {
    if (!renomeando) return;
    setTexto(nome);
    fechou.current = false;
  }, [renomeando, nome]);
  function confirmar() {
    if (fechou.current) return;
    fechou.current = true;
    if (texto.trim() && texto.trim() !== nome) onRename(texto.trim());
    else onCancelRename();
  }
  return (
    <li
      draggable={draggable}
      onDragStart={(event) => {
        arrastou.current = true;
        onDragStart?.(event);
      }}
      onDragEnd={() => {
        window.setTimeout(() => {
          arrastou.current = false;
        }, 0);
      }}
      className={cn(
        "cursor-pointer select-none overflow-hidden rounded-xl border bg-card",
        draggable && "cursor-grab active:cursor-grabbing",
        selecionado || alvo ? "border-primary bg-primary/10" : "border-muted hover:bg-muted/60",
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={(event) => {
        if (renomeando || arrastou.current) return;
        if (event.target instanceof HTMLInputElement) return;
        if (event.detail > 1) return;
        onSelect(event);
      }}
      onDoubleClick={(event) => {
        if (renomeando) return;
        event.preventDefault();
        onOpen();
      }}
    >
      <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-muted/40">
        {children}
      </div>
      {renomeando ? (
        <input
          value={texto}
          autoFocus
          aria-label="Novo nome"
          className="m-2 h-8 w-[calc(100%-1rem)] rounded-md border border-primary bg-card px-2 text-center text-sm"
          onChange={(event) => setTexto(event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              confirmar();
            }
            if (event.key === "Escape") {
              fechou.current = true;
              onCancelRename();
            }
          }}
          onBlur={confirmar}
        />
      ) : (
        <div className="px-2 py-2 text-center">
          <p className="line-clamp-2 text-sm font-medium">{nome}</p>
          {subtitulo ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitulo}</p>
          ) : null}
        </div>
      )}
    </li>
  );
}
