import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isPlatformOwnerEmail } from "@/lib/platform-owner";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveBlockedRedirect } from "@/modules/access/services/resolve-blocked-redirect";
import { resolvePostAuthDestination } from "@/modules/access/services/resolve-post-auth-destination";
import {
  buildProfileForUserId,
  fetchAuditForUser,
  recordAccessAuditEntry,
  upsertLifecycle,
} from "@/modules/access/internal/access-db.server";

export const postAuthOnCallbackCompleted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ flow: z.enum(["invite", "recovery", "login"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.flow === "invite") {
      const auditRows = await fetchAuditForUser(context.userId, 100);
      const alreadyAccepted = auditRows.some((r) => r.action === "invite_accepted");
      if (!alreadyAccepted) {
        await recordAccessAuditEntry({
          user_id: context.userId,
          actor_id: context.userId,
          action: "invite_accepted",
        });
      }
    }
    return { ok: true as const };
  });

export const postAuthOnInvitePasswordSet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.getUserById(context.userId);
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Usuário não encontrado.");

    const { buildLotsBiMetadataPatch } = await import("@/features/access/lots-bi-metadata");
    const now = new Date().toISOString();
    const patch = buildLotsBiMetadataPatch(
      { password_set_at: now, onboarding_completed_at: now },
      data.user.user_metadata,
    );
    const { error: updateError } = await admin.auth.admin.updateUserById(context.userId, {
      user_metadata: patch,
    });
    if (updateError) throw new Error(updateError.message);

    await upsertLifecycle(context.userId, "awaiting_password");
    await recordAccessAuditEntry({
      user_id: context.userId,
      actor_id: context.userId,
      action: "password_changed",
      detail: "Senha inicial definida via convite",
    });
    return { ok: true as const };
  });

export const postAuthOnRecoveryCompleted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await recordAccessAuditEntry({
      user_id: context.userId,
      actor_id: context.userId,
      action: "password_reset_completed",
    });
    await recordAccessAuditEntry({
      user_id: context.userId,
      actor_id: context.userId,
      action: "password_changed",
      detail: "Senha redefinida via recovery",
    });
    return { ok: true as const };
  });

export const postAuthOnPasswordChangedByUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.getUserById(context.userId);
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Usuário não encontrado.");

    const { buildLotsBiMetadataPatch } = await import("@/features/access/lots-bi-metadata");
    const now = new Date().toISOString();
    const patch = buildLotsBiMetadataPatch({ password_set_at: now }, data.user.user_metadata);
    const { error: updateError } = await admin.auth.admin.updateUserById(context.userId, {
      user_metadata: patch,
    });
    if (updateError) throw new Error(updateError.message);

    await recordAccessAuditEntry({
      user_id: context.userId,
      actor_id: context.userId,
      action: "password_changed",
      detail: "Senha alterada pelo usuário",
    });
    return { ok: true as const };
  });

export const postAuthOnLoginSuccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ redirect: z.string().optional() }).optional().parse(d))
  .handler(async ({ data, context }) => {
    const email = context.claims?.email ?? undefined;
    const owner = isPlatformOwnerEmail(email);
    let profile;
    try {
      profile = await buildProfileForUserId(context.userId);
    } catch {
      if (owner) return { ok: true as const, path: "/admin" };
      return {
        ok: false as const,
        blocked: {
          to: "/auth",
          search: {
            view: "link-error",
            error: "Não foi possível validar seu acesso. Tente novamente.",
          },
          signOut: true,
        },
      };
    }

    const onboardingComplete =
      Boolean(profile.password_set_at) && Boolean(profile.onboarding_completed_at);
    if (profile.lifecycle_status === "awaiting_password" && onboardingComplete) {
      await upsertLifecycle(context.userId, "active");
      await recordAccessAuditEntry({
        user_id: context.userId,
        actor_id: context.userId,
        action: "first_access_completed",
      });
      profile = await buildProfileForUserId(context.userId);
    }

    if (!profile.can_access_platform) {
      const blocked = resolveBlockedRedirect(profile.effective_status, true);
      return {
        ok: false as const,
        blocked,
      };
    }

    const { loadCallerAccess } = await import("@/modules/access/organization.server");
    const access = await loadCallerAccess({
      supabase: context.supabase,
      userId: context.userId,
      claims: context.claims,
    });
    if (!owner && !access.isPlatformOwner) {
      try {
        const { loadAcquisitionGate } = await import("@/modules/access/access-application.server");
        const acquisition = await loadAcquisitionGate({
          supabase: context.supabase,
          userId: context.userId,
          claims: context.claims,
        });
        if (acquisition.gate !== "allow") {
          return { ok: true as const, path: "/solicitar-acesso" };
        }
      } catch {
        return {
          ok: true as const,
          path: resolvePostAuthDestination(
            access.isOperational || access.isGlobalAdmin,
            data?.redirect,
          ),
        };
      }
    }
    const isOperational = access.isOperational || access.isGlobalAdmin || access.isPlatformOwner;
    return {
      ok: true as const,
      path: resolvePostAuthDestination(isOperational, data?.redirect),
    };
  });
