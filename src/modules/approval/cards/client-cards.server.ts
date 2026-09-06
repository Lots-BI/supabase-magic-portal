import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  assertClientPortalAccess,
  resolveClientPortalRole,
} from "../internal/client-access.server";
import { getClientKanbanBoard, getClientCardDetail } from "../internal/client-query.server";
import {
  clientApproveCard,
  clientCommentCard,
  clientRequestChanges,
  clientSubmitMaterial,
} from "../internal/client-lifecycle.server";
import {
  listCardAttachmentsWithUrls,
  uploadCardAttachment,
  createDirectUploadTicket,
  confirmDirectUpload,
} from "../internal/attachment-lifecycle.server";
import { refreshCardChecklist } from "../internal/card-lifecycle.server";
import { getActorEmail } from "../internal/staff-auth.server";
import { contentCardCommentSchema } from "../validators/content-card-event";
import { MEDIA_ROLES } from "../types/content-card-attachment";

async function clientActor(context: {
  supabase: Parameters<typeof assertClientPortalAccess>[0]["supabase"];
  userId: string;
  claims?: { email?: string | null };
}) {
  const scope = await assertClientPortalAccess(context);
  const email = await getActorEmail(context);
  return {
    userId: context.userId,
    email,
    role: "cliente" as const,
    scope,
  };
}

export const checkClientPortalAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const role = await resolveClientPortalRole(context);
    return { role };
  });

export const getClientKanbanBoardFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { scope } = await clientActor(context);
    return getClientKanbanBoard(context.supabase, scope);
  });

export const getClientContentCard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { scope } = await clientActor(context);
    const detail = await getClientCardDetail(context.supabase, data.id, scope);
    if (!detail) throw new Error("Card não encontrado");
    return detail;
  });

export const clientCommentCardFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => contentCardCommentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const actor = await clientActor(context);
    await clientCommentCard(context.supabase, actor, data);
    return { ok: true };
  });

export const clientApproveCardFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        card_id: z.string().uuid(),
        mensagem: z.string().trim().max(2000).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const actor = await clientActor(context);
    await clientApproveCard(context.supabase, actor, data);
    return { ok: true };
  });

export const clientRequestChangesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => contentCardCommentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const actor = await clientActor(context);
    await clientRequestChanges(context.supabase, actor, data);
    return { ok: true };
  });

export const clientSubmitMaterialFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ card_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const actor = await clientActor(context);
    await clientSubmitMaterial(context.supabase, actor, data);
    return { ok: true };
  });

export const createClientMaterialUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cardId: z.string().uuid(),
        fileName: z.string().trim().min(1).max(200),
        mimeType: z.string().trim().max(120).default(""),
        fileSize: z.number().int().positive(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const actor = await clientActor(context);
    return createDirectUploadTicket(context.supabase, actor, {
      ...data,
      mediaRole: "cliente_material",
    });
  });

export const confirmClientMaterialUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cardId: z.string().uuid(),
        path: z.string().min(8).max(500),
        fileName: z.string().trim().min(1).max(200),
        mimeType: z.string().trim().max(120).default(""),
        fileSize: z.number().int().positive(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const actor = await clientActor(context);
    const result = await confirmDirectUpload(context.supabase, actor, {
      ...data,
      mediaRole: "cliente_material",
    });
    await refreshCardChecklist(context.supabase, data.cardId);
    return result;
  });

export const clientUploadMaterialFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cardId: z.string().uuid(),
        fileName: z.string().trim().min(1).max(200),
        mimeType: z.string().trim().min(3).max(100),
        base64: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const actor = await clientActor(context);
    const result = await uploadCardAttachment(context.supabase, actor, {
      ...data,
      mediaRole: "cliente_material",
    });
    await refreshCardChecklist(context.supabase, data.cardId);
    return result;
  });

export const listClientCardMedia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ cardId: z.string().uuid(), capaUrl: z.string().nullable().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { scope } = await clientActor(context);
    const card = await getClientCardDetail(context.supabase, data.cardId, scope);
    if (!card) throw new Error("Card não encontrado");
    const media = await listCardAttachmentsWithUrls(
      context.supabase,
      data.cardId,
      data.capaUrl ?? card.card.capa_url,
    );
    return { media };
  });

void MEDIA_ROLES;
