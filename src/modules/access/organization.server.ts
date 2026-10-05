import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isPlatformOwnerEmail } from "@/lib/platform-owner";
import { resolveIsAdmin } from "@/lib/owner-admin";
import {
  findCrossOrgNameClash,
  isManagerMemberRole,
  isOperationalMemberRole,
  pickWriteOrganization,
} from "./organization-role";

type AuthCtx = {
  supabase: SupabaseClient;
  userId: string;
  claims?: { email?: string | null };
};

export type CallerAccess = {
  userId: string;
  isPlatformOwner: boolean;
  isGlobalAdmin: boolean;
  /** Tabelas da 65 ainda não aplicadas. O portal atual continua no fluxo antigo. */
  orgTablesReady: boolean;
  roles: string[];
  organizationIds: string[];
  manageableOrganizationIds: string[];
  isOperational: boolean;
  /** Vazio quando seeAll. Caso contrário, só estes cadastros. */
  seeAllCadastros: boolean;
  cadastroIds: number[];
};

function missingOrgTable(message: string): boolean {
  return (
    /organization_members|organizations/i.test(message) &&
    /does not exist|schema cache|could not find/i.test(message)
  );
}

export async function loadCallerAccess(ctx: AuthCtx): Promise<CallerAccess> {
  const email = ctx.claims?.email ?? undefined;
  const isPlatformOwner = isPlatformOwnerEmail(email);
  const isGlobalAdmin =
    isPlatformOwner ||
    (await resolveIsAdmin({
      supabase: ctx.supabase,
      userId: ctx.userId,
      email,
      repair: false,
    }));

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", ctx.userId);

  if (error && missingOrgTable(error.message)) {
    return {
      userId: ctx.userId,
      isPlatformOwner,
      isGlobalAdmin,
      orgTablesReady: false,
      roles: [],
      organizationIds: [],
      manageableOrganizationIds: [],
      isOperational: isGlobalAdmin,
      seeAllCadastros: isGlobalAdmin,
      cadastroIds: [],
    };
  }
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as { organization_id: string; role: string }[];
  const roles = rows.map((row) => row.role);
  const organizationIds = [...new Set(rows.map((row) => row.organization_id))];
  const manageableOrganizationIds = rows
    .filter((row) => isManagerMemberRole(row.role))
    .map((row) => row.organization_id);
  const isOperational = isPlatformOwner || roles.some((role) => isOperationalMemberRole(role));

  let cadastroIds: number[] = [];
  if (!isPlatformOwner && organizationIds.length > 0) {
    const { data: clients, error: clientError } = await admin
      .from("cadastro_clientes")
      .select("id")
      .in("organization_id", organizationIds);
    if (clientError) throw new Error(clientError.message);
    cadastroIds = (clients ?? []).map((row) => Number((row as { id: number }).id));
  }

  return {
    userId: ctx.userId,
    isPlatformOwner,
    isGlobalAdmin,
    orgTablesReady: true,
    roles,
    organizationIds,
    manageableOrganizationIds,
    isOperational,
    seeAllCadastros: isPlatformOwner,
    cadastroIds,
  };
}

export function assertOperationalAccess(access: CallerAccess) {
  if (!access.isPlatformOwner && !access.isOperational && !access.isGlobalAdmin) {
    throw new Error("Forbidden");
  }
}

export function assertCadastroAllowed(access: CallerAccess, cadastroId: number) {
  if (!access.orgTablesReady && access.isGlobalAdmin) return;
  if (access.seeAllCadastros) return;
  if (!access.cadastroIds.includes(cadastroId)) throw new Error("Forbidden");
}

export async function assertConnectionAllowed(access: CallerAccess, connectionId: string) {
  if (!access.orgTablesReady && access.isGlobalAdmin) return;
  if (access.seeAllCadastros) return;
  const { data, error } = await getSupabaseAdmin()
    .from("ph_connections")
    .select("cadastro_id")
    .eq("id", connectionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const cadastroId = (data as { cadastro_id: number | null } | null)?.cadastro_id;
  if (cadastroId == null || !access.cadastroIds.includes(cadastroId)) {
    throw new Error("Forbidden");
  }
}

export async function resolveLotsOrganizationId(): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("organizations")
    .select("id")
    .eq("slug", "lots")
    .maybeSingle();
  if (error) {
    if (missingOrgTable(error.message)) return null;
    throw new Error(error.message);
  }
  return (data as { id: string } | null)?.id ?? null;
}

export async function assertNomeAvailable(nome: string, organizationId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("cadastro_clientes")
    .select("organization_id, nome_cliente")
    .ilike("nome_cliente", nome.trim());
  if (error) {
    if (
      /organization_id/i.test(error.message) &&
      /does not exist|schema cache/i.test(error.message)
    ) {
      return;
    }
    throw new Error(error.message);
  }
  const rows = (data ?? []) as { organization_id: string | null; nome_cliente: string | null }[];
  if (findCrossOrgNameClash(rows, nome, organizationId)) {
    throw new Error("Já existe um cliente com esse nome em outra organização.");
  }
}

export async function organizationIdForWrite(
  ctx: AuthCtx,
  requestedOrganizationId?: string | null,
): Promise<string | null> {
  const access = await loadCallerAccess(ctx);
  if (!access.orgTablesReady) return null;
  const lotsOrganizationId = access.isPlatformOwner ? await resolveLotsOrganizationId() : null;
  return pickWriteOrganization({
    isPlatformOwner: access.isPlatformOwner,
    manageableOrganizationIds: access.manageableOrganizationIds,
    requestedOrganizationId,
    lotsOrganizationId,
  });
}

export const checkIsOrgOperator = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const access = await loadCallerAccess(context);
    return {
      isOrgOperator: access.isOperational || access.isGlobalAdmin,
      isPlatformOwner: access.isPlatformOwner,
    };
  });

export const listOrganizations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const access = await loadCallerAccess(context);
    if (!access.isPlatformOwner) throw new Error("Forbidden");
    const { data, error } = await getSupabaseAdmin()
      .from("organizations")
      .select("id, name, slug, created_at")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().trim().min(2).max(120),
        slug: z
          .string()
          .trim()
          .min(2)
          .max(80)
          .regex(/^[a-z0-9-]+$/),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const access = await loadCallerAccess(context);
    if (!access.isPlatformOwner) throw new Error("Forbidden");
    const { data: row, error } = await getSupabaseAdmin()
      .from("organizations")
      .insert({ name: data.name, slug: data.slug })
      .select("id, name, slug")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
