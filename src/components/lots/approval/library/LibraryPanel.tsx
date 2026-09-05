import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Grid3X3, List, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildPillarMap } from "@/modules/approval/services/group-cards-by-date";
import { listEditorialPillars } from "@/modules/approval/cards/cards.server";
import { listClientEditorialPillars } from "@/modules/approval/planning/client-planning.server";
import { searchLibraryFn, archiveLibraryItemFn } from "@/modules/approval/library/library.server";
import { searchClientLibraryFn } from "@/modules/approval/library/client-library.server";
import {
  searchScopedLibraryFn,
  listScopedEditorialPillarsFn,
} from "@/modules/client/scoped-portal.functions";
import { useOptionalClientScope } from "@/modules/client/context";
import type { LibraryStatusFilter } from "@/modules/approval/library/types/library";
import { LibraryCardTile } from "./LibraryCardTile";
import { LibraryDetailDrawer } from "./LibraryDetailDrawer";
import {
  getLibraryViewPreference,
  setLibraryViewPreference,
  type LibraryViewMode,
} from "./library-view-preference";
import { ApprovalPanelSkeleton } from "../shared/ApprovalPanelSkeleton";
import { ApprovalEmptyState } from "../shared/ApprovalEmptyState";
import { BookOpen } from "lucide-react";

const PAGE_SIZE = 24;

export function LibraryPanel({
  cadastroClienteId,
  readOnly = false,
  clientMode = false,
}: {
  cadastroClienteId?: number;
  readOnly?: boolean;
  clientMode?: boolean;
}) {
  const qc = useQueryClient();
  const staffSearchFn = useServerFn(searchLibraryFn);
  const clientSearchFn = useServerFn(searchClientLibraryFn);
  const scopedSearchFn = useServerFn(searchScopedLibraryFn);
  const archiveFn = useServerFn(archiveLibraryItemFn);
  const pillarsFn = useServerFn(listEditorialPillars);
  const clientPillarsFn = useServerFn(listClientEditorialPillars);
  const scopedPillarsFn = useServerFn(listScopedEditorialPillarsFn);
  const portalScope = useOptionalClientScope();

  const [viewMode, setViewMode] = useState<LibraryViewMode>("grid");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [status, setStatus] = useState<LibraryStatusFilter>("all");
  const [plataforma, setPlataforma] = useState("");
  const [formato, setFormato] = useState("");
  const [pilarId, setPilarId] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    setViewMode(getLibraryViewPreference());
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(0);
  }, [debouncedQ, status, plataforma, formato, pilarId, year, month, cadastroClienteId]);

  const scopeKey = portalScope?.scopeQueryKey ?? (clientMode ? "client" : cadastroClienteId);

  const searchQ = useQuery({
    queryKey: [
      "approval",
      "library",
      scopeKey,
      debouncedQ,
      status,
      plataforma,
      formato,
      pilarId,
      year,
      month,
      page,
    ],
    queryFn: () => {
      const payload = {
        q: debouncedQ || undefined,
        cadastro_cliente_id: clientMode && !portalScope ? undefined : cadastroClienteId,
        status,
        plataforma: plataforma || undefined,
        formato: formato || undefined,
        pilar_id: pilarId || undefined,
        year: year ? Number(year) : undefined,
        month: month ? Number(month) : undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      };
      if (portalScope) {
        const { cadastro_cliente_id: _c, ...rest } = payload;
        return scopedSearchFn({ data: { scope: portalScope.scopeInput, ...rest } });
      }
      return clientMode ? clientSearchFn({ data: payload }) : staffSearchFn({ data: payload });
    },
    enabled: !!portalScope || clientMode || !!cadastroClienteId,
  });

  const pillarsQ = useQuery({
    queryKey: ["editorial-pillars", cadastroClienteId],
    queryFn: () =>
      pillarsFn({
        data: { cadastro_cliente_id: cadastroClienteId!, include_archived: false },
      }),
    enabled: !clientMode && !portalScope && !!cadastroClienteId,
  });

  const clientPillarsQ = useQuery({
    queryKey: ["editorial-pillars", scopeKey],
    queryFn: () => {
      if (portalScope) {
        return scopedPillarsFn({ data: { scope: portalScope.scopeInput } });
      }
      return clientPillarsFn();
    },
    enabled: !!portalScope || clientMode,
  });

  const pillarMap = useMemo(
    () =>
      buildPillarMap(
        portalScope || clientMode ? (clientPillarsQ.data ?? []) : (pillarsQ.data ?? []),
      ),
    [portalScope, clientMode, clientPillarsQ.data, pillarsQ.data],
  );

  const total = searchQ.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const archiveMut = useMutation({
    mutationFn: (id: string) => archiveFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Conteúdo arquivado na Biblioteca.");
      qc.invalidateQueries({ queryKey: ["approval", "library"] });
      setOpenId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeView = (mode: LibraryViewMode) => {
    setViewMode(mode);
    setLibraryViewPreference(mode);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1 space-y-2">
          <Label htmlFor="lib-q">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="lib-q"
              className="pl-9"
              placeholder="Título ou cliente…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        <FilterSelect
          label="Status"
          value={status}
          onChange={(v) => setStatus(v as LibraryStatusFilter)}
          options={[
            { value: "all", label: "Todos" },
            { value: "publicado", label: "Publicado" },
            { value: "arquivado", label: "Arquivado" },
          ]}
        />
        <FilterSelect
          label="Rede"
          value={plataforma}
          onChange={setPlataforma}
          options={[
            { value: "", label: "Todas" },
            { value: "instagram", label: "Instagram" },
            { value: "facebook", label: "Facebook" },
            { value: "tiktok", label: "TikTok" },
            { value: "linkedin", label: "LinkedIn" },
          ]}
        />
        {!clientMode && (
          <FilterSelect
            label="Pilar"
            value={pilarId}
            onChange={setPilarId}
            options={[
              { value: "", label: "Todos" },
              ...(pillarsQ.data ?? []).map((p) => ({ value: p.id, label: p.titulo })),
            ]}
          />
        )}
        <div className="space-y-2">
          <Label>Ano</Label>
          <Input
            className="w-24"
            placeholder="2026"
            value={year}
            onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
          />
        </div>
        <div className="space-y-2">
          <Label>Mês</Label>
          <Input
            className="w-16"
            placeholder="7"
            value={month}
            onChange={(e) => setMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
          />
        </div>
        <div className="flex gap-1 pb-0.5">
          <Button
            type="button"
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => changeView("grid")}
            aria-label="Grade"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => changeView("list")}
            aria-label="Lista"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {searchQ.isLoading && <ApprovalPanelSkeleton rows={6} />}

      {searchQ.isError && (
        <p className="text-sm text-destructive">Não foi possível carregar a biblioteca.</p>
      )}

      {searchQ.data && searchQ.data.items.length === 0 && (
        <ApprovalEmptyState
          icon={BookOpen}
          title="Biblioteca vazia"
          description="Nenhum conteúdo publicado encontrado com os filtros atuais."
        />
      )}

      {searchQ.data && searchQ.data.items.length > 0 && viewMode === "grid" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {searchQ.data.items.map((card) => (
            <LibraryCardTile
              key={card.id}
              card={card}
              pillar={card.pilar_id ? pillarMap[card.pilar_id] : null}
              layout="grid"
              onOpen={() => setOpenId(card.id)}
            />
          ))}
        </div>
      )}

      {searchQ.data && searchQ.data.items.length > 0 && viewMode === "list" && (
        <div className="space-y-2">
          {searchQ.data.items.map((card) => (
            <LibraryCardTile
              key={card.id}
              card={card}
              pillar={card.pilar_id ? pillarMap[card.pilar_id] : null}
              layout="list"
              onOpen={() => setOpenId(card.id)}
            />
          ))}
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {total} conteúdo(s) · página {page + 1} de {totalPages}
          </p>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {openId && (
        <LibraryDetailDrawer
          itemId={openId}
          readOnly={readOnly}
          clientMode={clientMode}
          onClose={() => setOpenId(null)}
          onArchive={!readOnly ? () => archiveMut.mutate(openId) : undefined}
        />
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value || "__all__"} onValueChange={(v) => onChange(v === "__all__" ? "" : v)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value || "__all__"} value={o.value || "__all__"}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
