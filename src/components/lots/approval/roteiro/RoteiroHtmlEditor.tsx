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
}: {
  resetKey: string;
  html: string | null | undefined;
  editable: boolean;
  onChange?: (html: string) => void;
  minHeightClass?: string;
  className?: string;
}) {
  const initial = unwrapRoteiroHtml(html);
  const htmlRef = useRef(html);
  htmlRef.current = html;

  const editor = useEditor({
    extensions: ROTEIRO_EXTENSIONS,
    content: initial || "",
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none px-4 py-3 focus:outline-none",
          minHeightClass,
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
    <article className={cn("overflow-hidden rounded-2xl border border-border bg-card", className)}>
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
}: {
  html: string | null | undefined;
  className?: string;
}) {
  const inner = unwrapRoteiroHtml(html);
  return (
    <article className={cn("rounded-2xl border border-border bg-card px-4 py-3", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Roteiro
      </p>
      {inner ? (
        <div
          className="roteiro-html prose prose-sm mt-2 max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: inner }}
        />
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">—</p>
      )}
    </article>
  );
}
