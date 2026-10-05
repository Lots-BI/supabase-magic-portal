import { useEffect, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  activeFilterChips,
  clearFilterChip,
  CRM_ACTION_OPTIONS,
  CRM_CHANNEL_OPTIONS,
  CRM_CHURN_OPTIONS,
  CRM_CONTACT_OPTIONS,
  CRM_HEAT_OPTIONS,
  CRM_POSTS_OPTIONS,
  CRM_RECENCY_OPTIONS,
  CRM_SORT_OPTIONS,
  CRM_VIP_OPTIONS,
  CRM_VOLUME_OPTIONS,
  type CrmPeopleFilters,
} from "@/modules/crm/people-filters";

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="min-w-0 space-y-1">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 text-xs" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function FilterGrid({
  filters,
  onFiltersChange,
  owners,
  places,
  pillars,
}: {
  filters: CrmPeopleFilters;
  onFiltersChange: (filters: CrmPeopleFilters) => void;
  owners: { value: string; label: string }[];
  places: { value: string; label: string }[];
  pillars: { value: string; label: string }[];
}) {
  const set = (patch: Partial<CrmPeopleFilters>) => onFiltersChange({ ...filters, ...patch });
  const ownerOptions = [
    { value: "all", label: "Qualquer dono" },
    { value: "unassigned", label: "Sem dono" },
    ...owners,
  ];
  const placeSelectOptions = [{ value: "all", label: "Onde quer que tenha falado" }, ...places];
  const pillarSelectOptions = [{ value: "all", label: "Qualquer pilar" }, ...pillars];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <FilterSelect
        label="Canal"
        value={filters.channel}
        options={CRM_CHANNEL_OPTIONS}
        onChange={(channel) => set({ channel })}
      />
      <FilterSelect
        label="Situação"
        value={filters.churn}
        options={CRM_CHURN_OPTIONS}
        onChange={(churn) => set({ churn })}
      />
      <FilterSelect
        label="Calor"
        value={filters.heat}
        options={CRM_HEAT_OPTIONS}
        onChange={(heat) => set({ heat: heat as CrmPeopleFilters["heat"] })}
      />
      <FilterSelect
        label="Contato"
        value={filters.contact}
        options={CRM_CONTACT_OPTIONS}
        onChange={(contact) => set({ contact: contact as CrmPeopleFilters["contact"] })}
      />
      <FilterSelect
        label="VIP"
        value={filters.vip}
        options={CRM_VIP_OPTIONS}
        onChange={(vip) => set({ vip: vip as CrmPeopleFilters["vip"] })}
      />
      <FilterSelect
        label="Dono"
        value={
          ownerOptions.some((option) => option.value === filters.owner) ? filters.owner : "all"
        }
        options={ownerOptions}
        onChange={(owner) => set({ owner })}
      />
      <FilterSelect
        label="Onde falou"
        value={
          placeSelectOptions.some((option) => option.value === filters.place)
            ? filters.place
            : "all"
        }
        options={placeSelectOptions}
        onChange={(place) => set({ place })}
      />
      {pillars.length > 0 ? (
        <FilterSelect
          label="Pilar"
          value={
            pillarSelectOptions.some((option) => option.value === filters.pillar)
              ? filters.pillar
              : "all"
          }
          options={pillarSelectOptions}
          onChange={(pillar) => set({ pillar })}
        />
      ) : null}
      <FilterSelect
        label="Interações"
        value={filters.volume}
        options={CRM_VOLUME_OPTIONS}
        onChange={(volume) => set({ volume: volume as CrmPeopleFilters["volume"] })}
      />
      <FilterSelect
        label="Publicações"
        value={filters.posts}
        options={CRM_POSTS_OPTIONS}
        onChange={(posts) => set({ posts: posts as CrmPeopleFilters["posts"] })}
      />
      <FilterSelect
        label="Último contato"
        value={filters.recency}
        options={CRM_RECENCY_OPTIONS}
        onChange={(recency) => set({ recency: recency as CrmPeopleFilters["recency"] })}
      />
      <FilterSelect
        label="Próxima ação"
        value={filters.action}
        options={CRM_ACTION_OPTIONS}
        onChange={(action) => set({ action })}
      />
      <FilterSelect
        label="Ordenar"
        value={filters.sort}
        options={CRM_SORT_OPTIONS}
        onChange={(sort) => set({ sort: sort as CrmPeopleFilters["sort"] })}
      />
    </div>
  );
}

export function CrmPeopleToolbar({
  query,
  onQueryChange,
  filters,
  onFiltersChange,
  owners,
  places,
  pillars,
  shown,
  total,
  onClear,
  filtersActive,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  filters: CrmPeopleFilters;
  onFiltersChange: (filters: CrmPeopleFilters) => void;
  owners: { value: string; label: string }[];
  places: { value: string; label: string }[];
  pillars: { value: string; label: string }[];
  shown: number;
  total: number;
  onClear: () => void;
  filtersActive: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const apply = () => setNarrow(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  const chips = activeFilterChips(filters, { owners, places, pillars });
  const showClear = filtersActive || query.trim().length > 0;

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-2.5 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar nome ou @"
            className="h-11 pl-8"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-11 sm:hidden"
          onClick={() => setOpen(true)}
        >
          <SlidersHorizontal className="mr-1.5 h-4 w-4" />
          Filtrar
          {chips.length > 0 ? ` (${chips.length})` : ""}
        </Button>
        <Button
          type="button"
          variant={open ? "secondary" : "outline"}
          className="hidden h-11 sm:inline-flex"
          onClick={() => setOpen((value) => !value)}
        >
          <SlidersHorizontal className="mr-1.5 h-4 w-4" />
          Filtrar
          {chips.length > 0 ? ` (${chips.length})` : ""}
        </Button>
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="inline-flex h-9 items-center gap-1 rounded-full border border-border bg-muted/50 px-3 text-xs"
              onClick={() => onFiltersChange(clearFilterChip(filters, chip.key))}
            >
              {chip.label}
              <X className="h-3.5 w-3.5" />
              <span className="sr-only">Remover {chip.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      {open && !narrow ? (
        <div className="hidden rounded-lg border border-border p-3 sm:block">
          <FilterGrid
            filters={filters}
            onFiltersChange={onFiltersChange}
            owners={owners}
            places={places}
            pillars={pillars}
          />
        </div>
      ) : null}

      <Sheet open={open && narrow} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[100dvh] overflow-y-auto sm:hidden">
          <SheetHeader>
            <SheetTitle>Filtrar pessoas</SheetTitle>
          </SheetHeader>
          <div className="mt-4 pb-8">
            <FilterGrid
              filters={filters}
              onFiltersChange={onFiltersChange}
              owners={owners}
              places={places}
              pillars={pillars}
            />
            <Button type="button" className="mt-4 h-11 w-full" onClick={() => setOpen(false)}>
              Ver {shown} {shown === 1 ? "pessoa" : "pessoas"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {shown} de {total} {total === 1 ? "pessoa" : "pessoas"}
        </p>
        {showClear ? (
          <Button type="button" size="sm" variant="ghost" className="h-11" onClick={onClear}>
            Limpar filtros
          </Button>
        ) : null}
      </div>
    </div>
  );
}
