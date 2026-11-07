import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { PeriodInput } from "@/lib/period";
import { plainTextToNoteHtml } from "@/modules/report-analyst/report-analyst-context";
import { askReportAnalystFn } from "@/modules/report-analyst/report-analyst.server";

const SUGGESTIONS = [
  "O que mais mudou neste período?",
  "O investimento acompanhou os resultados?",
  "Onde vale olhar primeiro?",
  "Como estão publicações e conteúdos?",
];

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  keep: boolean;
};

export function ReportAnalystChat({
  cadastroClienteId,
  periodInput,
  canEdit,
  onUseInAnalysis,
}: {
  cadastroClienteId: number;
  periodInput: PeriodInput;
  canEdit: boolean;
  onUseInAnalysis: (html: string) => void;
}) {
  const ask = useServerFn(askReportAnalystFn);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const threadKey = [
    cadastroClienteId,
    periodInput.preset,
    periodInput.customFrom ?? "",
    periodInput.customTo ?? "",
  ].join("|");

  useEffect(() => {
    setMessages([]);
    setDraft("");
  }, [threadKey]);

  const send = useMutation({
    mutationFn: async (question: string) => {
      const history = messages
        .filter((message) => message.keep)
        .slice(-7)
        .map((message) => ({ role: message.role, content: message.content }));
      return ask({
        data: {
          cadastroClienteId,
          preset: periodInput.preset,
          customFrom: periodInput.customFrom,
          customTo: periodInput.customTo,
          question,
          history,
        },
      });
    },
    onMutate: (question) => {
      setDraft("");
      setMessages((current) => [
        ...current,
        { id: `u-${current.length}`, role: "user", content: question, keep: true },
      ]);
    },
    onSuccess: (result) => {
      setMessages((current) => [
        ...current,
        {
          id: `a-${current.length}`,
          role: "assistant",
          content: result.ok ? result.answer : result.message,
          keep: result.ok,
        },
      ]);
    },
    onError: (error: Error) => {
      setMessages((current) => [
        ...current,
        {
          id: `e-${current.length}`,
          role: "assistant",
          content: error.message || "Não consegui responder agora.",
          keep: false,
        },
      ]);
    },
  });

  function submit(question: string) {
    const text = question.trim();
    if (!text || send.isPending) return;
    send.mutate(text);
  }

  return (
    <section className="lots-surface flex min-h-[28rem] flex-col overflow-hidden">
      <header className="space-y-1 border-b border-border px-4 py-4 sm:px-5">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-primary-600">
          Analista
        </p>
        <h2 className="font-display text-lg font-semibold">Perguntas sobre o recorte</h2>
        <p className="text-sm text-muted-foreground">
          Só admin. A resposta fica aqui até você usar na análise — não envia sozinha.
        </p>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
        {messages.length === 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Sugestões</p>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="block w-full rounded-lg border border-border px-3 py-2 text-left text-sm text-foreground hover:bg-muted/50"
                onClick={() => submit(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : (
          messages.map((message) => (
            <article
              key={message.id}
              className={
                message.role === "user"
                  ? "ml-8 rounded-lg bg-muted px-3 py-2 text-sm"
                  : "mr-6 rounded-lg border border-border px-3 py-2 text-sm"
              }
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.role === "assistant" && message.keep && canEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 px-0"
                  onClick={() => onUseInAnalysis(plainTextToNoteHtml(message.content))}
                >
                  Usar na análise
                </Button>
              ) : null}
            </article>
          ))
        )}
      </div>

      <form
        className="space-y-2 border-t border-border p-4 sm:px-5"
        onSubmit={(event) => {
          event.preventDefault();
          submit(draft);
        }}
      >
        <label className="sr-only" htmlFor="report-analyst-question">
          Pergunta
        </label>
        <Textarea
          id="report-analyst-question"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Pergunte sobre este recorte"
          rows={3}
          maxLength={2000}
        />
        <Button type="submit" disabled={send.isPending || draft.trim().length === 0}>
          {send.isPending ? "Pensando…" : "Perguntar"}
        </Button>
      </form>
    </section>
  );
}
