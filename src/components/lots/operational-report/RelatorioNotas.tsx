import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RoteiroHtmlEditor } from "@/components/lots/approval/roteiro/RoteiroHtmlEditor";
import {
  draftPlatformAnalise,
  draftQuedaAnalise,
} from "@/modules/operational-report/draft-analise";
import {
  listRelatorioNotas,
  saveRelatorioAnalise,
  saveRelatorioOcorrencia,
} from "@/modules/operational-report/relatorio-notas.server";
import type { ReportCallout, ReportPlatformSection } from "@/modules/operational-report/types";

export function RelatorioNotas({
  cadastroClienteId,
  platforms,
  movers,
  periodoInicio,
  periodoFim,
  periodoLabel,
}: {
  cadastroClienteId: number;
  platforms: ReportPlatformSection[];
  movers: ReportCallout[];
  periodoInicio: string;
  periodoFim: string;
  periodoLabel: string;
}) {
  const qc = useQueryClient();
  const listFn = useServerFn(listRelatorioNotas);
  const saveAnalise = useServerFn(saveRelatorioAnalise);
  const saveQueda = useServerFn(saveRelatorioOcorrencia);
  const notas = useQuery({
    queryKey: ["relatorio-notas", cadastroClienteId],
    queryFn: () => listFn({ data: { cadastroClienteId } }),
  });
  const [aberta, setAberta] = useState<string | null>(null);
  const [html, setHtml] = useState("");
  const [quedaAberta, setQuedaAberta] = useState(false);
  const [quedaHtml, setQuedaHtml] = useState("");

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["relatorio-notas", cadastroClienteId] });
    void qc.invalidateQueries({ queryKey: ["lots-pendencias"] });
  }

  const gravar = useMutation({
    mutationFn: (plataforma: string) =>
      saveAnalise({ data: { cadastroClienteId, plataforma, html, enviar: true } }),
    onSuccess: () => {
      toast.success("Análise enviada.");
      setAberta(null);
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const gravarQueda = useMutation({
    mutationFn: () =>
      saveQueda({
        data: {
          cadastroClienteId,
          periodoInicio,
          periodoFim,
          html: quedaHtml,
          enviar: true,
        },
      }),
    onSuccess: () => {
      toast.success("Ocorrência enviada.");
      setQuedaAberta(false);
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!notas.data) return null;
  const { canEdit, analises, queda } = notas.data;

  return (
    <section className="space-y-3">
      <h3 className="font-display text-lg font-semibold">Análises</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {platforms.map((platform) => {
          const nota = analises.find((item) => item.plataforma === platform.key);
          const abriu = aberta === platform.key;
          return (
            <article key={platform.key} className="rounded-md border border-muted bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{platform.label}</p>
                {canEdit ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAberta(abriu ? null : platform.key);
                      setHtml(nota?.html ?? "");
                    }}
                  >
                    Análise
                  </Button>
                ) : null}
              </div>
              {nota?.enviada && !abriu ? (
                <div
                  className="prose prose-sm mt-2 max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: nota.html }}
                />
              ) : null}
              {abriu ? (
                <div className="mt-3 space-y-2">
                  <RoteiroHtmlEditor
                    resetKey={`${platform.key}-${notas.data?.semana}`}
                    html={html}
                    editable
                    onChange={setHtml}
                    minHeightClass="min-h-[160px]"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setHtml(draftPlatformAnalise(platform, periodoLabel))}
                    >
                      <Wand2 className="h-4 w-4" />
                      Gerar rascunho
                    </Button>
                    <Button
                      type="button"
                      disabled={gravar.isPending}
                      onClick={() => gravar.mutate(platform.key)}
                    >
                      Enviar
                    </Button>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
      {queda || canEdit ? (
        <article className="rounded-md border border-muted bg-card p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium">Queda de resultado</p>
            {canEdit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuedaAberta((open) => !open);
                  setQuedaHtml(queda?.html ?? "");
                }}
              >
                {queda ? "Editar" : "Escrever"}
              </Button>
            ) : null}
          </div>
          {queda && !quedaAberta ? (
            <div
              className="prose prose-sm mt-2 max-w-none text-sm"
              dangerouslySetInnerHTML={{ __html: queda.html }}
            />
          ) : null}
          {quedaAberta ? (
            <div className="mt-3 space-y-2">
              <RoteiroHtmlEditor
                resetKey={`queda-${periodoInicio}`}
                html={quedaHtml}
                editable
                onChange={setQuedaHtml}
                minHeightClass="min-h-[160px]"
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuedaHtml(draftQuedaAnalise(movers, periodoLabel))}
                >
                  <Wand2 className="h-4 w-4" />
                  Gerar rascunho
                </Button>
                <Button
                  type="button"
                  disabled={gravarQueda.isPending}
                  onClick={() => gravarQueda.mutate()}
                >
                  Enviar
                </Button>
              </div>
            </div>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}
