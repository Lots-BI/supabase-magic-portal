import type { MouseEvent, ReactNode } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Underline,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const TEXT_COLORS = [
  { hex: "#0f172a", label: "Preto" },
  { hex: "#dc2626", label: "Vermelho" },
  { hex: "#ea580c", label: "Laranja" },
  { hex: "#ca8a04", label: "Amarelo" },
  { hex: "#16a34a", label: "Verde" },
  { hex: "#2563eb", label: "Azul" },
  { hex: "#7c3aed", label: "Roxo" },
  { hex: "#db2777", label: "Rosa" },
] as const;

function keepFocus(e: MouseEvent) {
  e.preventDefault();
}

function ToolButton({
  pressed,
  label,
  onClick,
  children,
}: {
  pressed?: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle
          size="sm"
          pressed={pressed}
          aria-label={label}
          onMouseDown={keepFocus}
          onPressedChange={() => onClick()}
        >
          {children}
        </Toggle>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

export function RoteiroToolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      bold: ed.isActive("bold"),
      italic: ed.isActive("italic"),
      underline: ed.isActive("underline"),
      left: ed.isActive({ textAlign: "left" }),
      center: ed.isActive({ textAlign: "center" }),
      right: ed.isActive({ textAlign: "right" }),
      justify: ed.isActive({ textAlign: "justify" }),
      color: (ed.getAttributes("textStyle").color as string | undefined) ?? null,
    }),
  });

  const currentColor = state?.color ?? null;

  return (
    <TooltipProvider delayDuration={250}>
      <div
        className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 px-2 py-1.5"
        role="toolbar"
        aria-label="Formatação do roteiro"
      >
        <ToolButton
          pressed={state?.bold}
          label="Negrito"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold />
        </ToolButton>
        <ToolButton
          pressed={state?.italic}
          label="Itálico"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic />
        </ToolButton>
        <ToolButton
          pressed={state?.underline}
          label="Sublinhado"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline />
        </ToolButton>

        <span className="mx-1 h-5 w-px bg-border" aria-hidden />

        <ToolButton
          pressed={state?.left}
          label="Alinhar à esquerda"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft />
        </ToolButton>
        <ToolButton
          pressed={state?.center}
          label="Centralizar"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter />
        </ToolButton>
        <ToolButton
          pressed={state?.right}
          label="Alinhar à direita"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight />
        </ToolButton>
        <ToolButton
          pressed={state?.justify}
          label="Justificar"
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        >
          <AlignJustify />
        </ToolButton>

        <span className="mx-1 h-5 w-px bg-border" aria-hidden />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Cor padrão"
              onMouseDown={keepFocus}
              onClick={() => editor.chain().focus().unsetColor().run()}
              className={cn(
                "flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted",
                !currentColor && "bg-accent text-accent-foreground",
              )}
            >
              A
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Cor padrão</TooltipContent>
        </Tooltip>

        {TEXT_COLORS.map((c) => {
          const active = currentColor?.toLowerCase() === c.hex.toLowerCase();
          return (
            <Tooltip key={c.hex}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={c.label}
                  aria-pressed={active}
                  onMouseDown={keepFocus}
                  onClick={() => {
                    if (active) editor.chain().focus().unsetColor().run();
                    else editor.chain().focus().setColor(c.hex).run();
                  }}
                  className={cn(
                    "h-6 w-6 rounded-full border border-border shadow-sm hover:scale-105",
                    active && "ring-2 ring-ring ring-offset-1 ring-offset-background",
                  )}
                  style={{ backgroundColor: c.hex }}
                />
              </TooltipTrigger>
              <TooltipContent side="bottom">{c.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
