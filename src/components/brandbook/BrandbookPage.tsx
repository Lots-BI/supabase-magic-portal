import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/lotus/PageHeader";
import { SectionCard } from "@/components/lotus/SectionCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listClientes } from "@/lib/admin.functions";
import {
  BRANDBOOK_REGISTRY,
  listBrandbooksForClients,
  resolveBrandbookById,
  resolveBrandbookForClient,
  type BrandbookEntry,
} from "@/lib/brandbook/registry";
import { BrandbookViewer } from "./BrandbookViewer";
import { cn } from "@/lib/utils";

type BrandbookPageProps = {
  /** Quando definido, fixa o brand book do cliente (portal do cliente). */
  fixedClient?: { slug: string; nome: string | null };
  /** Quando definido, abre diretamente um brand book (deep link admin). */
  initialBrandbookId?: string;
  mode?: "admin" | "client";
};

export function BrandbookPage({
  fixedClient,
  initialBrandbookId,
  mode = "admin",
}: BrandbookPageProps) {
  const listClientesFn = useServerFn(listClientes);
  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ["admin", "clientes"],
    queryFn: () => listClientesFn(),
    enabled: !fixedClient,
  });

  const available = useMemo(() => {
    if (fixedClient) {
      const entry = resolveBrandbookForClient({
        slug: fixedClient.slug,
        nome_cliente: fixedClient.nome,
      });
      return entry ? [{ client: fixedClient, brandbook: entry }] : [];
    }

    const matched = listBrandbooksForClients(
      clientes.map((c) => ({
        slug: c.slug ?? null,
        nome_cliente: c.nome_cliente ?? null,
      })),
    );

    const matchedIds = new Set(matched.map((m) => m.brandbook.id));
    const unmatched = BRANDBOOK_REGISTRY.filter((entry) => !matchedIds.has(entry.id)).map(
      (brandbook) => ({ client: null, brandbook }),
    );

    return [...matched, ...unmatched];
  }, [clientes, fixedClient]);

  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    if (available.length === 0) {
      setSelectedId("");
      return;
    }
    if (initialBrandbookId && available.some((a) => a.brandbook.id === initialBrandbookId)) {
      setSelectedId(initialBrandbookId);
      return;
    }
    if (fixedClient) {
      setSelectedId(available[0]?.brandbook.id ?? "");
      return;
    }
    setSelectedId((current) =>
      current && available.some((a) => a.brandbook.id === current)
        ? current
        : (available[0]?.brandbook.id ?? ""),
    );
  }, [available, fixedClient, initialBrandbookId]);

  const active = useMemo(() => {
    const fromList = available.find((a) => a.brandbook.id === selectedId);
    if (fromList) return fromList;
    const fallback = resolveBrandbookById(selectedId);
    if (!fallback) return undefined;
    return { brandbook: fallback, client: fixedClient ?? null };
  }, [available, fixedClient, selectedId]);

  const isClient = mode === "client" || Boolean(fixedClient);

  return (
    <div className={cn(isClient ? "w-full" : "space-y-6")}>
      {!isClient ? (
        <PageHeader
          eyebrow="Operações"
          title="Brand book"
          description="Visualização integrada dos manuais de marca exportados do Figma — um repositório Git por cliente."
        />
      ) : null}

      {!fixedClient && !isLoading && available.length > 1 ? (
        <SectionCard title="Cliente" description="Selecione o brand book a visualizar.">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Escolha um cliente" />
            </SelectTrigger>
            <SelectContent>
              {available.map(({ client, brandbook }) => (
                <SelectItem key={brandbook.id} value={brandbook.id}>
                  {brandbook.label}
                  {client && "nome_cliente" in client && client.nome_cliente
                    ? ` (${client.nome_cliente})`
                    : client && "nome" in client && client.nome
                      ? ` (${client.nome})`
                      : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SectionCard>
      ) : null}

      {isLoading ? (
        <div className="lotus-surface p-8 text-sm text-muted-foreground">Carregando clientes…</div>
      ) : null}

      {!isLoading && active ? (
        <BrandbookViewer
          entry={active.brandbook}
          mode={isClient ? "client" : "admin"}
          clientLabel={
            fixedClient?.nome ??
            (active.client && "nome_cliente" in active.client
              ? (active.client.nome_cliente ?? undefined)
              : undefined)
          }
        />
      ) : null}

      {!isLoading && !active ? (
        <EmptyBrandbookState fixedClient={fixedClient} registry={BRANDBOOK_REGISTRY} />
      ) : null}
    </div>
  );
}

function EmptyBrandbookState({
  fixedClient,
  registry,
}: {
  fixedClient?: { slug: string; nome: string | null };
  registry: BrandbookEntry[];
}) {
  return (
    <SectionCard
      title={fixedClient ? "Diretrizes da Marca indisponíveis" : "Nenhum brand book vinculado"}
      description={
        fixedClient
          ? `Não há diretrizes cadastradas para ${fixedClient.nome ?? fixedClient.slug}.`
          : "Associe um cliente ao registro em src/lib/brandbook/registry.ts ou cadastre o slug correspondente."
      }
    >
      <div className="flex flex-col items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/40">
          <BookOpen className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="max-w-xl text-sm text-muted-foreground">
          Cada cliente possui um repositório Git dedicado, gerado a partir do Figma. Enquanto isso,
          você pode consultar os repositórios já publicados:
        </p>
        <ul className="space-y-2 text-sm">
          {registry.map((entry) => (
            <li key={entry.id}>
              <a
                href={entry.repoUrl.replace(/\.git$/, "")}
                target="_blank"
                rel="noopener noreferrer"
                className="lotus-focus inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
              >
                {entry.label}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </li>
          ))}
        </ul>
        {!fixedClient ? (
          <Button variant="outline" size="sm" asChild>
            <a href="/admin/clientes">Gerenciar clientes</a>
          </Button>
        ) : null}
      </div>
    </SectionCard>
  );
}
