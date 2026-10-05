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
import { ChevronRight, File, Folder, FolderPlus, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
  mimeType: string | null;
};
type ItemRef = { kind: "file" | "folder"; id: string };

function chave(item: ItemRef) {
  return `${item.kind}:${item.id}`;
}

export function BibliotecaPanel({ cadastroClienteId }: { cadastroClienteId: number }) {
  const qc = useQueryClient();
  const painelRef = useRef<HTMLElement>(null);
  const listFn = useServerFn(listContentLibrary);
  const folderFn = useServerFn(createLibraryFolder);
  const prepareFn = useServerFn(prepareLibraryUpload);
  const confirmFn = useServerFn(confirmLibraryFile);
  const moveFn = useServerFn(moveLibraryFile);
  const renameFn = useServerFn(renameLibraryItem);
  const fileRef = useRef<HTMLInputElement>(null);
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
    const ticket = await prepareFn({
      data: { cadastroClienteId, folderId: destino, nome: file.name },
    });
    const { error } = await supabase.storage
      .from("editorial-media")
      .uploadToSignedUrl(ticket.path, ticket.token, file);
    if (error) throw new Error(error.message);
    await confirmFn({
      data: {
        cadastroClienteId,
        folderId: destino,
        nome: file.name,
        path: ticket.path,
        mimeType: file.type || null,
        fileSize: file.size,
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

  const pastas = (library.data?.folders ?? []).filter((folder) => folder.parentId === folderId);
  const arquivos = (library.data?.files ?? []).filter((file) => file.folderId === folderId);
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
      if (event.key === "F2" && selecao.length === 1) {
        event.preventDefault();
        const [kind, id] = selecao[0].split(":") as [ItemRef["kind"], string];
        setRenomeando({ kind, id });
      }
    }
    painel.addEventListener("keydown", noTeclado);
    return () => painel.removeEventListener("keydown", noTeclado);
  }, [ordem, selecao]);

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
      onDrop={(event) => soltar(folderId, event)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-muted px-4 py-3">
        <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm" aria-label="Pastas">
          <button
            type="button"
            className={cn(
              "rounded-md px-2 py-1 font-medium",
              alvo === "raiz" ? "bg-primary/15 text-primary" : "text-foreground",
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
            Meu Drive
          </button>
          {trilha.map((pasta) => (
            <span key={pasta.id} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <button
                type="button"
                className={cn(
                  "rounded-md px-2 py-1 font-medium",
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
          <Button type="button" variant="outline" onClick={() => setCriando((aberto) => !aberto)}>
            <FolderPlus className="mr-2 h-4 w-4" />
            Nova pasta
          </Button>
          <Button type="button" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Fazer upload
          </Button>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              const files = [...(event.target.files ?? [])];
              event.target.value = "";
              if (files.length) void enviarVarios(files, folderId);
            }}
          />
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
        <p className="px-4 py-16 text-center text-sm text-muted-foreground">
          Arraste arquivos para cá, ou crie uma pasta.
        </p>
      ) : (
        <ul
          className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelecao([]);
          }}
        >
          {pastas.map((folder) => (
            <ItemMiniatura
              key={folder.id}
              nome={folder.nome}
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
              <Folder className="h-16 w-16 text-primary" />
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
        "overflow-hidden rounded-xl border bg-card",
        draggable && "cursor-grab active:cursor-grabbing",
        selecionado || alvo ? "border-primary bg-primary/10" : "border-muted hover:bg-muted/60",
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <button
        type="button"
        className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-muted/40"
        onClick={(event) => {
          if (arrastou.current) return;
          onSelect(event);
        }}
        onDoubleClick={(event) => {
          event.preventDefault();
          onOpen();
        }}
      >
        {children}
      </button>
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
        <p className="line-clamp-2 px-2 py-2 text-center text-sm font-medium">{nome}</p>
      )}
    </li>
  );
}
