import { useState, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Eye, ChevronDown, Search } from "lucide-react";
import { listClientes } from "@/lib/admin.functions";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";

/**
 * Seletor para o admin "Ver como cliente". Não impersona — apenas
 * navega para a página visual do cliente escolhido.
 */
export function ImpersonateClienteMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const { data: clientes } = useQuery({
    queryKey: ["admin", "clientes", "list"],
    queryFn: () => listClientes(),
    enabled: open,
    staleTime: 60_000,
  });

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const list = (clientes as any[] | undefined) ?? [];
  const filtered = list.filter((c) =>
    !q ? true : (c.nome_cliente as string).toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "lots-focus inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary-300 hover:text-foreground sm:h-9 sm:px-3",
          open && "border-primary-300 text-foreground",
        )}
      >
        <Eye className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden min-[360px]:inline">Ver como cliente</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(calc(100vw-1.5rem),280px)] overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-lg)]">
          <div className="relative border-b border-border p-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar cliente…"
              className="lots-focus h-8 w-full rounded-md border border-border bg-background pl-8 pr-2 text-[12.5px]"
            />
          </div>
          <ul className="max-h-[320px] overflow-y-auto py-1">
            {!clientes && (
              <li className="px-3 py-2 text-[12px] text-muted-foreground">Carregando…</li>
            )}
            {clientes && filtered.length === 0 && (
              <li className="px-3 py-2 text-[12px] text-muted-foreground">Nenhum cliente.</li>
            )}
            {filtered.map((c: any) => (
              <li key={c.id}>
                <button
                  onClick={() => {
                    setOpen(false);
                    const target = c.slug ? slugify(c.slug) : slugify(c.nome_cliente);
                    navigate({ to: "/cliente/$cliente", params: { cliente: target } });
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[12.5px] hover:bg-muted/60"
                >
                  <span className="truncate font-medium text-foreground">{c.nome_cliente}</span>
                  {c.slug && (
                    <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground">
                      /{c.slug}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
