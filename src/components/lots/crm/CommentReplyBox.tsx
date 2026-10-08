import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function CommentReplyBox({
  signalId,
  onReply,
  mode = "public",
  initialText = "",
  autoFocus = false,
  onCancel,
}: {
  signalId: string;
  onReply: (signalId: string, message: string) => Promise<void>;
  mode?: "public" | "private";
  initialText?: string;
  autoFocus?: boolean;
  onCancel?: () => void;
}) {
  const [text, setText] = useState(initialText);
  const [pending, setPending] = useState(false);
  const isPrivate = mode === "private";

  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const message = text.trim();
        if (!message || pending) return;
        setPending(true);
        try {
          await onReply(signalId, message);
          setText("");
          toast.success(
            isPrivate ? "Direct enviado para quem comentou." : "Resposta publicada no comentário.",
          );
          onCancel?.();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Falha ao responder o comentário.");
        } finally {
          setPending(false);
        }
      }}
    >
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={
          isPrivate
            ? "Mensagem no Direct de quem comentou (só uma por comentário)"
            : "Resposta pública neste comentário"
        }
        className="min-h-11"
        maxLength={isPrivate ? 1000 : 500}
        autoFocus={autoFocus}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="h-11" disabled={!text.trim() || pending}>
          {isPrivate ? (
            <Send className="mr-1.5 h-3.5 w-3.5" />
          ) : (
            <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
          )}
          {pending ? "Enviando…" : isPrivate ? "Enviar Direct" : "Responder"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" className="h-11" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}
