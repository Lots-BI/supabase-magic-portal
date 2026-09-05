import { useState } from "react";
import { Check, Copy, Download, FileJson, FileText, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { EmptyState } from "@/components/lots/EmptyState";
import type { AiWorkspaceSnapshot } from "@/lib/ai-workspace/types";
import {
  copyToClipboard,
  downloadFile,
  exportFilename,
  exportMimeType,
  exportSnapshot,
} from "@/lib/ai-workspace/export";
import { markdownToPlainText } from "@/lib/ai-workspace/prompt-generator";

interface PromptGeneratorPanelProps {
  snapshot: AiWorkspaceSnapshot;
  content: string | null;
  generatedAt: string | null;
  onGenerate: () => void;
  isGenerating?: boolean;
}

const IDEAL_FOR = ["Cursor", "Windsurf", "GitHub Copilot"] as const;

const USE_WHEN = [
  "a IA irá escrever código",
  "criar arquivos",
  "modificar arquitetura",
  "implementar funcionalidades",
] as const;

export function PromptGeneratorPanel({
  snapshot,
  content,
  generatedAt,
  onGenerate,
  isGenerating,
}: PromptGeneratorPanelProps) {
  const [copied, setCopied] = useState(false);
  const hasContent = Boolean(content);

  async function handleCopyMarkdown() {
    if (!content) return;
    await copyToClipboard(content);
    setCopied(true);
    toast.success("Contexto para Editor de Código copiado (Markdown)");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCopyText() {
    if (!content) return;
    await copyToClipboard(markdownToPlainText(content));
    toast.success("Contexto para Editor de Código copiado (texto)");
  }

  function handleExport(format: "markdown" | "json" | "txt") {
    if (!content && format !== "json") return;
    const exported =
      format === "markdown"
        ? content!
        : format === "txt"
          ? markdownToPlainText(content!)
          : exportSnapshot(snapshot, format);
    downloadFile(exported, exportFilename(format), exportMimeType(format));
    toast.success(`Contexto para Editor de Código exportado como ${format.toUpperCase()}`);
  }

  return (
    <div className="lots-surface flex h-full flex-col overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Contexto para Editor de Código
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Gera um Context Pack técnico para Cursor, Windsurf, GitHub Copilot e outros editores de
          código.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Ideal para
            </p>
            <ul className="mt-2 space-y-1">
              {IDEAL_FOR.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm">
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Use quando
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {USE_WHEN.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-4">
        <Button onClick={onGenerate} disabled={isGenerating} className="gap-2">
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isGenerating ? "Gerando…" : "Gerar Contexto"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyMarkdown}
          disabled={!hasContent}
          className="gap-1.5"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? "Copiado!" : "Copiar Markdown"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyText}
          disabled={!hasContent}
          className="gap-1.5"
        >
          <FileText className="h-3.5 w-3.5" />
          Copiar Texto
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={!hasContent} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => handleExport("markdown")}>
              Exportar Markdown (.md)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("json")}>
              <FileJson className="mr-2 h-4 w-4" />
              Exportar JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("txt")}>Exportar TXT</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="max-h-[360px] min-h-[360px] flex-1 overflow-auto bg-muted/15 p-5">
        {hasContent ? (
          <>
            {generatedAt && (
              <p className="mb-3 text-[10.5px] text-muted-foreground">
                Gerado em {new Date(generatedAt).toLocaleString("pt-BR")}
              </p>
            )}
            <pre className="whitespace-pre-wrap font-mono text-[11.5px] leading-relaxed text-foreground/90">
              {content}
            </pre>
          </>
        ) : (
          <EmptyState
            compact
            icon={Sparkles}
            title="Nenhum contexto gerado ainda"
            description='Clique em "Gerar Contexto" para montar o Context Pack técnico a partir do repositório.'
          />
        )}
      </div>
    </div>
  );
}
