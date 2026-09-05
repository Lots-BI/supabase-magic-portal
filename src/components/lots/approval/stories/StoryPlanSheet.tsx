import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { StoryPlanRow } from "@/modules/approval/types/story-plan-row";
import {
  mondayOfWeek,
  STORY_DAY_LABELS,
  isoDay,
  parseIsoDay,
} from "@/modules/approval/services/calendar-date-utils";
import {
  listStoryPlanRows,
  createStoryPlanRowFn,
  updateStoryPlanRowFn,
  deleteStoryPlanRowFn,
} from "@/modules/approval/planning/stories.server";
import { listClientStoryPlanRows } from "@/modules/approval/planning/client-planning.server";
import { listScopedStoryPlanRowsFn } from "@/modules/client/scoped-portal.functions";
import { useOptionalClientScope } from "@/modules/client/context";
import { ApprovalPanelSkeleton } from "../shared/ApprovalPanelSkeleton";

export function StoryPlanSheet({
  cadastroClienteId,
  readOnly = false,
  clientMode = false,
  onOpenCard,
}: {
  cadastroClienteId?: number;
  readOnly?: boolean;
  clientMode?: boolean;
  onOpenCard?: (cardId: string) => void;
}) {
  const qc = useQueryClient();
  const staffListFn = useServerFn(listStoryPlanRows);
  const clientListFn = useServerFn(listClientStoryPlanRows);
  const scopedListFn = useServerFn(listScopedStoryPlanRowsFn);
  const portalScope = useOptionalClientScope();
  const createFn = useServerFn(createStoryPlanRowFn);
  const updateFn = useServerFn(updateStoryPlanRowFn);
  const deleteFn = useServerFn(deleteStoryPlanRowFn);

  const [semanaInicio, setSemanaInicio] = useState(() => mondayOfWeek(isoDay(new Date())));

  const scopeKey = portalScope?.scopeQueryKey ?? (clientMode ? "client" : cadastroClienteId);

  const rowsQ = useQuery({
    queryKey: ["story-plan", scopeKey, semanaInicio],
    queryFn: () => {
      if (portalScope) {
        return scopedListFn({
          data: { scope: portalScope.scopeInput, semana_inicio: semanaInicio },
        });
      }
      return clientMode
        ? clientListFn({ data: { semana_inicio: semanaInicio } })
        : staffListFn({
            data: { cadastro_cliente_id: cadastroClienteId!, semana_inicio: semanaInicio },
          });
    },
    enabled: !!portalScope || clientMode || !!cadastroClienteId,
  });

  const rowsByDay = useMemo(() => {
    const map = new Map<number, StoryPlanRow[]>();
    for (let d = 0; d < 7; d++) map.set(d, []);
    for (const row of rowsQ.data ?? []) {
      const list = map.get(row.dia_semana) ?? [];
      list.push(row);
      map.set(row.dia_semana, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.ordem - b.ordem);
    }
    return map;
  }, [rowsQ.data]);

  const invalidate = () => {
    qc.invalidateQueries({
      queryKey: ["story-plan", scopeKey, semanaInicio],
    });
  };

  const shiftWeek = (delta: number) => {
    const d = parseIsoDay(semanaInicio);
    d.setDate(d.getDate() + delta * 7);
    setSemanaInicio(mondayOfWeek(isoDay(d)));
  };

  const addRow = (diaSemana: number) => {
    if (!cadastroClienteId) return;
    const dayRows = rowsByDay.get(diaSemana) ?? [];
    createFn({
      data: {
        cadastro_cliente_id: cadastroClienteId,
        semana_inicio: semanaInicio,
        dia_semana: diaSemana,
        ordem: dayRows.length,
        checklist: [],
      },
    })
      .then(() => {
        toast.success("Linha adicionada.");
        invalidate();
      })
      .catch((e: Error) => toast.error(e.message));
  };

  const patchRow = (id: string, patch: Partial<StoryPlanRow>) => {
    updateFn({
      data: {
        id,
        periodo: patch.periodo,
        titulo: patch.titulo,
        observacoes: patch.observacoes,
        card_id: patch.card_id,
        checklist: patch.checklist,
      },
    })
      .then(invalidate)
      .catch((e: Error) => toast.error(e.message));
  };

  const removeRow = (id: string) => {
    deleteFn({ data: { id } })
      .then(() => {
        toast.success("Linha removida.");
        invalidate();
      })
      .catch((e: Error) => toast.error(e.message));
  };

  const weekLabel = useMemo(() => {
    const start = parseIsoDay(semanaInicio);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString("pt-BR")} — ${end.toLocaleDateString("pt-BR")}`;
  }, [semanaInicio]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="icon" onClick={() => shiftWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={() => shiftWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSemanaInicio(mondayOfWeek(isoDay(new Date())))}
          >
            Esta semana
          </Button>
        </div>
        <p className="text-sm font-medium">{weekLabel}</p>
      </div>

      {rowsQ.isLoading ? (
        <ApprovalPanelSkeleton rows={8} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2 text-left font-medium">Dia</th>
                <th className="px-3 py-2 text-left font-medium">Período</th>
                <th className="px-3 py-2 text-left font-medium">Objetivo / Título</th>
                <th className="px-3 py-2 text-left font-medium">Observações</th>
                <th className="px-3 py-2 text-left font-medium">Checklist</th>
                <th className="px-3 py-2 text-left font-medium">Card</th>
                {!readOnly && <th className="w-10" />}
              </tr>
            </thead>
            <tbody>
              {STORY_DAY_LABELS.map((label, diaSemana) => {
                const dayRows = rowsByDay.get(diaSemana) ?? [];
                if (dayRows.length === 0) {
                  return (
                    <tr key={diaSemana} className="border-b border-border">
                      <td className="px-3 py-2 font-medium text-muted-foreground">{label}</td>
                      <td colSpan={readOnly ? 5 : 6} className="px-3 py-2">
                        <span className="text-muted-foreground">—</span>
                        {!readOnly && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-2"
                            onClick={() => addRow(diaSemana)}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Linha
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                }
                return dayRows.map((row, rowIdx) => (
                  <tr key={row.id} className="border-b border-border align-top">
                    {rowIdx === 0 && (
                      <td className="px-3 py-2 font-medium" rowSpan={dayRows.length}>
                        {label}
                      </td>
                    )}
                    <StoryRowCells
                      row={row}
                      readOnly={readOnly}
                      onPatch={(patch) => patchRow(row.id, patch)}
                      onOpenCard={onOpenCard}
                    />
                    {!readOnly && (
                      <td className="px-2 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(row.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StoryRowCells({
  row,
  readOnly,
  onPatch,
  onOpenCard,
}: {
  row: StoryPlanRow;
  readOnly: boolean;
  onPatch: (patch: Partial<StoryPlanRow>) => void;
  onOpenCard?: (cardId: string) => void;
}) {
  if (readOnly) {
    return (
      <>
        <td className="px-3 py-2">{row.periodo ?? "—"}</td>
        <td className="px-3 py-2">{row.titulo ?? "—"}</td>
        <td className="px-3 py-2 whitespace-pre-wrap">{row.observacoes ?? "—"}</td>
        <td className="px-3 py-2">
          {row.checklist.length === 0 ? (
            "—"
          ) : (
            <ul className="list-disc pl-4 text-xs">
              {row.checklist.map((c) => (
                <li key={c.id} className={c.done ? "line-through opacity-60" : ""}>
                  {c.label}
                </li>
              ))}
            </ul>
          )}
        </td>
        <td className="px-3 py-2">
          {row.card_id ? (
            <button
              type="button"
              className="text-primary underline-offset-2 hover:underline"
              onClick={() => onOpenCard?.(row.card_id!)}
            >
              Ver card
            </button>
          ) : (
            "—"
          )}
        </td>
      </>
    );
  }

  return (
    <>
      <td className="px-2 py-2">
        <Input
          defaultValue={row.periodo ?? ""}
          placeholder="manhã…"
          className="h-8 text-xs"
          onBlur={(e) => {
            const v = e.target.value.trim() || null;
            if (v !== (row.periodo ?? null)) onPatch({ periodo: v });
          }}
        />
      </td>
      <td className="px-2 py-2">
        <Input
          defaultValue={row.titulo ?? ""}
          className="h-8 text-xs"
          onBlur={(e) => {
            const v = e.target.value.trim() || null;
            if (v !== (row.titulo ?? null)) onPatch({ titulo: v });
          }}
        />
      </td>
      <td className="px-2 py-2">
        <Textarea
          defaultValue={row.observacoes ?? ""}
          rows={2}
          className="min-h-[2rem] text-xs"
          onBlur={(e) => {
            const v = e.target.value.trim() || null;
            if (v !== (row.observacoes ?? null)) onPatch({ observacoes: v });
          }}
        />
      </td>
      <td className="px-2 py-2 text-xs text-muted-foreground">{row.checklist.length} item(ns)</td>
      <td className="px-2 py-2">
        <Input
          defaultValue={row.card_id ?? ""}
          placeholder="UUID do card"
          className="h-8 font-mono text-[10px]"
          onBlur={(e) => {
            const v = e.target.value.trim() || null;
            if (v !== row.card_id) onPatch({ card_id: v });
          }}
        />
      </td>
    </>
  );
}
