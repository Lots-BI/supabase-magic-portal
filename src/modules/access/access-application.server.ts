import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLATFORM_OWNER_EMAIL } from "@/lib/platform-owner";
import { buildLotsBiMetadataPatch } from "@/features/access/lots-bi-metadata";
import { insertAppNotifications } from "@/modules/notifications/insert-app-notifications.server";
import {
  classifyDocument,
  normalizeWhatsapp,
  resolveAcquisitionGate,
  slugFromName,
  type ApplicationStatus,
} from "./brazil-document";
import { loadCallerAccess } from "./organization.server";

const registerSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
});

function passwordStrength(password: string): string | null {
  if (password.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "A senha precisa de letra e número.";
  }
  return null;
}

export const registerAccessAccount = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => registerSchema.parse(data))
  .handler(async ({ data }) => {
    const weak = passwordStrength(data.password);
    if (weak) throw new Error(weak);
    const admin = getSupabaseAdmin();
    const email = data.email.trim().toLowerCase();
    const now = new Date().toISOString();
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: buildLotsBiMetadataPatch({
        password_set_at: now,
        onboarding_completed_at: now,
      }),
    });
    if (error) {
      if (/already|registered|exists/i.test(error.message)) {
        throw new Error("Este e-mail já possui conta. Entre para continuar.");
      }
      throw new Error("Não foi possível criar a conta.");
    }
    const userId = created.user?.id;
    if (!userId) throw new Error("Não foi possível criar a conta.");
    const { error: accessError } = await admin.from("access_accounts").upsert({
      user_id: userId,
      lifecycle_status: "active",
    });
    if (accessError) throw new Error(accessError.message);
    return { ok: true as const };
  });

async function readApplication(userId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("organization_applications")
    .select("user_id, full_name, document_kind, document_digits, whatsapp_digits, email, status")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    if (
      /organization_applications/i.test(error.message) &&
      /does not exist|schema cache/i.test(error.message)
    ) {
      return null;
    }
    throw new Error(error.message);
  }
  return data as {
    status: ApplicationStatus;
    full_name: string;
    document_kind: string;
    document_digits: string;
    whatsapp_digits: string;
    email: string;
  } | null;
}

export async function loadAcquisitionGate(context: {
  supabase: Parameters<typeof loadCallerAccess>[0]["supabase"];
  userId: string;
  claims?: { email?: string | null };
}) {
  const access = await loadCallerAccess(context);
  const application = access.orgTablesReady ? await readApplication(context.userId) : null;
  let hasClientAccess = false;
  if (access.orgTablesReady) {
    const { count, error } = await getSupabaseAdmin()
      .from("client_access")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    hasClientAccess = (count ?? 0) > 0;
  }
  const gate = resolveAcquisitionGate({
    orgTablesReady: access.orgTablesReady,
    isPlatformOwner: access.isPlatformOwner,
    hasMembership: access.organizationIds.length > 0,
    hasClientAccess,
    applicationStatus: (application?.status ?? null) as ApplicationStatus,
  });
  return {
    gate,
    status: application?.status ?? null,
    email: context.claims?.email ?? "",
  };
}

export const getAcquisitionGate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => loadAcquisitionGate(context));

export const submitAccessApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        fullName: z.string().trim().min(5).max(160),
        document: z.string().trim().min(11).max(20),
        whatsapp: z.string().trim().min(10).max(20),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const access = await loadCallerAccess(context);
    if (!access.orgTablesReady) throw new Error("Pedidos de acesso ainda não estão disponíveis.");
    if (access.isPlatformOwner || access.organizationIds.length > 0) {
      throw new Error("Esta conta já tem acesso.");
    }
    const document = classifyDocument(data.document);
    if (!document) throw new Error("Informe um CPF ou CNPJ válido.");
    const whatsapp = normalizeWhatsapp(data.whatsapp);
    if (!whatsapp) throw new Error("Informe um WhatsApp com DDD.");
    const email = (context.claims?.email ?? "").trim().toLowerCase();
    if (!email) throw new Error("Conta sem e-mail.");

    const current = await readApplication(context.userId);
    if (current?.status === "pending") throw new Error("Seu pedido já está em análise.");
    if (current?.status === "approved") throw new Error("Seu acesso já foi aprovado.");

    const row = {
      user_id: context.userId,
      full_name: data.fullName,
      document_digits: document.digits,
      document_kind: document.kind,
      whatsapp_digits: whatsapp,
      email,
      status: "pending",
      reviewed_at: null,
      updated_at: new Date().toISOString(),
    };
    const admin = getSupabaseAdmin();
    const write = current
      ? admin.from("organization_applications").update(row).eq("user_id", context.userId)
      : admin.from("organization_applications").insert(row);
    const { error } = await write;
    if (error) throw new Error(error.message);

    const { data: owner } = await admin
      .from("profiles")
      .select("id")
      .ilike("email", PLATFORM_OWNER_EMAIL)
      .maybeSingle();
    const ownerId = (owner as { id?: string } | null)?.id;
    if (ownerId) {
      try {
        await insertAppNotifications(admin, [
          {
            userId: ownerId,
            kind: "usuario",
            title: "Novo pedido de acesso",
            body: data.fullName,
            href: "/admin/solicitacoes",
          },
        ]);
      } catch {
        // O pedido já foi gravado. A fila continua visível sem a notificação.
      }
    }
    return { ok: true as const };
  });

export const listAccessApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const access = await loadCallerAccess(context);
    if (!access.isPlatformOwner) throw new Error("Forbidden");
    const { data, error } = await getSupabaseAdmin()
      .from("organization_applications")
      .select(
        "user_id, full_name, document_kind, document_digits, whatsapp_digits, email, status, created_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const reviewAccessApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid(), decision: z.enum(["approve", "reject"]) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const access = await loadCallerAccess(context);
    if (!access.isPlatformOwner) throw new Error("Forbidden");
    const admin = getSupabaseAdmin();
    const { data: application, error } = await admin
      .from("organization_applications")
      .select("user_id, full_name, status")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!application) throw new Error("Pedido não encontrado.");
    const status = (application as { status: string }).status;
    if (data.decision === "reject") {
      if (status === "approved") throw new Error("Pedido já aprovado.");
      const { error: rejectError } = await admin
        .from("organization_applications")
        .update({ status: "rejected", reviewed_at: new Date().toISOString() })
        .eq("user_id", data.userId);
      if (rejectError) throw new Error(rejectError.message);
      return { ok: true as const };
    }

    const { data: existingMember } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", data.userId)
      .limit(1)
      .maybeSingle();
    if (existingMember) {
      const { error: markError } = await admin
        .from("organization_applications")
        .update({ status: "approved", reviewed_at: new Date().toISOString() })
        .eq("user_id", data.userId);
      if (markError) throw new Error(markError.message);
      return { ok: true as const };
    }

    const name = (application as { full_name: string }).full_name;
    let slug = slugFromName(name);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = attempt === 0 ? slug : `${slug}-${attempt + 1}`;
      const { data: existing } = await admin
        .from("organizations")
        .select("id")
        .eq("slug", candidate)
        .maybeSingle();
      if (!existing) {
        slug = candidate;
        break;
      }
    }
    const { data: org, error: orgError } = await admin
      .from("organizations")
      .insert({ name, slug })
      .select("id")
      .single();
    if (orgError) throw new Error(orgError.message);
    const organizationId = (org as { id: string }).id;
    const { error: memberError } = await admin.from("organization_members").insert({
      organization_id: organizationId,
      user_id: data.userId,
      role: "owner",
    });
    if (memberError && !/duplicate key/i.test(memberError.message))
      throw new Error(memberError.message);
    const { error: approveError } = await admin
      .from("organization_applications")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("user_id", data.userId);
    if (approveError) throw new Error(approveError.message);
    return { ok: true as const };
  });
