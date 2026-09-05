import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CollapsibleSection } from "@/components/lots/CollapsibleSection";
import { aiWorkspaceSnapshotQuery } from "@/lib/ai-workspace/queries";
import { generateContextPrompt } from "@/lib/ai-workspace/prompt-generator";
import { invalidateAiWorkspaceSnapshot } from "@/lib/ai-workspace/snapshot";
import { createAiWorkspaceSearchIndex, searchAiWorkspace } from "@/lib/ai-workspace/search";
import { withChatContextUsageFooter } from "@/lib/ai-workspace/export";
import type { AiWorkspaceSectionId } from "@/lib/ai-workspace/types";
import { PromptGeneratorPanel } from "./PromptGeneratorPanel";
import { ChatContextGeneratorPanel } from "./ChatContextGeneratorPanel";
import { FlowTimeline } from "./FlowTimeline";
import { ModuleCardGrid } from "./ModuleCardGrid";
import { AiInsightsPlaceholder } from "./AiInsightsPlaceholder";

function AiWorkspaceLoadingSkeleton() {
  return (
    <div
      className="mx-auto max-w-5xl space-y-6 pb-12"
      aria-busy="true"
      aria-label="Carregando AI Workspace"
    >
      <div className="space-y-3">
        <div className="lots-skeleton h-3 w-28" />
        <div className="lots-skeleton h-8 w-56" />
        <div className="lots-skeleton h-4 w-full max-w-xl" />
      </div>
      <div className="lots-surface h-24 p-4">
        <div className="lots-skeleton mb-2 h-3 w-40" />
        <div className="lots-skeleton h-2 w-full" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="lots-surface min-h-[280px]" />
        <div className="lots-surface min-h-[280px]" />
      </div>
    </div>
  );
}

export function AiWorkspacePage() {
  const queryClient = useQueryClient();
  const { data: snapshot, isLoading, error } = useQuery(aiWorkspaceSnapshotQuery);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<AiWorkspaceSectionId>>(
    () => new Set(["overview"]),
  );
  const [codeContext, setCodeContext] = useState<string | null>(null);
  const [chatContext, setChatContext] = useState<string | null>(null);
  const [codeGeneratedAt, setCodeGeneratedAt] = useState<string | null>(null);
  const [chatGeneratedAt, setChatGeneratedAt] = useState<string | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isGeneratingChat, setIsGeneratingChat] = useState(false);
  const sectionRefs = useRef<Partial<Record<AiWorkspaceSectionId, HTMLDivElement | null>>>({});
  const chatContextRef = useRef<HTMLDivElement | null>(null);

  const fuse = useMemo(
    () => (snapshot ? createAiWorkspaceSearchIndex(snapshot.searchableSections) : null),
    [snapshot],
  );

  const searchHits = useMemo(() => {
    if (!fuse || !searchQuery.trim()) return [];
    return searchAiWorkspace(fuse, searchQuery);
  }, [fuse, searchQuery]);

  useEffect(() => {
    if (searchHits.length === 0) return;
    const ids = new Set(searchHits.map((h) => h.sectionId));
    setExpandedSections((prev) => new Set([...prev, ...ids]));
    const first = searchHits[0]?.sectionId;
    if (first) {
      requestAnimationFrame(() => {
        if (first === "chat-context") {
          chatContextRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          sectionRefs.current[first]?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
  }, [searchHits]);

  const refreshSnapshot = useCallback(async () => {
    invalidateAiWorkspaceSnapshot();
    await queryClient.invalidateQueries({ queryKey: ["ai-workspace"] });
    return queryClient.fetchQuery(aiWorkspaceSnapshotQuery);
  }, [queryClient]);

  const handleGenerateCode = useCallback(async () => {
    setIsGeneratingCode(true);
    try {
      const fresh = await refreshSnapshot();
      setCodeContext(generateContextPrompt(fresh));
      setCodeGeneratedAt(fresh.generatedAt);
      toast.success("Context Pack gerado para Editor de Código");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao gerar contexto para Editor de Código",
      );
    } finally {
      setIsGeneratingCode(false);
    }
  }, [refreshSnapshot]);

  const handleGenerateChat = useCallback(async () => {
    setIsGeneratingChat(true);
    try {
      const fresh = await refreshSnapshot();
      setChatContext(withChatContextUsageFooter(fresh.chatContextMarkdown));
      setChatGeneratedAt(fresh.generatedAt);
      toast.success("Contexto conversacional gerado");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao gerar contexto para IA Conversacional",
      );
    } finally {
      setIsGeneratingChat(false);
    }
  }, [refreshSnapshot]);

  if (isLoading) {
    return <AiWorkspaceLoadingSkeleton />;
  }

  if (error || !snapshot) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Falha ao carregar AI Workspace. {error instanceof Error ? error.message : ""}
      </div>
    );
  }

  const isOpen = (id: AiWorkspaceSectionId) => expandedSections.has(id);
  const setSectionOpen = (id: AiWorkspaceSectionId, open: boolean) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <header className="space-y-4">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-primary-600 dark:text-primary-300">
            Platform Owner
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight">AI Workspace</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            O AI Workspace gera automaticamente o contexto da plataforma para diferentes tipos de
            Inteligência Artificial.
          </p>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Escolha abaixo o formato mais adequado para sua necessidade.
          </p>
        </div>

        <div className="lots-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">AI Context Completeness</span>
            <span className="font-display text-lg font-semibold text-primary">
              {snapshot.contextScore.total}%
            </span>
          </div>
          <Progress value={snapshot.contextScore.total} className="h-2" />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {snapshot.contextScore.criteria.map((c) => (
              <Badge key={c.id} variant={c.met ? "default" : "secondary"} className="text-[10px]">
                {c.label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar módulos, ADRs, roadmap, chat context, convenções…"
            className="pl-9"
          />
          {searchHits.length > 0 && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {searchHits.length} seção(ões) encontrada(s) — expandidas automaticamente
            </p>
          )}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <PromptGeneratorPanel
          snapshot={snapshot}
          content={codeContext}
          generatedAt={codeGeneratedAt}
          onGenerate={handleGenerateCode}
          isGenerating={isGeneratingCode}
        />

        <div ref={chatContextRef}>
          <ChatContextGeneratorPanel
            snapshot={snapshot}
            content={chatContext}
            generatedAt={chatGeneratedAt}
            onGenerate={handleGenerateChat}
            isGenerating={isGeneratingChat}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div
          ref={(el) => {
            sectionRefs.current.overview = el;
          }}
        >
          <CollapsibleSection
            title="Visão Geral"
            eyebrow="01"
            description="Resumo executivo da plataforma"
            defaultOpen={isOpen("overview")}
            open={isOpen("overview")}
            onOpenChange={(o) => setSectionOpen("overview", o)}
          >
            <p className="mb-4 text-sm leading-relaxed">{snapshot.overview.summary}</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {snapshot.overview.bullets.map((b) => (
                <li key={b}>• {b}</li>
              ))}
            </ul>
          </CollapsibleSection>
        </div>

        <div
          ref={(el) => {
            sectionRefs.current.architecture = el;
          }}
        >
          <CollapsibleSection
            title="Arquitetura"
            eyebrow="02"
            description="Frontend, Backend, Supabase, Modules, Repositories, Services"
            defaultOpen={isOpen("architecture")}
            open={isOpen("architecture")}
            onOpenChange={(o) => setSectionOpen("architecture", o)}
          >
            <p className="mb-4 text-sm">{snapshot.architecture.summary}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {snapshot.architecture.layers.map((l) => (
                <div key={l.name} className="rounded-lg border border-border p-3">
                  <p className="text-xs font-semibold">{l.name}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{l.description}</p>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        </div>

        <div
          ref={(el) => {
            sectionRefs.current.modules = el;
          }}
        >
          <CollapsibleSection
            title="Módulos"
            eyebrow="03"
            badge={<Badge variant="secondary">{snapshot.modules.length}</Badge>}
            defaultOpen={isOpen("modules")}
            open={isOpen("modules")}
            onOpenChange={(o) => setSectionOpen("modules", o)}
          >
            <ModuleCardGrid modules={snapshot.modules} />
          </CollapsibleSection>
        </div>

        <div
          ref={(el) => {
            sectionRefs.current.flows = el;
          }}
        >
          <CollapsibleSection
            title="Fluxos"
            eyebrow="04"
            defaultOpen={isOpen("flows")}
            open={isOpen("flows")}
            onOpenChange={(o) => setSectionOpen("flows", o)}
          >
            <FlowTimeline flows={snapshot.flows} />
          </CollapsibleSection>
        </div>

        <div
          ref={(el) => {
            sectionRefs.current.database = el;
          }}
        >
          <CollapsibleSection
            title="Banco de Dados"
            eyebrow="05"
            badge={<Badge variant="secondary">{snapshot.database.tables.length} tabelas</Badge>}
            defaultOpen={isOpen("database")}
            open={isOpen("database")}
            onOpenChange={(o) => setSectionOpen("database", o)}
          >
            <p className="mb-4 text-sm text-muted-foreground">
              {snapshot.database.summaryMarkdown.slice(0, 400)}…
            </p>
            <div className="max-h-64 overflow-auto rounded-lg border border-border">
              <table className="w-full text-left text-[11px]">
                <thead className="sticky top-0 bg-muted/80">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Tabela</th>
                    <th className="px-3 py-2 font-semibold">Migration</th>
                    <th className="px-3 py-2 font-semibold">FKs</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.database.tables.slice(0, 30).map((t) => (
                    <tr key={t.name} className="border-t border-border">
                      <td className="px-3 py-1.5 font-mono">{t.name}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{t.migration}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {t.foreignKeys.join(", ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleSection>
        </div>

        <div
          ref={(el) => {
            sectionRefs.current.adrs = el;
          }}
        >
          <CollapsibleSection
            title="ADRs"
            eyebrow="06"
            badge={<Badge variant="secondary">{snapshot.adrs.length}</Badge>}
            defaultOpen={isOpen("adrs")}
            open={isOpen("adrs")}
            onOpenChange={(o) => setSectionOpen("adrs", o)}
          >
            <div className="space-y-3">
              {snapshot.adrs.map((adr) => (
                <div key={adr.slug} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold">{adr.id}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {adr.status}
                    </Badge>
                    {adr.date && (
                      <span className="text-[10px] text-muted-foreground">{adr.date}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-medium">{adr.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{adr.summary}</p>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        </div>

        <div
          ref={(el) => {
            sectionRefs.current.roadmap = el;
          }}
        >
          <CollapsibleSection
            title="Roadmap"
            eyebrow="07"
            defaultOpen={isOpen("roadmap")}
            open={isOpen("roadmap")}
            onOpenChange={(o) => setSectionOpen("roadmap", o)}
          >
            <div className="grid gap-4 sm:grid-cols-3">
              {(
                [
                  ["Concluído", snapshot.roadmap.completed, "default"],
                  ["Em andamento", snapshot.roadmap.inProgress, "secondary"],
                  ["Planejado", snapshot.roadmap.planned, "outline"],
                ] as const
              ).map(([label, items, variant]) => (
                <div key={label}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider">{label}</p>
                  <ul className="space-y-1.5">
                    {items.slice(0, 8).map((item, i) => (
                      <li key={i} className="text-[11px] leading-snug text-muted-foreground">
                        <Badge variant={variant} className="mr-1 text-[9px]">
                          {label.slice(0, 3)}
                        </Badge>
                        {item.text}
                      </li>
                    ))}
                    {items.length > 8 && (
                      <li className="text-[10px] text-muted-foreground">
                        +{items.length - 8} itens
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        </div>

        <div
          ref={(el) => {
            sectionRefs.current.changelog = el;
          }}
        >
          <CollapsibleSection
            title="Changelog"
            eyebrow="08"
            defaultOpen={isOpen("changelog")}
            open={isOpen("changelog")}
            onOpenChange={(o) => setSectionOpen("changelog", o)}
          >
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold">[Não lançado]</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {snapshot.changelog.unreleased.slice(0, 10).map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </div>
              {snapshot.changelog.recentCommits.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold">Commits recentes</p>
                  <ul className="space-y-1 font-mono text-[11px] text-muted-foreground">
                    {snapshot.changelog.recentCommits.map((c) => (
                      <li key={c.hash}>
                        <span className="text-primary">{c.hash}</span> {c.subject}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CollapsibleSection>
        </div>

        <div
          ref={(el) => {
            sectionRefs.current.conventions = el;
          }}
        >
          <CollapsibleSection
            title="Convenções"
            eyebrow="09"
            defaultOpen={isOpen("conventions")}
            open={isOpen("conventions")}
            onOpenChange={(o) => setSectionOpen("conventions", o)}
          >
            <ul className="space-y-2">
              {snapshot.conventions.map((c) => (
                <li key={c.id} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium">{c.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.description}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground/70">{c.source}</p>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        </div>

        <div
          ref={(el) => {
            sectionRefs.current.insights = el;
          }}
        >
          <CollapsibleSection
            title="AI Insights"
            eyebrow="10"
            description="Scanners inteligentes — em breve"
            defaultOpen={isOpen("insights")}
            open={isOpen("insights")}
            onOpenChange={(o) => setSectionOpen("insights", o)}
          >
            <AiInsightsPlaceholder insights={snapshot.insights} />
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}
