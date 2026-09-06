import type { ContentPublisherPort, PublishResult } from "./ports";
import { FEATURE_META_CONTENT_PUBLISH } from "@/lib/feature-flags";

/** Sem flag: agenda só no banco. Com flag, publishNow chama o Graph. */
export class NoopContentPublisher implements ContentPublisherPort {
  async publishNow(_cardId: string): Promise<PublishResult> {
    throw new Error(
      "missing_publish_scope: Conecte o Instagram com permissão de publicar em Conexões.",
    );
  }
  async schedule(_cardId: string, _scheduledAt: string): Promise<void> {
    return;
  }
  async cancel(_cardId: string): Promise<void> {
    return;
  }
  async getStatus(cardId: string) {
    return { publish_status: "scheduled", error: `noop:${cardId}` };
  }
}

let cached: ContentPublisherPort | null = null;

export function getPublisher(): ContentPublisherPort {
  if (cached) return cached;
  if (!FEATURE_META_CONTENT_PUBLISH) {
    cached = new NoopContentPublisher();
    return cached;
  }
  // Sync fallback: Meta adapter is loaded lazily on first publish via publishCardWithClient.
  // getPublisher() returns a thin wrapper that delegates to MetaInstagramPublisher when available.
  cached = {
    async publishNow(cardId: string): Promise<PublishResult> {
      const { MetaInstagramPublisher } = await import("./meta-instagram-publisher.server");
      return new MetaInstagramPublisher().publishNow(cardId);
    },
    async schedule(cardId: string, scheduledAt: string): Promise<void> {
      const { MetaInstagramPublisher } = await import("./meta-instagram-publisher.server");
      return new MetaInstagramPublisher().schedule(cardId, scheduledAt);
    },
    async cancel(cardId: string): Promise<void> {
      const { MetaInstagramPublisher } = await import("./meta-instagram-publisher.server");
      return new MetaInstagramPublisher().cancel(cardId);
    },
    async getStatus(cardId: string) {
      const { MetaInstagramPublisher } = await import("./meta-instagram-publisher.server");
      return new MetaInstagramPublisher().getStatus(cardId);
    },
  };
  return cached;
}
