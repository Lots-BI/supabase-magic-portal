import { useEffect, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { cn } from "@/lib/utils";
import {
  composeRoteiroHtml,
  parseRoteiroScenes,
  ROTEIRO_SCENE_KEYS,
  ROTEIRO_SCENE_LABELS,
  type RoteiroSceneKey,
  type RoteiroScenes,
} from "@/modules/approval/services/roteiro-scenes";
import { RoteiroToolbar } from "./RoteiroToolbar";

const ROTEIRO_EXTENSIONS = [
  StarterKit,
  Underline,
  TextStyle,
  Color,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
];

function SceneEditor({
  sceneKey,
  html,
  editable,
  onReady,
  onUpdate,
}: {
  sceneKey: RoteiroSceneKey;
  html: string;
  editable: boolean;
  onReady: (sceneKey: RoteiroSceneKey, editor: Editor) => void;
  onUpdate: () => void;
}) {
  const editor = useEditor({
    extensions: ROTEIRO_EXTENSIONS,
    content: html || "",
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[120px] px-4 py-3 focus:outline-none",
      },
    },
    onUpdate: () => onUpdate(),
  });

  useEffect(() => {
    if (editor) onReady(sceneKey, editor);
  }, [editor, onReady, sceneKey]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {ROTEIRO_SCENE_LABELS[sceneKey]}
        </p>
      </div>
      {editor && editable ? <RoteiroToolbar editor={editor} /> : null}
      {editor ? (
        <EditorContent editor={editor} />
      ) : (
        <div className="min-h-[120px] p-4 text-sm text-muted-foreground">…</div>
      )}
    </article>
  );
}

export function RoteiroSceneEditor({
  resetKey,
  html,
  editable,
  onChange,
}: {
  resetKey: string;
  html: string | null | undefined;
  editable: boolean;
  onChange: (nextHtml: string) => void;
}) {
  const editorsRef = useRef<Partial<Record<RoteiroSceneKey, Editor>>>({});
  const initialRef = useRef(parseRoteiroScenes(html));
  const hydratedKeyRef = useRef<string | null>(null);

  if (hydratedKeyRef.current !== resetKey) {
    initialRef.current = parseRoteiroScenes(html);
  }

  const emit = () => {
    const next: RoteiroScenes = { gancho: "", meio: "", cta: "" };
    for (const key of ROTEIRO_SCENE_KEYS) {
      next[key] = editorsRef.current[key]?.getHTML() ?? initialRef.current[key];
    }
    onChange(composeRoteiroHtml(next));
  };

  const onReady = (key: RoteiroSceneKey, editor: Editor) => {
    editorsRef.current[key] = editor;
  };

  useEffect(() => {
    const ready = ROTEIRO_SCENE_KEYS.every((key) => editorsRef.current[key]);
    if (!ready) return;
    if (hydratedKeyRef.current === resetKey) return;
    for (const key of ROTEIRO_SCENE_KEYS) {
      editorsRef.current[key]?.commands.setContent(initialRef.current[key] || "", {
        emitUpdate: false,
      });
    }
    hydratedKeyRef.current = resetKey;
  });

  return (
    <div className={cn("grid gap-3", !editable && "pointer-events-none opacity-90")}>
      {ROTEIRO_SCENE_KEYS.map((key) => (
        <SceneEditor
          key={`${resetKey}-${key}`}
          sceneKey={key}
          html={initialRef.current[key]}
          editable={editable}
          onReady={onReady}
          onUpdate={emit}
        />
      ))}
    </div>
  );
}
