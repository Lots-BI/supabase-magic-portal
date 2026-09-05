import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TextInput, TextArea, Field, FormRow } from "@/components/lots/FormField";
import { Select } from "@/components/lots/FormField";
import { ConfirmDialog } from "@/components/lots/ConfirmDialog";
import type {
  PlanoEstrategico,
  PlanoEstrategia,
  PlanoObjetivo,
  PlanoHipotese,
  PlanoDecisao,
  PlanoAcao,
  PlanoMetricRef,
  PlanoOportunidade,
  PlanoAprendizado,
  PlanoRoadmapMarco,
  StrategicDashboardPayload,
} from "@/lib/strategic-plan/types";
import {
  upsertObjetivo,
  upsertEstrategia,
  upsertHipotese,
  upsertDecisao,
  upsertAcao,
  upsertMetricRef,
  upsertOportunidade,
  upsertAprendizado,
  upsertRoadmapMarco,
  deletePlanoEntity,
} from "@/lib/strategic-plan.functions";
import { listMetricCatalog } from "@/lib/strategic-plan/metric-catalog";
import {
  HIPOTESE_STATUS,
  PLANO_ITEM_STATUS,
  PLANO_PRIORIDADE,
  ROADMAP_MARCO_TIPO,
} from "@/lib/strategic-plan/types";
import {
  OBJETIVO_WORKFLOW_FASE,
  OBJETIVO_FASE_LABEL,
} from "@/lib/strategic-plan/objetivo-workflow";
import { StrategicPlanEntityList } from "./StrategicPlanEntityList";
import { PlanoSettingsPanel } from "./PlanoSettingsPanel";

type DeleteEntity =
  | "objetivo"
  | "estrategia"
  | "hipotese"
  | "decisao"
  | "acao"
  | "metric_ref"
  | "oportunidade"
  | "aprendizado"
  | "roadmap_marco";

interface StrategicPlanManageDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planoId: string;
  plano: PlanoEstrategico;
  data: StrategicDashboardPayload;
  objetivoAtualId: string | null;
  estrategias: PlanoEstrategia[];
  isAdmin?: boolean;
  onComment: (msg: string) => void;
}

export function StrategicPlanManageDrawer({
  open,
  onOpenChange,
  planoId,
  plano,
  data,
  objetivoAtualId,
  estrategias,
  isAdmin,
  onComment,
}: StrategicPlanManageDrawerProps) {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["strategic-dashboard", planoId] });
    void qc.invalidateQueries({ queryKey: ["strategic-plan", "admin"] });
  };

  const upsertObjetivoFn = useServerFn(upsertObjetivo);
  const upsertEstrategiaFn = useServerFn(upsertEstrategia);
  const upsertHipoteseFn = useServerFn(upsertHipotese);
  const upsertDecisaoFn = useServerFn(upsertDecisao);
  const upsertAcaoFn = useServerFn(upsertAcao);
  const upsertMetricRefFn = useServerFn(upsertMetricRef);
  const upsertOportunidadeFn = useServerFn(upsertOportunidade);
  const upsertAprendizadoFn = useServerFn(upsertAprendizado);
  const upsertRoadmapFn = useServerFn(upsertRoadmapMarco);
  const deleteEntityFn = useServerFn(deletePlanoEntity);

  const [comment, setComment] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ entity: DeleteEntity; id: string } | null>(
    null,
  );
  const [editObjetivoId, setEditObjetivoId] = useState<string | null>(null);
  const [editEstrategiaId, setEditEstrategiaId] = useState<string | null>(null);
  const [editHipoteseId, setEditHipoteseId] = useState<string | null>(null);
  const [editDecisaoId, setEditDecisaoId] = useState<string | null>(null);
  const [editAcaoId, setEditAcaoId] = useState<string | null>(null);
  const [editMetricRefId, setEditMetricRefId] = useState<string | null>(null);
  const [editOportunidadeId, setEditOportunidadeId] = useState<string | null>(null);
  const [editAprendizadoId, setEditAprendizadoId] = useState<string | null>(null);
  const [editRoadmapId, setEditRoadmapId] = useState<string | null>(null);

  const deleteMut = useMutation({
    mutationFn: (p: { entity: DeleteEntity; id: string }) =>
      deleteEntityFn({ data: { plano_id: planoId, entity: p.entity, id: p.id } }),
    onSuccess: (_, vars) => {
      toast.success("Registro excluído");
      invalidate();
      setPendingDelete(null);
      if (vars.entity === "objetivo" && editObjetivoId === vars.id) setEditObjetivoId(null);
      if (vars.entity === "estrategia" && editEstrategiaId === vars.id) setEditEstrategiaId(null);
      if (vars.entity === "hipotese" && editHipoteseId === vars.id) setEditHipoteseId(null);
      if (vars.entity === "decisao" && editDecisaoId === vars.id) setEditDecisaoId(null);
      if (vars.entity === "acao" && editAcaoId === vars.id) setEditAcaoId(null);
      if (vars.entity === "metric_ref" && editMetricRefId === vars.id) setEditMetricRefId(null);
      if (vars.entity === "oportunidade" && editOportunidadeId === vars.id)
        setEditOportunidadeId(null);
      if (vars.entity === "aprendizado" && editAprendizadoId === vars.id)
        setEditAprendizadoId(null);
      if (vars.entity === "roadmap_marco" && editRoadmapId === vars.id) setEditRoadmapId(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao excluir"),
  });

  const catalog = listMetricCatalog();

  const metricRefs = useMemo(() => {
    const map = new Map<string, PlanoMetricRef>();
    for (const o of data.objetivos) {
      for (const mp of o.metricProgress) map.set(mp.ref.id, mp.ref);
    }
    for (const mp of data.metricProgress) map.set(mp.ref.id, mp.ref);
    return [...map.values()];
  }, [data]);

  const oportunidadesManuais = useMemo(
    () => data.oportunidades.filter((o) => o.origem !== "regra" && !o.id.startsWith("regra-")),
    [data.oportunidades],
  );

  const allEstrategias = data.estrategias;

  const clearEdit = (entity: DeleteEntity) => {
    if (entity === "objetivo") setEditObjetivoId(null);
    if (entity === "estrategia") setEditEstrategiaId(null);
    if (entity === "hipotese") setEditHipoteseId(null);
    if (entity === "decisao") setEditDecisaoId(null);
    if (entity === "acao") setEditAcaoId(null);
    if (entity === "metric_ref") setEditMetricRefId(null);
    if (entity === "oportunidade") setEditOportunidadeId(null);
    if (entity === "aprendizado") setEditAprendizadoId(null);
    if (entity === "roadmap_marco") setEditRoadmapId(null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Gerenciar plano</SheetTitle>
          <SheetDescription>
            Edite ou remova qualquer registro do plano. Útil para corrigir testes ou falhas
            operacionais.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="plano" className="mt-4">
          <TabsList className="flex h-auto flex-wrap gap-1">
            <TabsTrigger value="plano">Plano</TabsTrigger>
            <TabsTrigger value="objetivo">Objetivo</TabsTrigger>
            <TabsTrigger value="estrategia">Estratégia</TabsTrigger>
            <TabsTrigger value="hipotese">Hipótese</TabsTrigger>
            <TabsTrigger value="decisao">Decisão</TabsTrigger>
            <TabsTrigger value="acao">Ação</TabsTrigger>
            <TabsTrigger value="kpi">KPI</TabsTrigger>
            <TabsTrigger value="oportunidade">Oportunidade</TabsTrigger>
            <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
            <TabsTrigger value="aprendizado">Aprendizado</TabsTrigger>
          </TabsList>

          <TabsContent value="plano" className="mt-4">
            <PlanoSettingsPanel
              plano={plano}
              isAdmin={isAdmin}
              onUpdated={invalidate}
              onClose={() => onOpenChange(false)}
            />
          </TabsContent>

          <TabsContent value="objetivo" className="mt-4 space-y-4">
            <StrategicPlanEntityList
              items={data.objetivos.map((o) => ({
                id: o.id,
                title: o.titulo,
                subtitle: o.descricao,
              }))}
              editingId={editObjetivoId}
              onEdit={setEditObjetivoId}
              onDelete={(id) => setPendingDelete({ entity: "objetivo", id })}
            />
            <ObjetivoForm
              key={editObjetivoId ?? "new-objetivo"}
              planoId={planoId}
              editItem={data.objetivos.find((o) => o.id === editObjetivoId) ?? null}
              onCancelEdit={() => setEditObjetivoId(null)}
              onSave={async (payload) => {
                await upsertObjetivoFn({ data: payload });
                invalidate();
                clearEdit("objetivo");
              }}
            />
          </TabsContent>

          <TabsContent value="estrategia" className="mt-4 space-y-4">
            <StrategicPlanEntityList
              items={allEstrategias.map((s) => ({
                id: s.id,
                title: s.titulo,
                subtitle: `${s.peso_percentual}% · ${s.prioridade}`,
              }))}
              editingId={editEstrategiaId}
              onEdit={setEditEstrategiaId}
              onDelete={(id) => setPendingDelete({ entity: "estrategia", id })}
            />
            <EstrategiaForm
              key={editEstrategiaId ?? "new-estrategia"}
              planoId={planoId}
              objetivoId={objetivoAtualId}
              editItem={allEstrategias.find((s) => s.id === editEstrategiaId) ?? null}
              onCancelEdit={() => setEditEstrategiaId(null)}
              onSave={async (payload) => {
                await upsertEstrategiaFn({ data: payload });
                invalidate();
                clearEdit("estrategia");
              }}
            />
          </TabsContent>

          <TabsContent value="hipotese" className="mt-4 space-y-4">
            <StrategicPlanEntityList
              items={data.hipoteses.map((h) => ({
                id: h.id,
                title: h.hipotese.slice(0, 80) + (h.hipotese.length > 80 ? "…" : ""),
                subtitle: h.status,
              }))}
              editingId={editHipoteseId}
              onEdit={setEditHipoteseId}
              onDelete={(id) => setPendingDelete({ entity: "hipotese", id })}
            />
            <HipoteseForm
              key={editHipoteseId ?? "new-hipotese"}
              planoId={planoId}
              objetivoId={objetivoAtualId}
              editItem={data.hipoteses.find((h) => h.id === editHipoteseId) ?? null}
              onCancelEdit={() => setEditHipoteseId(null)}
              onSave={async (payload) => {
                await upsertHipoteseFn({ data: payload });
                invalidate();
                clearEdit("hipotese");
              }}
            />
          </TabsContent>

          <TabsContent value="decisao" className="mt-4 space-y-4">
            <StrategicPlanEntityList
              items={data.decisoes.map((d) => ({
                id: d.id,
                title: d.titulo,
                subtitle: d.motivo,
              }))}
              editingId={editDecisaoId}
              onEdit={setEditDecisaoId}
              onDelete={(id) => setPendingDelete({ entity: "decisao", id })}
            />
            <DecisaoForm
              key={editDecisaoId ?? "new-decisao"}
              planoId={planoId}
              editItem={data.decisoes.find((d) => d.id === editDecisaoId) ?? null}
              onCancelEdit={() => setEditDecisaoId(null)}
              onSave={async (payload) => {
                await upsertDecisaoFn({ data: payload });
                invalidate();
                clearEdit("decisao");
              }}
            />
          </TabsContent>

          <TabsContent value="acao" className="mt-4 space-y-4">
            <StrategicPlanEntityList
              items={data.acoes.map((a) => ({
                id: a.id,
                title: a.titulo,
                subtitle: a.status,
              }))}
              editingId={editAcaoId}
              onEdit={setEditAcaoId}
              onDelete={(id) => setPendingDelete({ entity: "acao", id })}
            />
            <AcaoForm
              key={editAcaoId ?? "new-acao"}
              planoId={planoId}
              estrategias={estrategias}
              editItem={data.acoes.find((a) => a.id === editAcaoId) ?? null}
              onCancelEdit={() => setEditAcaoId(null)}
              onSave={async (payload) => {
                await upsertAcaoFn({ data: payload });
                invalidate();
                clearEdit("acao");
              }}
            />
          </TabsContent>

          <TabsContent value="kpi" className="mt-4 space-y-4">
            <StrategicPlanEntityList
              items={metricRefs.map((r) => {
                const mp = data.metricProgress.find((m) => m.ref.id === r.id);
                return {
                  id: r.id,
                  title: mp?.label ?? r.metric_key ?? r.kpi_key ?? r.platform_key,
                  subtitle: mp?.platformLabel,
                };
              })}
              editingId={editMetricRefId}
              onEdit={setEditMetricRefId}
              onDelete={(id) => setPendingDelete({ entity: "metric_ref", id })}
            />
            <KpiForm
              key={editMetricRefId ?? "new-kpi"}
              planoId={planoId}
              objetivoId={objetivoAtualId}
              catalog={catalog}
              editItem={metricRefs.find((r) => r.id === editMetricRefId) ?? null}
              onCancelEdit={() => setEditMetricRefId(null)}
              onSave={async (payload) => {
                await upsertMetricRefFn({ data: payload });
                invalidate();
                clearEdit("metric_ref");
              }}
            />
          </TabsContent>

          <TabsContent value="oportunidade" className="mt-4 space-y-4">
            <StrategicPlanEntityList
              items={oportunidadesManuais.map((o) => ({
                id: o.id,
                title: o.insight,
                subtitle: o.acao_sugerida,
              }))}
              emptyLabel="Nenhuma oportunidade manual. Oportunidades por regra não podem ser excluídas aqui."
              editingId={editOportunidadeId}
              onEdit={setEditOportunidadeId}
              onDelete={(id) => setPendingDelete({ entity: "oportunidade", id })}
            />
            <OportunidadeForm
              key={editOportunidadeId ?? "new-oportunidade"}
              planoId={planoId}
              editItem={oportunidadesManuais.find((o) => o.id === editOportunidadeId) ?? null}
              onCancelEdit={() => setEditOportunidadeId(null)}
              onSave={async (payload) => {
                await upsertOportunidadeFn({ data: payload });
                invalidate();
                clearEdit("oportunidade");
              }}
            />
          </TabsContent>

          <TabsContent value="roadmap" className="mt-4 space-y-4">
            <StrategicPlanEntityList
              items={data.roadmap.map((m) => ({
                id: m.id,
                title: m.titulo,
                subtitle: m.data_prevista ?? `Semana ${m.semana_numero ?? "—"}`,
              }))}
              editingId={editRoadmapId}
              onEdit={setEditRoadmapId}
              onDelete={(id) => setPendingDelete({ entity: "roadmap_marco", id })}
            />
            <RoadmapForm
              key={editRoadmapId ?? "new-roadmap"}
              planoId={planoId}
              objetivoId={objetivoAtualId}
              editItem={data.roadmap.find((m) => m.id === editRoadmapId) ?? null}
              onCancelEdit={() => setEditRoadmapId(null)}
              onSave={async (payload) => {
                await upsertRoadmapFn({ data: payload });
                invalidate();
                clearEdit("roadmap_marco");
              }}
            />
          </TabsContent>

          <TabsContent value="aprendizado" className="mt-4 space-y-4">
            <StrategicPlanEntityList
              items={data.aprendizados.map((a) => ({
                id: a.id,
                title: a.titulo,
                subtitle: a.mes_referencia,
              }))}
              editingId={editAprendizadoId}
              onEdit={setEditAprendizadoId}
              onDelete={(id) => setPendingDelete({ entity: "aprendizado", id })}
            />
            <AprendizadoForm
              key={editAprendizadoId ?? "new-aprendizado"}
              planoId={planoId}
              editItem={data.aprendizados.find((a) => a.id === editAprendizadoId) ?? null}
              onCancelEdit={() => setEditAprendizadoId(null)}
              onSave={async (payload) => {
                await upsertAprendizadoFn({ data: payload });
                invalidate();
                clearEdit("aprendizado");
              }}
            />
          </TabsContent>
        </Tabs>

        <div className="mt-6 space-y-2 border-t border-border pt-4">
          <Field
            label="Comentário na timeline"
            hint="Registro livre para alinhamentos, contexto de reuniões ou observações."
          >
            <TextArea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder="Ex.: Alinhado em call de 15/06 — priorizar Meta Ads até revisão de criativos."
            />
          </Field>
          <Button
            size="sm"
            disabled={!comment.trim()}
            onClick={() => {
              onComment(comment.trim());
              setComment("");
            }}
          >
            Registrar comentário
          </Button>
        </div>

        <ConfirmDialog
          open={!!pendingDelete}
          onOpenChange={(o) => !o && setPendingDelete(null)}
          title="Excluir este registro?"
          description="Esta ação não pode ser desfeita."
          confirmLabel="Excluir"
          variant="destructive"
          onConfirm={() => pendingDelete && deleteMut.mutate(pendingDelete)}
        />
      </SheetContent>
    </Sheet>
  );
}

function EditFormActions({
  isEditing,
  onCancelEdit,
  submitLabel,
  createLabel,
}: {
  isEditing: boolean;
  onCancelEdit?: () => void;
  submitLabel: string;
  createLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="submit" size="sm">
        {isEditing ? submitLabel : createLabel}
      </Button>
      {isEditing && onCancelEdit && (
        <Button type="button" variant="outline" size="sm" onClick={onCancelEdit}>
          Cancelar edição
        </Button>
      )}
    </div>
  );
}

function ObjetivoForm({
  planoId,
  editItem,
  onCancelEdit,
  onSave,
}: {
  planoId: string;
  editItem?: PlanoObjetivo | null;
  onCancelEdit?: () => void;
  onSave: (p: Record<string, unknown>) => Promise<void>;
}) {
  const [titulo, setTitulo] = useState(editItem?.titulo ?? "");
  const [descricao, setDescricao] = useState(editItem?.descricao ?? "");
  const [meta, setMeta] = useState(editItem?.meta_numerica?.toString() ?? "");
  const [dataAlvo, setDataAlvo] = useState(editItem?.data_alvo ?? "");
  const [workflowFase, setWorkflowFase] = useState<(typeof OBJETIVO_WORKFLOW_FASE)[number]>(
    editItem?.workflow_fase ?? "em_andamento",
  );

  useEffect(() => {
    setTitulo(editItem?.titulo ?? "");
    setDescricao(editItem?.descricao ?? "");
    setMeta(editItem?.meta_numerica?.toString() ?? "");
    setDataAlvo(editItem?.data_alvo ?? "");
    setWorkflowFase(editItem?.workflow_fase ?? "em_andamento");
  }, [editItem]);

  return (
    <form
      className="space-y-3 border-t border-border pt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSave({
          ...(editItem?.id ? { id: editItem.id } : {}),
          plano_id: planoId,
          titulo,
          descricao: descricao || null,
          meta_numerica: meta ? Number(meta) : null,
          data_alvo: dataAlvo || null,
          workflow_fase: workflowFase,
        });
        if (!editItem) {
          setTitulo("");
          setDescricao("");
          setMeta("");
          setDataAlvo("");
        }
      }}
    >
      <Field label="Título" required>
        <TextInput value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
      </Field>
      <Field label="Descrição">
        <TextArea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
      </Field>
      <FormRow>
        <Field label="Meta numérica">
          <TextInput type="number" value={meta} onChange={(e) => setMeta(e.target.value)} />
        </Field>
        <Field label="Prazo">
          <TextInput type="date" value={dataAlvo} onChange={(e) => setDataAlvo(e.target.value)} />
        </Field>
      </FormRow>
      <Field label="Status">
        <Select
          value={workflowFase}
          onChange={(e) =>
            setWorkflowFase(e.target.value as (typeof OBJETIVO_WORKFLOW_FASE)[number])
          }
        >
          {OBJETIVO_WORKFLOW_FASE.map((f) => (
            <option key={f} value={f}>
              {OBJETIVO_FASE_LABEL[f]}
            </option>
          ))}
        </Select>
      </Field>
      <EditFormActions
        isEditing={!!editItem}
        onCancelEdit={onCancelEdit}
        submitLabel="Salvar objetivo"
        createLabel="Adicionar objetivo"
      />
    </form>
  );
}

function EstrategiaForm({
  planoId,
  objetivoId,
  editItem,
  onCancelEdit,
  onSave,
}: {
  planoId: string;
  objetivoId: string | null;
  editItem?: PlanoEstrategia | null;
  onCancelEdit?: () => void;
  onSave: (p: Record<string, unknown>) => Promise<void>;
}) {
  const [titulo, setTitulo] = useState(editItem?.titulo ?? "");
  const [peso, setPeso] = useState(String(editItem?.peso_percentual ?? 25));
  const [prioridade, setPrioridade] = useState<(typeof PLANO_PRIORIDADE)[number]>(
    editItem?.prioridade ?? "media",
  );

  useEffect(() => {
    setTitulo(editItem?.titulo ?? "");
    setPeso(String(editItem?.peso_percentual ?? 25));
    setPrioridade(editItem?.prioridade ?? "media");
  }, [editItem]);

  return (
    <form
      className="space-y-3 border-t border-border pt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const oid = editItem?.objetivo_id ?? objetivoId;
        if (!oid) return;
        await onSave({
          ...(editItem?.id ? { id: editItem.id } : {}),
          plano_id: planoId,
          objetivo_id: oid,
          titulo,
          peso_percentual: Number(peso),
          prioridade,
        });
        if (!editItem) setTitulo("");
      }}
    >
      {!editItem && !objetivoId && (
        <p className="text-xs text-warning">
          Crie ou ative um objetivo antes de adicionar estratégias.
        </p>
      )}
      <Field label="Título" required>
        <TextInput value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
      </Field>
      <FormRow>
        <Field label="Peso (%)">
          <TextInput
            type="number"
            min={0}
            max={100}
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
          />
        </Field>
        <Field label="Prioridade">
          <Select
            value={prioridade}
            onChange={(e) => setPrioridade(e.target.value as typeof prioridade)}
          >
            {PLANO_PRIORIDADE.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Field>
      </FormRow>
      <EditFormActions
        isEditing={!!editItem}
        onCancelEdit={onCancelEdit}
        submitLabel="Salvar estratégia"
        createLabel="Adicionar estratégia"
      />
    </form>
  );
}

function HipoteseForm({
  planoId,
  objetivoId,
  editItem,
  onCancelEdit,
  onSave,
}: {
  planoId: string;
  objetivoId: string | null;
  editItem?: PlanoHipotese | null;
  onCancelEdit?: () => void;
  onSave: (p: Record<string, unknown>) => Promise<void>;
}) {
  const [hipotese, setHipotese] = useState(editItem?.hipotese ?? "");
  const [status, setStatus] = useState<(typeof HIPOTESE_STATUS)[number]>(
    editItem?.status ?? "aberta",
  );
  const [resultado, setResultado] = useState(editItem?.resultado_percentual?.toString() ?? "");
  const [conclusao, setConclusao] = useState(editItem?.conclusao ?? "");

  useEffect(() => {
    setHipotese(editItem?.hipotese ?? "");
    setStatus(editItem?.status ?? "aberta");
    setResultado(editItem?.resultado_percentual?.toString() ?? "");
    setConclusao(editItem?.conclusao ?? "");
  }, [editItem]);

  return (
    <form
      className="space-y-3 border-t border-border pt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSave({
          ...(editItem?.id ? { id: editItem.id } : {}),
          plano_id: planoId,
          objetivo_id: editItem?.objetivo_id ?? objetivoId,
          hipotese,
          status,
          resultado_percentual: resultado ? Number(resultado) : null,
          conclusao: conclusao || null,
        });
        if (!editItem) setHipotese("");
      }}
    >
      <Field label="Hipótese" required>
        <TextArea
          value={hipotese}
          onChange={(e) => setHipotese(e.target.value)}
          required
          rows={3}
        />
      </Field>
      <FormRow>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            {HIPOTESE_STATUS.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Resultado (%)">
          <TextInput
            type="number"
            value={resultado}
            onChange={(e) => setResultado(e.target.value)}
          />
        </Field>
      </FormRow>
      <Field label="Conclusão">
        <TextInput value={conclusao} onChange={(e) => setConclusao(e.target.value)} />
      </Field>
      <EditFormActions
        isEditing={!!editItem}
        onCancelEdit={onCancelEdit}
        submitLabel="Salvar hipótese"
        createLabel="Adicionar hipótese"
      />
    </form>
  );
}

function DecisaoForm({
  planoId,
  editItem,
  onCancelEdit,
  onSave,
}: {
  planoId: string;
  editItem?: PlanoDecisao | null;
  onCancelEdit?: () => void;
  onSave: (p: Record<string, unknown>) => Promise<void>;
}) {
  const [titulo, setTitulo] = useState(editItem?.titulo ?? "");
  const [motivo, setMotivo] = useState(editItem?.motivo ?? "");
  const [responsavel, setResponsavel] = useState(editItem?.responsavel_email ?? "");

  useEffect(() => {
    setTitulo(editItem?.titulo ?? "");
    setMotivo(editItem?.motivo ?? "");
    setResponsavel(editItem?.responsavel_email ?? "");
  }, [editItem]);

  return (
    <form
      className="space-y-3 border-t border-border pt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSave({
          ...(editItem?.id ? { id: editItem.id } : {}),
          plano_id: planoId,
          titulo,
          motivo,
          responsavel_email: responsavel || null,
        });
        if (!editItem) {
          setTitulo("");
          setMotivo("");
        }
      }}
    >
      <Field label="Decisão" required>
        <TextInput value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
      </Field>
      <Field label="Motivo" required>
        <TextArea value={motivo} onChange={(e) => setMotivo(e.target.value)} required rows={2} />
      </Field>
      <Field label="Responsável (e-mail)">
        <TextInput
          type="email"
          value={responsavel}
          onChange={(e) => setResponsavel(e.target.value)}
        />
      </Field>
      <EditFormActions
        isEditing={!!editItem}
        onCancelEdit={onCancelEdit}
        submitLabel="Salvar decisão"
        createLabel="Registrar decisão"
      />
    </form>
  );
}

function AcaoForm({
  planoId,
  estrategias,
  editItem,
  onCancelEdit,
  onSave,
}: {
  planoId: string;
  estrategias: PlanoEstrategia[];
  editItem?: PlanoAcao | null;
  onCancelEdit?: () => void;
  onSave: (p: Record<string, unknown>) => Promise<void>;
}) {
  const [titulo, setTitulo] = useState(editItem?.titulo ?? "");
  const [motivo, setMotivo] = useState(editItem?.motivo_estrategico ?? "");
  const [estrategiaId, setEstrategiaId] = useState(editItem?.estrategia_id ?? "");
  const [status, setStatus] = useState<(typeof PLANO_ITEM_STATUS)[number]>(
    editItem?.status ?? "pendente",
  );

  useEffect(() => {
    setTitulo(editItem?.titulo ?? "");
    setMotivo(editItem?.motivo_estrategico ?? "");
    setEstrategiaId(editItem?.estrategia_id ?? "");
    setStatus(editItem?.status ?? "pendente");
  }, [editItem]);

  return (
    <form
      className="space-y-3 border-t border-border pt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSave({
          ...(editItem?.id ? { id: editItem.id } : {}),
          plano_id: planoId,
          titulo,
          motivo_estrategico: motivo,
          estrategia_id: estrategiaId || null,
          status,
        });
        if (!editItem) {
          setTitulo("");
          setMotivo("");
        }
      }}
    >
      <Field label="Ação" required>
        <TextInput value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
      </Field>
      <Field label="Motivo estratégico" required>
        <TextArea value={motivo} onChange={(e) => setMotivo(e.target.value)} required rows={2} />
      </Field>
      {estrategias.length > 0 && (
        <Field label="Estratégia">
          <Select value={estrategiaId} onChange={(e) => setEstrategiaId(e.target.value)}>
            <option value="">—</option>
            {estrategias.map((s) => (
              <option key={s.id} value={s.id}>
                {s.titulo}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {editItem && (
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            {PLANO_ITEM_STATUS.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <EditFormActions
        isEditing={!!editItem}
        onCancelEdit={onCancelEdit}
        submitLabel="Salvar ação"
        createLabel="Adicionar ação"
      />
    </form>
  );
}

function KpiForm({
  planoId,
  objetivoId,
  catalog,
  editItem,
  onCancelEdit,
  onSave,
}: {
  planoId: string;
  objetivoId: string | null;
  catalog: ReturnType<typeof listMetricCatalog>;
  editItem?: PlanoMetricRef | null;
  onCancelEdit?: () => void;
  onSave: (p: Record<string, unknown>) => Promise<void>;
}) {
  const initialPlatform = editItem?.platform_key ?? catalog[0]?.platformKey ?? "";
  const initialMetricKey = editItem?.metric_key ?? editItem?.kpi_key ?? "";
  const [platformKey, setPlatformKey] = useState(initialPlatform);
  const [metricKey, setMetricKey] = useState(initialMetricKey);
  const [meta, setMeta] = useState(editItem?.meta_numerica?.toString() ?? "");
  const platformMetrics = catalog.filter((c) => c.platformKey === platformKey);

  useEffect(() => {
    setPlatformKey(editItem?.platform_key ?? catalog[0]?.platformKey ?? "");
    setMetricKey(editItem?.metric_key ?? editItem?.kpi_key ?? "");
    setMeta(editItem?.meta_numerica?.toString() ?? "");
  }, [editItem, catalog]);

  return (
    <form
      className="space-y-3 border-t border-border pt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const entry = catalog.find((c) => c.key === metricKey && c.platformKey === platformKey);
        if (!entry && !editItem) return;
        const positiveIsGood = entry?.positiveIsGood ?? editItem?.positive_is_good ?? true;
        await onSave({
          ...(editItem?.id ? { id: editItem.id } : {}),
          plano_id: planoId,
          objetivo_id: editItem?.objetivo_id ?? objetivoId,
          platform_key: platformKey,
          metric_key: entry?.kind === "metric" ? entry.key : (editItem?.metric_key ?? null),
          kpi_key: entry?.kind === "kpi" ? entry.key : (editItem?.kpi_key ?? null),
          meta_numerica: meta ? Number(meta) : null,
          positive_is_good: positiveIsGood,
        });
        if (!editItem) setMeta("");
      }}
    >
      <Field label="Plataforma">
        <Select
          value={platformKey}
          onChange={(e) => {
            setPlatformKey(e.target.value);
            if (!editItem) setMetricKey("");
          }}
        >
          {[...new Set(catalog.map((c) => c.platformKey))].map((k) => (
            <option key={k} value={k}>
              {catalog.find((c) => c.platformKey === k)?.platformLabel ?? k}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Métrica / KPI" required={!editItem}>
        <Select
          value={metricKey}
          onChange={(e) => setMetricKey(e.target.value)}
          required={!editItem}
        >
          <option value="">Selecione</option>
          {platformMetrics.map((m) => (
            <option key={`${m.kind}-${m.key}`} value={m.key}>
              {m.label} ({m.kind})
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Meta numérica">
        <TextInput type="number" value={meta} onChange={(e) => setMeta(e.target.value)} />
      </Field>
      <EditFormActions
        isEditing={!!editItem}
        onCancelEdit={onCancelEdit}
        submitLabel="Salvar KPI"
        createLabel="Vincular KPI"
      />
    </form>
  );
}

function OportunidadeForm({
  planoId,
  editItem,
  onCancelEdit,
  onSave,
}: {
  planoId: string;
  editItem?: PlanoOportunidade | null;
  onCancelEdit?: () => void;
  onSave: (p: Record<string, unknown>) => Promise<void>;
}) {
  const [insight, setInsight] = useState(editItem?.insight ?? "");
  const [acao, setAcao] = useState(editItem?.acao_sugerida ?? "");
  const [status, setStatus] = useState<(typeof PLANO_ITEM_STATUS)[number]>(
    editItem?.status ?? "pendente",
  );

  useEffect(() => {
    setInsight(editItem?.insight ?? "");
    setAcao(editItem?.acao_sugerida ?? "");
    setStatus(editItem?.status ?? "pendente");
  }, [editItem]);

  return (
    <form
      className="space-y-3 border-t border-border pt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSave({
          ...(editItem?.id ? { id: editItem.id } : {}),
          plano_id: planoId,
          insight,
          acao_sugerida: acao,
          status,
        });
        if (!editItem) {
          setInsight("");
          setAcao("");
        }
      }}
    >
      <Field label="Insight" required>
        <TextInput value={insight} onChange={(e) => setInsight(e.target.value)} required />
      </Field>
      <Field label="Ação sugerida" required>
        <TextInput value={acao} onChange={(e) => setAcao(e.target.value)} required />
      </Field>
      {editItem && (
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            {PLANO_ITEM_STATUS.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <EditFormActions
        isEditing={!!editItem}
        onCancelEdit={onCancelEdit}
        submitLabel="Salvar oportunidade"
        createLabel="Adicionar oportunidade"
      />
    </form>
  );
}

function RoadmapForm({
  planoId,
  objetivoId,
  editItem,
  onCancelEdit,
  onSave,
}: {
  planoId: string;
  objetivoId: string | null;
  editItem?: PlanoRoadmapMarco | null;
  onCancelEdit?: () => void;
  onSave: (p: Record<string, unknown>) => Promise<void>;
}) {
  const [titulo, setTitulo] = useState(editItem?.titulo ?? "");
  const [descricao, setDescricao] = useState(editItem?.descricao ?? "");
  const [tipo, setTipo] = useState<(typeof ROADMAP_MARCO_TIPO)[number]>(editItem?.tipo ?? "marco");
  const [dataPrevista, setDataPrevista] = useState(editItem?.data_prevista ?? "");
  const [status, setStatus] = useState<(typeof PLANO_ITEM_STATUS)[number]>(
    editItem?.status ?? "pendente",
  );

  useEffect(() => {
    setTitulo(editItem?.titulo ?? "");
    setDescricao(editItem?.descricao ?? "");
    setTipo(editItem?.tipo ?? "marco");
    setDataPrevista(editItem?.data_prevista ?? "");
    setStatus(editItem?.status ?? "pendente");
  }, [editItem]);

  return (
    <form
      className="space-y-3 border-t border-border pt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSave({
          ...(editItem?.id ? { id: editItem.id } : {}),
          plano_id: planoId,
          objetivo_id: editItem?.objetivo_id ?? objetivoId,
          titulo,
          descricao: descricao || null,
          tipo,
          data_prevista: dataPrevista || null,
          status,
        });
        if (!editItem) setTitulo("");
      }}
    >
      <Field label="Marco" required>
        <TextInput value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
      </Field>
      <Field label="Descrição">
        <TextArea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
      </Field>
      <FormRow>
        <Field label="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
            {ROADMAP_MARCO_TIPO.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Data prevista">
          <TextInput
            type="date"
            value={dataPrevista}
            onChange={(e) => setDataPrevista(e.target.value)}
          />
        </Field>
      </FormRow>
      {editItem && (
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            {PLANO_ITEM_STATUS.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <EditFormActions
        isEditing={!!editItem}
        onCancelEdit={onCancelEdit}
        submitLabel="Salvar marco"
        createLabel="Adicionar marco"
      />
    </form>
  );
}

function AprendizadoForm({
  planoId,
  editItem,
  onCancelEdit,
  onSave,
}: {
  planoId: string;
  editItem?: PlanoAprendizado | null;
  onCancelEdit?: () => void;
  onSave: (p: Record<string, unknown>) => Promise<void>;
}) {
  const [mesRef, setMesRef] = useState(editItem?.mes_referencia ?? "");
  const [titulo, setTitulo] = useState(editItem?.titulo ?? "");
  const [descricao, setDescricao] = useState(editItem?.descricao ?? "");

  useEffect(() => {
    setMesRef(editItem?.mes_referencia ?? "");
    setTitulo(editItem?.titulo ?? "");
    setDescricao(editItem?.descricao ?? "");
  }, [editItem]);

  return (
    <form
      className="space-y-3 border-t border-border pt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSave({
          ...(editItem?.id ? { id: editItem.id } : {}),
          plano_id: planoId,
          mes_referencia: mesRef,
          titulo,
          descricao: descricao || null,
        });
        if (!editItem) {
          setMesRef("");
          setTitulo("");
        }
      }}
    >
      <Field label="Mês de referência" required hint="Formato AAAA-MM-DD (primeiro dia do mês).">
        <TextInput
          type="date"
          value={mesRef}
          onChange={(e) => setMesRef(e.target.value)}
          required
        />
      </Field>
      <Field label="Título" required>
        <TextInput value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
      </Field>
      <Field label="Descrição">
        <TextArea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
      </Field>
      <EditFormActions
        isEditing={!!editItem}
        onCancelEdit={onCancelEdit}
        submitLabel="Salvar aprendizado"
        createLabel="Registrar aprendizado"
      />
    </form>
  );
}
