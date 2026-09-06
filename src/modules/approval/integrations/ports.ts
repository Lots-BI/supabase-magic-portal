import type { ContentCard } from "../types/content-card";

export type PublishTarget = "instagram" | "facebook" | "linkedin" | "tiktok" | "custom";

export type PublishRequest = {
  cardId: string;
  target: PublishTarget;
  scheduledAt?: string;
};

export type PublishResult = {
  externalId: string;
  publishedAt: string;
  url?: string;
};

export interface ContentPublisherPort {
  publishNow(cardId: string): Promise<PublishResult>;
  schedule(cardId: string, scheduledAt: string): Promise<void>;
  cancel(cardId: string): Promise<void>;
  getStatus(
    cardId: string,
  ): Promise<{ publish_status: string; externalId?: string; error?: string }>;
}

export type WorkflowAutomationTrigger =
  | "card_moved"
  | "approval_requested"
  | "approved"
  | "rejected"
  | "published";

export type WorkflowAutomationPayload = {
  card: ContentCard;
  trigger: WorkflowAutomationTrigger;
  metadata?: Record<string, unknown>;
};

export interface WorkflowAutomationPort {
  emit(payload: WorkflowAutomationPayload): Promise<void>;
}
