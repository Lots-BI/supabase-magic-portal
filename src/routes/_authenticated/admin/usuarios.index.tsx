import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ShieldCheck,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/lots/PageHeader";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/lots/StatCard";
import { TextInput } from "@/components/lots/FormField";
import {
  LifecycleStatusBadge,
  lifecycleStatusLabel,
} from "@/features/access/components/LifecycleStatusBadge";
import type { AccessLifecycleStatus, UserAccessProfile } from "@/features/access/types";
import { listUserAccessProfiles } from "@/lib/access.functions.server";
import { adminTitle } from "@/lib/brand";

const LIFECYCLE_FILTERS: { key: "all" | AccessLifecycleStatus; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "invite_pending", label: "Convite pendente" },
  { key: "awaiting_password", label: "Aguardando senha" },
  { key: "active", label: "Ativos" },
  { key: "revoked", label: "Revogados" },
  { key: "disabled", label: "Desativados" },
];

function usersQuery(page: number) {
  return {
    queryKey: ["admin", "access-profiles", page],
    queryFn: () => listUserAccessProfiles({ data: { page, per_page: 50 } }),
  };
}

export const Route = createFileRoute("/_authenticated/admin/usuarios/")({
  head: () => ({ meta: [{ title: adminTitle("Usuários") }] }),
  loader: ({ context }) => {
    const page = 1;
    return (
      context as { queryClient: { ensureQueryData: (q: ReturnType<typeof usersQuery>) => unknown } }
    ).queryClient.ensureQueryData(usersQuery(page));
  },
  component: UsuariosPage,
  errorComponent: ({ error }) => (
    <div className="lots-surface p-4 text-sm text-destructive">Erro: {error.message}</div>
  ),
});

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

function UsuariosPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [lifecycleFilter, setLifecycleFilter] = useState<"all" | AccessLifecycleStatus>("all");
  const queryClient = useQueryClient();
  const listFn = useServerFn(listUserAccessProfiles);
  const { data } = useSuspenseQuery({
    queryKey: ["admin", "access-profiles", page],
    queryFn: () => listFn({ data: { page, per_page: 50 } }),
  });

  const profiles = (data?.profiles ?? []) as UserAccessProfile[];
  const total = data?.total ?? profiles.length;

  const filtered = profiles.filter((p) => {
    if (lifecycleFilter !== "all" && p.effective_status !== lifecycleFilter) return false;
    if (search && !p.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: profiles.length,
    active: profiles.filter((p) => p.effective_status === "active").length,
    pending: profiles.filter((p) => p.effective_status === "invite_pending").length,
    admin: profiles.filter((p) => p.tipo === "admin").length,
  };

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ["admin", "access-profiles"] });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operações"
        title="Usuários"
        description="Gestão de acessos v2.1 — lifecycle, diagnóstico e recovery mode por usuário."
        actions={
          <Button asChild>
            <Link to="/admin/usuarios/novo" className="inline-flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5" /> Novo usuário
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Nesta página" value={String(profiles.length)} icon={Users} />
        <StatCard label="Ativos" value={String(counts.active)} icon={ShieldCheck} />
        <StatCard label="Convite pendente" value={String(counts.pending)} icon={User} />
        <StatCard label="Admins" value={String(counts.admin)} icon={ShieldCheck} />
      </div>

      <div className="lots-surface overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <TextInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por email…"
              className="pl-9"
            />
          </div>
          <div className="flex shrink-0 flex-wrap gap-1">
            {LIFECYCLE_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setLifecycleFilter(f.key)}
                className={
                  "rounded-md px-2 py-1 text-[11px] font-medium transition-colors " +
                  (lifecycleFilter === f.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground")
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="lots-table-scroll">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="text-left text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="lots-table-head-sticky px-4 py-2.5 font-medium">Usuário</th>
                <th className="lots-table-head-sticky px-4 py-2.5 font-medium">Perfil</th>
                <th className="lots-table-head-sticky px-4 py-2.5 font-medium">Lifecycle</th>
                <th className="lots-table-head-sticky px-4 py-2.5 font-medium">Clientes</th>
                <th className="lots-table-head-sticky px-4 py-2.5 font-medium">Último login</th>
                <th className="lots-table-head-sticky px-4 py-2.5 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
              {filtered.map((u) => (
                <tr key={u.id} className="border-t border-border hover:bg-muted/45">
                  <td className="px-4 py-3">
                    <p className="text-[13px] font-medium">{u.email}</p>
                    <p className="font-mono text-[10.5px] text-muted-foreground">
                      {u.id.slice(0, 8)}…
                    </p>
                  </td>
                  <td className="px-4 py-3 text-[12px] capitalize">{u.tipo}</td>
                  <td className="px-4 py-3">
                    <LifecycleStatusBadge status={u.effective_status} />
                    {u.lifecycle_status !== u.effective_status && (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        DB: {lifecycleStatusLabel(u.lifecycle_status)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">
                    {u.clientes.length ? u.clientes.join(", ") : "—"}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">
                    {fmtDate(u.last_sign_in_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to="/admin/usuarios/$userId"
                      params={{ userId: u.id }}
                      className="text-[12px] font-medium text-primary hover:underline"
                      onClick={() => invalidate()}
                    >
                      Gerenciar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-[12px] text-muted-foreground">
            Página {page} · ~{total} usuários no Auth
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="lots-focus inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Anterior
            </button>
            <button
              type="button"
              disabled={profiles.length < 50}
              onClick={() => setPage((p) => p + 1)}
              className="lots-focus inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs disabled:opacity-40"
            >
              Próxima <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
