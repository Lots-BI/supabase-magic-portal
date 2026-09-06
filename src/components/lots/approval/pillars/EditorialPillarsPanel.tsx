import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Archive, ChevronDown, ChevronUp, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { EditorialPillar } from "@/modules/approval/types/editorial-pillar";
import {
  listEditorialPillarsFn,
  createEditorialPillarFn,
  updateEditorialPillarFn,
  archiveEditorialPillarFn,
  reorderEditorialPillarsFn,
} from "@/modules/approval/planning/pillars.server";
import { listClientEditorialPillars } from "@/modules/approval/planning/client-planning.server";
import { listScopedEditorialPillarsFn } from "@/modules/client/scoped-portal.functions";
import { useOptionalClientScope } from "@/modules/client/context";
import { ApprovalPanelSkeleton } from "../shared/ApprovalPanelSkeleton";
import { ApprovalEmptyState } from "../shared/ApprovalEmptyState";
import { Layers } from "lucide-react";

type PillarForm = {
  titulo: string;
  objetivo: string;
  explicacao: string;
  cor: string;
};

const EMPTY_FORM: PillarForm = {
  titulo: "",
  objetivo: "",
  explicacao: "",
  cor: "#6366f1",
};

export function EditorialPillarsPanel({
  cadastroClienteId,
  readOnly = false,
  clientMode = false,
  ready = true,
}: {
  cadastroClienteId?: number;
  readOnly?: boolean;
  clientMode?: boolean;
  ready?: boolean;
}) {
  const qc = useQueryClient();
  const staffListFn = useServerFn(listEditorialPillarsFn);
  const clientListFn = useServerFn(listClientEditorialPillars);
  const scopedListFn = useServerFn(listScopedEditorialPillarsFn);
  const portalScope = useOptionalClientScope();
  const createFn = useServerFn(createEditorialPillarFn);
  const updateFn = useServerFn(updateEditorialPillarFn);
  const archiveFn = useServerFn(archiveEditorialPillarFn);
  const reorderFn = useServerFn(reorderEditorialPillarsFn);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EditorialPillar | null>(null);
  const [form, setForm] = useState<PillarForm>(EMPTY_FORM);

  const scopeKey = portalScope?.scopeQueryKey ?? (clientMode ? "client" : cadastroClienteId);

  const pillarsQ = useQuery({
    queryKey: ["editorial-pillars", scopeKey, !readOnly],
    queryFn: () => {
      if (portalScope?.mode === "slug_context") {
        return scopedListFn({ data: { scope: portalScope.scopeInput } });
      }
      if (portalScope?.mode === "client_access" || clientMode) {
        return clientListFn();
      }
      return staffListFn({
        data: { cadastro_cliente_id: cadastroClienteId!, include_archived: !readOnly },
      });
    },
    enabled: ready && (!!portalScope || clientMode || !!cadastroClienteId),
    retry: 1,
  });

  const pillars = useMemo(() => pillarsQ.data ?? [], [pillarsQ.data]);
  const activePillars = useMemo(() => pillars.filter((p) => p.ativo), [pillars]);

  const invalidate = () => {
    qc.invalidateQueries({
      queryKey: ["editorial-pillars", scopeKey],
    });
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (p: EditorialPillar) => {
    setEditing(p);
    setForm({
      titulo: p.titulo,
      objetivo: p.objetivo ?? "",
      explicacao: p.explicacao ?? "",
      cor: p.cor,
    });
    setDialogOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!cadastroClienteId) throw new Error("Cliente não selecionado");
      const payload = {
        titulo: form.titulo.trim(),
        objetivo: form.objetivo.trim() || null,
        explicacao: form.explicacao.trim() || null,
        cor: form.cor,
      };
      if (editing) {
        return updateFn({ data: { id: editing.id, ...payload } });
      }
      return createFn({
        data: { cadastro_cliente_id: cadastroClienteId, ...payload, ordem: activePillars.length },
      });
    },
    onSuccess: () => {
      toast.success(editing ? "Pilar atualizado." : "Pilar criado.");
      setDialogOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archiveMut = useMutation({
    mutationFn: (id: string) => archiveFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Pilar arquivado.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorderMut = useMutation({
    mutationFn: (orderedIds: string[]) => {
      if (!cadastroClienteId) throw new Error("Cliente não selecionado");
      return reorderFn({
        data: { cadastro_cliente_id: cadastroClienteId, ordered_ids: orderedIds },
      });
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const move = (index: number, dir: -1 | 1) => {
    const list = [...activePillars];
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const tmp = list[index]!;
    list[index] = list[target]!;
    list[target] = tmp;
    reorderMut.mutate(list.map((p) => p.id));
  };

  if (pillarsQ.isLoading) {
    return <ApprovalPanelSkeleton rows={4} />;
  }

  if (pillarsQ.isError) {
    return (
      <p className="text-sm text-destructive">
        Não foi possível carregar os pilares.
        {pillarsQ.error instanceof Error ? ` ${pillarsQ.error.message}` : ""}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex justify-end">
          <Button type="button" onClick={openCreate} disabled={!cadastroClienteId}>
            <Plus className="mr-2 h-4 w-4" />
            Novo pilar
          </Button>
        </div>
      )}

      {activePillars.length === 0 && (
        <ApprovalEmptyState
          icon={Layers}
          title="Nenhum pilar editorial"
          description={
            readOnly
              ? "Nenhum pilar editorial cadastrado para este cliente."
              : "Crie o primeiro pilar editorial para estruturar o conteúdo."
          }
          action={
            !readOnly && cadastroClienteId ? (
              <Button type="button" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Novo pilar
              </Button>
            ) : undefined
          }
        />
      )}

      <ul className="space-y-3">
        {activePillars.map((p, index) => (
          <li
            key={p.id}
            className="flex gap-3 rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <span
              className="mt-1 h-4 w-4 shrink-0 rounded-full ring-2 ring-background"
              style={{ backgroundColor: p.cor }}
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{p.titulo}</p>
              {p.objetivo && <p className="mt-1 text-sm text-muted-foreground">{p.objetivo}</p>}
              {p.explicacao && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">
                  {p.explicacao}
                </p>
              )}
            </div>
            {!readOnly && (
              <div className="flex shrink-0 flex-col gap-1">
                <Button type="button" variant="ghost" size="icon" onClick={() => move(index, -1)}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => move(index, 1)}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(p)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => archiveMut.mutate(p.id)}
                >
                  <Archive className="h-4 w-4" />
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {!readOnly && pillars.some((p) => !p.ativo) && (
        <p className="text-xs text-muted-foreground">
          Pilares arquivados não aparecem na lista ativa.
        </p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar pilar" : "Novo pilar editorial"}</DialogTitle>
            <DialogDescription>Estratégia de conteúdo vinculada aos cards.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.titulo.trim()) {
                toast.error("Título obrigatório.");
                return;
              }
              saveMut.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="p-titulo">Título *</Label>
              <Input
                id="p-titulo"
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-obj">Objetivo</Label>
              <Textarea
                id="p-obj"
                rows={2}
                value={form.objetivo}
                onChange={(e) => setForm((f) => ({ ...f, objetivo: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-exp">Explicação</Label>
              <Textarea
                id="p-exp"
                rows={3}
                value={form.explicacao}
                onChange={(e) => setForm((f) => ({ ...f, explicacao: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-cor">Cor</Label>
              <div className="flex items-center gap-2">
                <input
                  id="p-cor"
                  type="color"
                  value={form.cor}
                  onChange={(e) => setForm((f) => ({ ...f, cor: e.target.value }))}
                  className={cn("h-10 w-14 cursor-pointer rounded border border-border")}
                />
                <Input
                  value={form.cor}
                  onChange={(e) => setForm((f) => ({ ...f, cor: e.target.value }))}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <Button type="submit" disabled={saveMut.isPending}>
              {saveMut.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
