import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FileText, Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getSearchIndex, searchDocs } from "@/lib/knowledge-center";
import type Fuse from "fuse.js";
import type { SearchableDoc } from "@/lib/knowledge-center/search";

export function KnowledgeSearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [fuse, setFuse] = useState<Fuse<SearchableDoc> | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open || fuse) return;
    let cancelled = false;
    void getSearchIndex().then((index) => {
      if (!cancelled) setFuse(index);
    });
    return () => {
      cancelled = true;
    };
  }, [open, fuse]);

  const results = fuse ? searchDocs(fuse, query, 24) : [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const goTo = useCallback(
    (slug: string) => {
      setOpen(false);
      setQuery("");
      void navigate({ to: "/admin/knowledge/$", params: { _splat: slug } });
    },
    [navigate],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lots-focus flex h-9 w-full max-w-sm items-center gap-2 rounded-lg border border-border bg-card px-3 text-left text-xs text-muted-foreground transition-colors hover:border-primary-300"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 truncate">Buscar documentação…</span>
        <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Buscar títulos, conteúdo, tags, ADRs…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {fuse ? "Nenhum documento encontrado." : "Carregando índice de busca…"}
          </CommandEmpty>
          {results.length > 0 && (
            <CommandGroup heading="Documentos">
              {results.map((hit) => (
                <CommandItem key={hit.slug} value={hit.slug} onSelect={() => goTo(hit.slug)}>
                  <FileText className="mr-2 h-4 w-4 opacity-60" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{hit.title}</p>
                    {hit.description && (
                      <p className="truncate text-xs text-muted-foreground">{hit.description}</p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
