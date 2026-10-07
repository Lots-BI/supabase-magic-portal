import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { cn } from "@/lib/utils";
import { unwrapRoteiroHtml } from "@/modules/approval/services/roteiro-scenes";
import { RoteiroToolbar } from "./RoteiroToolbar";

const ROTEIRO_EXTENSIONS = [
  StarterKit,
  Underline,
  TextStyle,
  Color,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
];

export function RoteiroHtmlEditor({
  resetKey,
  html,
  editable,
  onChange,
  minHeightClass = "min-h-[280px]",
  className,
  size = "default",
}: {
  resetKey: string;
  html: string | null | undefined;
  editable: boolean;
  onChange?: (html: string) => void;
  minHeightClass?: string;
  className?: string;
  size?: "default" | "hero";
}) {
  const initial = unwrapRoteiroHtml(html);
  const htmlRef = useRef(html);
  htmlRef.current = html;
  const hero = size === "hero";

  const editor = useEditor({
    extensions: ROTEIRO_EXTENSIONS,
    content: initial || "",
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "prose dark:prose-invert max-w-none focus:outline-none",
          hero
            ? cn(
                "prose-lg px-6 py-5 text-xl leading-relaxed sm:px-8 sm:py-8 sm:text-2xl",
                minHeightClass === "min-h-[280px]" ? "min-h-[50vh]" : minHeightClass,
              )
            : cn("prose-sm px-4 py-3", minHeightClass),
        ),
      },
    },
    onUpdate: ({ editor: ed }) => onChange?.(ed.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(unwrapRoteiroHtml(htmlRef.current) || "", { emitUpdate: false });
  }, [editor, resetKey]);

  return (
    <article
      className={cn(
        "overflow-hidden border border-border bg-card",
        hero ? "rounded-3xl" : "rounded-2xl",
        className,
      )}
    >
      {hero ? (
        <p className="px-6 pt-6 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:px-8">
          Roteiro
        </p>
      ) : null}
      {editor && editable ? <RoteiroToolbar editor={editor} /> : null}
      {editor ? (
        <EditorContent editor={editor} />
      ) : (
        <div className={cn("p-4 text-sm text-muted-foreground", minHeightClass)}>…</div>
      )}
    </article>
  );
}

export function RoteiroHtmlView({
  html,
  className,
  size = "default",
}: {
  html: string | null | undefined;
  className?: string;
  size?: "default" | "hero";
}) {
  const inner = unwrapRoteiroHtml(html);
  const hero = size === "hero";
  return (
    <article
      className={cn(
        "border border-border bg-card",
        hero ? "rounded-3xl px-6 py-6 sm:px-8 sm:py-8" : "rounded-2xl px-4 py-3",
        className,
      )}
    >
      <p
        className={cn(
          "font-semibold uppercase tracking-[0.16em] text-muted-foreground",
          hero ? "text-xs" : "text-[11px] tracking-[0.14em]",
        )}
      >
        Roteiro
      </p>
      {inner ? (
        <div
          className={cn(
            "roteiro-html mt-3 max-w-none dark:prose-invert",
            hero ? "prose prose-lg text-xl leading-relaxed sm:text-2xl" : "prose prose-sm",
          )}
          dangerouslySetInnerHTML={{ __html: inner }}
        />
      ) : (
        <p className={cn("mt-3 text-muted-foreground", hero ? "text-lg" : "text-sm")}>—</p>
      )}
    </article>
  );
}
