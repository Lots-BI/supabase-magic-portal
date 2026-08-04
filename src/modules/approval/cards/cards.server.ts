import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  assertStaffAccess,
  resolveApprovalRole,
  getActorEmail,
  isStaffMember,
} from "../internal/staff-auth.server";
import { getKanbanBoardForClient, getCardDetail } from "../internal/card-query.server";
import {
  createContentCard,
  updateContentCard,
  moveContentCard,
  archiveContentCard,
  duplicateContentCard,
  addCardComment,
} from "../internal/card-lifecycle.server";
import {
  uploadCardAttachment,
  deleteCardAttachment,
  listCardAttachmentsWithUrls,
} from "../internal/attachment-lifecycle.server";
import { publishContentCardToMetaFacebook } from "../internal/publish-meta.server";
import { deleteContentCard } from "../internal/library-lifecycle.server";
import { editorialPillarRepository } from "../repositories/editorial-pillar.repository.server";
import { CONTENT_CARD_STATUSES } from "../types/content-card";
import {
  contentCardCreateSchema,
  contentCardUpdateSchema,
  contentCardMoveSchema,
} from "../validators/content-card";
import { contentCardCommentSchema } from "../validators/content-card-event";

async function actorFromContext(context: {
  supabase: Parameters<typeof assertStaffAccess>[0]["supabase"];
  userId: string;
  claims?: { email?: string | null };
}) {
  await assertStaffAccess(context);
  const role = await resolveApprovalRole(context);
  const email = await getActorEmail(context);
  return { userId: context.userId, email, role };
}

export const checkIsStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isStaff = await isStaffMember(context);
    return { isStaff };
  });

export const getKanbanBoard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ cadastro_cliente_id: z.number().int().positive() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaffAccess(context);
    return getKanbanBoardForClient(context.supabase, data.cadastro_cliente_id);
  });

export const getContentCard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaffAccess(context);
    const detail = await getCardDetail(context.supabase, data.id);
    if (!detail) throw new Error("Card não encontrado");
    return detail;
  });

export const listEditorialPillars = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cadastro_cliente_id: z.number().int().positive(),
        include_archived: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaffAccess(context);
    return editorialPillarRepository.listByClient(
      context.supabase,
      data.cadastro_cliente_id,
      !data.include_archived,
    );
  });

export const createCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    contentCardCreateSchema
      .extend({
        cliente_nome: z.string().trim().min(1).max(200),
        localizacao: z.string().trim().max(500).optional().nullable(),
        tags: z.array(z.string()).optional().nullable(),
        observacoes: z.string().trim().max(5000).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const actor = await actorFromContext(context);
    return createContentCard(context.supabase, actor, data);
  });

export const updateCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid() }).merge(contentCardUpdateSchema.partial()).parse(d),
  )
  .handler(async ({ data, context }) => {
    const actor = await actorFromContext(context);
    const { id, ...patch } = data;
    return updateContentCard(context.supabase, actor, id, patch);
  });

export const moveCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => contentCardMoveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const actor = await actorFromContext(context);
    return moveContentCard(context.supabase, actor, data);
  });

export const archiveCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const actor = await actorFromContext(context);
    return archiveContentCard(context.supabase, actor, data.id);
  });

export const deleteCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const actor = await actorFromContext(context);
    await deleteContentCard(context.supabase, actor, data.id);
    return { ok: true };
  });

export const duplicateCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const actor = await actorFromContext(context);
    return duplicateContentCard(context.supabase, actor, data.id);
  });

export const commentCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => contentCardCommentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const actor = await actorFromContext(context);
    await addCardComment(context.supabase, actor, data);
    return { ok: true };
  });

export const uploadCardMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cardId: z.string().uuid(),
        fileName: z.string().trim().min(1).max(200),
        mimeType: z.string().trim().min(3).max(100),
        base64: z.string().min(1),
        ordem: z.number().int().min(0).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const actor = await actorFromContext(context);
    return uploadCardAttachment(context.supabase, actor, data);
  });

export const deleteCardMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ cardId: z.string().uuid(), attachmentId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const actor = await actorFromContext(context);
    return deleteCardAttachment(context.supabase, actor, data);
  });

export const listCardMedia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ cardId: z.string().uuid(), capaUrl: z.string().nullable().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaffAccess(context);
    const media = await listCardAttachmentsWithUrls(
      context.supabase,
      data.cardId,
      data.capaUrl ?? null,
    );
    return { media };
  });

export const listAllowedStatuses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaffAccess(context);
    return { statuses: CONTENT_CARD_STATUSES };
  });

/** Marco 4 — publica foto na Facebook Page via Graph e move para `publicado`. */
export const publishCardToMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        target: z.enum(["facebook", "instagram"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const actor = await actorFromContext(context);
    return publishContentCardToMetaFacebook(context.supabase, actor, {
      cardId: data.id,
      target: data.target ?? "facebook",
    });
  });
