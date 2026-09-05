import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, LayoutDashboard, Search, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { searchEngine } from "@/modules/core/search/search-engine";
import { mergeSearchResults } from "@/modules/core/search/merge-results";
import { searchOs } from "@/modules/core/core.server";
import { osKeys } from "@/modules/core/query-keys";
import "@/modules/os-bootstrap";
import { slugify } from "@/lib/slug";

export function GlobalSearch({ isAdmin = false }: { isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const { data: clientes = [] } = useQuery({
    queryKey: ["search-clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_clientes_ativos")
        .select("cliente")
        .order("cliente");
      if (error) throw error;
      return (data ?? []).map((r: { cliente: string }) => r.cliente);
    },
    staleTime: 5 * 60_000,
    enabled: open,
  });

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

  const needle = q.trim();

  const clientResults = useMemo(() => {
    const n = needle.toLowerCase();
    const list = n ? clientes.filter((c) => c.toLowerCase().includes(n)) : clientes.slice(0, 8);
    return list.slice(0, 8).map((nome) => ({
      id: `portal-client-${nome}`,
      label: nome,
      href: `/cliente/${slugify(nome)}`,
      group: "Clientes (portal)",
      score: 5,
    }));
  }, [clientes, needle]);

  const localResults = useMemo(() => {
    if (!open) return [];
    return searchEngine.searchLocal({ query: needle, isAdmin });
  }, [needle, isAdmin, open]);

  const { data: serverResults = [] } = useQuery({
    queryKey: osKeys.search(needle),
    queryFn: () => searchOs({ data: { query: needle } }),
    enabled: isAdmin && open && needle.length >= 2,
    staleTime: 30_000,
  });

  const merged = useMemo(
    () => mergeSearchResults(localResults, serverResults, clientResults),
    [localResults, serverResults, clientResults],
  );

  const groups = useMemo(() => searchEngine.groupResults(merged), [merged]);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    navigate({ to: href });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="hidden h-9 gap-2 text-muted-foreground sm:inline-flex"
        onClick={() => setOpen(true)}
        aria-label="Pesquisa global"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="text-xs">Buscar…</span>
        <kbd className="pointer-events-none hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] lg:inline">
          Ctrl+K
        </kbd>
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 sm:hidden"
        onClick={() => setOpen(true)}
        aria-label="Pesquisa global"
      >
        <Search className="h-4 w-4" />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Comandos, rotas, clientes, Agency OS…"
          value={q}
          onValueChange={setQ}
        />
        <CommandList>
          <CommandEmpty>Nenhum resultado.</CommandEmpty>

          {groups.map(([group, items], idx) => (
            <div key={group}>
              {idx > 0 && <CommandSeparator />}
              <CommandGroup heading={group}>
                {items.map((r) => (
                  <CommandItem
                    key={r.id}
                    value={`${r.label} ${r.hint ?? ""}`}
                    onSelect={() => go(r.href)}
                  >
                    <GroupIcon group={group} />
                    <span>{r.label}</span>
                    {r.hint && (
                      <span className="ml-2 truncate text-xs text-muted-foreground">{r.hint}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}

function GroupIcon({ group }: { group: string }) {
  if (group.includes("Clientes")) {
    return <Users className="mr-2 h-4 w-4 text-muted-foreground" />;
  }
  if (group.includes("Agency") || group.includes("Pipeline") || group.includes("crítico")) {
    return <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />;
  }
  return <LayoutDashboard className="mr-2 h-4 w-4 text-muted-foreground" />;
}
