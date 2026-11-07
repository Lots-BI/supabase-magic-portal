import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/lots/PageHeader";
import { PeriodPicker } from "@/components/lots/PeriodPicker";
import { DashboardSkeleton } from "@/components/lots/DashboardSkeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listClientes } from "@/lib/admin.functions";
import { resolvePeriod, type PeriodInput } from "@/lib/period";
import { getClientOperationalReportFn } from "@/modules/operational-report/operational-report.server";
import { RelatorioNotas } from "@/components/lots/operational-report/RelatorioNotas";
import { ReportAnalystChat } from "@/components/lots/operational-report/ReportAnalystChat";
import { ReportInsightsBlock } from "@/components/lots/operational-report/ReportInsightsBlock";

type ClienteOption = {
  id: number;
  nome_cliente: string;
  slug: string | null;
};

export function AdminReportAnalystPage() {
  const listClientesFn = useServerFn(listClientes);
  const clientes = useQuery({
    queryKey: ["admin-report-analyst-clientes"],
    queryFn: async () => (await listClientesFn()) as ClienteOption[],
  });
  const [clienteId, setClienteId] = useState<string>("");
  const [periodInput, setPeriodInput] = useState<PeriodInput>({ preset: "last_30" });
  const [noteDraft, setNoteDraft] = useState<{ html: string; nonce: number } | null>(null);
  const period = useMemo(() => resolvePeriod(periodInput), [periodInput]);
  const cadastroClienteId = clienteId ? Number(clienteId) : null;
  const selected = clientes.data?.find((row) => String(row.id) === clienteId) ?? null;

  const report = useQuery({
    queryKey: [
      "admin-report-analyst",
      cadastroClienteId,
      periodInput.preset,
      periodInput.customFrom ?? null,
      periodInput.customTo ?? null,
    ],
    enabled: cadastroClienteId != null && Number.isFinite(cadastroClienteId),
    queryFn: () =>
      getClientOperationalReportFn({
        data: {
          cadastroClienteId: cadastroClienteId!,
          preset: periodInput.preset,
          customFrom: periodInput.customFrom,
          customTo: periodInput.customTo,
        },
      }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Analista"
        description="Perguntas com Claude sobre o relatório do cliente. Bloqueado para quem não é admin."
        actions={<PeriodPicker value={periodInput} onChange={setPeriodInput} />}
      />

      <div className="lots-surface flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:p-5">
        <div className="min-w-0 flex-1 space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Cliente
          </label>
          <Select
            value={clienteId || undefined}
            onValueChange={(value) => {
              setClienteId(value);
              setNoteDraft(null);
            }}
            disabled={clientes.isLoading}
          >
            <SelectTrigger className="max-w-xl">
              <SelectValue placeholder="Escolha o cliente" />
            </SelectTrigger>
            <SelectContent>
              {(clientes.data ?? []).map((cliente) => (
                <SelectItem key={cliente.id} value={String(cliente.id)}>
                  {cliente.nome_cliente}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground sm:pb-2">
          Recorte: {period.label} · {period.from} → {period.to}
        </p>
      </div>

      {!cadastroClienteId ? (
        <section className="lots-surface px-6 py-16 text-center">
          <p className="font-display text-xl font-semibold">Escolha um cliente</p>
          <p className="mt-2 text-sm text-muted-foreground">
            O contexto do chat é o mesmo relatório operacional do período.
          </p>
        </section>
      ) : report.isLoading ? (
        <DashboardSkeleton kpiCount={4} />
      ) : report.isError ? (
        <div className="lots-surface p-5 text-sm text-danger">
          {report.error instanceof Error
            ? report.error.message
            : "Não foi possível montar o relatório."}
        </div>
      ) : report.data ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-4">
            <ReportInsightsBlock report={report.data} />
            <RelatorioNotas
              cadastroClienteId={report.data.cadastroClienteId}
              platforms={report.data.platforms}
              movers={report.data.movers}
              periodoInicio={report.data.period.from}
              periodoFim={report.data.period.to}
              periodoLabel={report.data.period.label}
              incomingNote={noteDraft}
            />
          </div>
          <ReportAnalystChat
            key={`${report.data.cadastroClienteId}-${period.from}-${period.to}`}
            cadastroClienteId={report.data.cadastroClienteId}
            periodInput={periodInput}
            canEdit
            onUseInAnalysis={(html) => setNoteDraft({ html, nonce: Date.now() })}
          />
        </div>
      ) : null}

      {selected?.slug ? (
        <p className="text-xs text-muted-foreground">
          Relatório visual do cliente continua em /cliente/{selected.slug}/relatorio — sem o chat.
        </p>
      ) : null}
    </div>
  );
}
