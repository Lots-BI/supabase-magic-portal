import { z } from "zod";
import { CONTENT_CARD_EVENT_TYPES } from "../types/content-card-event";

export const contentCardEventAppendSchema = z.object({
  card_id: z.string().uuid(),
  event_type: z.enum(CONTENT_CARD_EVENT_TYPES),
  payload: z.record(z.unknown()).default({}),
  actor_email: z.string().email().optional().nullable(),
});

export const contentCardCommentSchema = z.object({
  card_id: z.string().uuid(),
  mensagem: z.string().trim().min(1).max(2000),
});

export const contentCardRequestChangesSchema = z.object({
  card_id: z.string().uuid(),
  mensagem: z.string().trim().max(2000).optional().default(""),
  roteiro: z.string().max(80_000).optional().nullable(),
});
