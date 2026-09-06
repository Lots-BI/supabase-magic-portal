import { isHttpClientError } from "@/modules/platform-hub/plugins/_internal/http/http-client.port";
import type { InstagramPublishPlan } from "./build-instagram-publish-plan";

export type InstagramPublishTarget = {
  accessToken: string;
  igUserId: string;
};

export interface InstagramPublishGraphPort {
  createMediaContainer(
    accessToken: string,
    igUserId: string,
    params: Record<string, string>,
  ): Promise<{ id: string }>;
  getContainerStatus(
    accessToken: string,
    containerId: string,
  ): Promise<{ status_code?: string }>;
  publishMedia(
    accessToken: string,
    igUserId: string,
    creationId: string,
  ): Promise<{ id: string }>;
  getMediaPermalink?(accessToken: string, mediaId: string): Promise<string | undefined>;
}

export type ExecuteInstagramPublishResult = {
  containerId: string;
  mediaId: string;
  permalink?: string;
};

const DEFAULT_SLEEP = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function isMissingScopeMessage(message: string): boolean {
  return /instagram_content_publish|does not have permission|#10\b|#200\b|missing permission/i.test(
    message,
  );
}

export function formatInstagramPublishError(error: unknown): string {
  let message = error instanceof Error ? error.message : String(error);
  if (isHttpClientError(error) && error.body) {
    try {
      const parsed = JSON.parse(error.body) as { error?: { message?: string } };
      if (parsed.error?.message) message = parsed.error.message;
    } catch {
      /* keep original */
    }
  }
  if (message.startsWith("missing_connection:") || message.startsWith("missing_publish_scope:")) {
    return message;
  }
  if (isMissingScopeMessage(message)) {
    return `missing_publish_scope: ${message}`;
  }
  return message;
}

async function waitUntilContainerReady(
  graph: InstagramPublishGraphPort,
  target: InstagramPublishTarget,
  containerId: string,
  options: { sleep: (ms: number) => Promise<void>; maxPolls: number; pollIntervalMs: number },
): Promise<void> {
  for (let attempt = 0; attempt < options.maxPolls; attempt += 1) {
    const { status_code: status } = await graph.getContainerStatus(
      target.accessToken,
      containerId,
    );
    if (!status || status === "FINISHED" || status === "PUBLISHED") return;
    if (status === "ERROR" || status === "EXPIRED") {
      throw new Error(`Container Instagram ${status.toLowerCase()}: processamento recusado.`);
    }
    await options.sleep(options.pollIntervalMs);
  }
  throw new Error("Instagram ainda processando a mídia. Tente novamente em alguns minutos.");
}

async function createAndWait(
  graph: InstagramPublishGraphPort,
  target: InstagramPublishTarget,
  params: Record<string, string>,
  options: { sleep: (ms: number) => Promise<void>; maxPolls: number; pollIntervalMs: number },
): Promise<string> {
  const created = await graph.createMediaContainer(target.accessToken, target.igUserId, params);
  await waitUntilContainerReady(graph, target, created.id, options);
  return created.id;
}

export async function executeInstagramPublishPlan(input: {
  graph: InstagramPublishGraphPort;
  target: InstagramPublishTarget;
  plan: InstagramPublishPlan;
  sleep?: (ms: number) => Promise<void>;
  maxPolls?: number;
  pollIntervalMs?: number;
}): Promise<ExecuteInstagramPublishResult> {
  const sleep = input.sleep ?? DEFAULT_SLEEP;
  const maxPolls = input.maxPolls ?? 40;
  const pollIntervalMs = input.pollIntervalMs ?? 3000;
  const wait = { sleep, maxPolls, pollIntervalMs };
  const { graph, target, plan } = input;

  let containerId: string;
  if (plan.type === "image") {
    containerId = await createAndWait(
      graph,
      target,
      { image_url: plan.image_url, caption: plan.caption },
      wait,
    );
  } else if (plan.type === "reels") {
    containerId = await createAndWait(
      graph,
      target,
      { media_type: "REELS", video_url: plan.video_url, caption: plan.caption, share_to_feed: "true" },
      wait,
    );
  } else {
    const children: string[] = [];
    for (const item of plan.items) {
      const childParams: Record<string, string> = item.video_url
        ? { video_url: item.video_url, is_carousel_item: "true", media_type: "VIDEO" }
        : { image_url: item.image_url ?? "", is_carousel_item: "true" };
      children.push(await createAndWait(graph, target, childParams, wait));
    }
    containerId = await createAndWait(
      graph,
      target,
      {
        media_type: "CAROUSEL",
        children: children.join(","),
        caption: plan.caption,
      },
      wait,
    );
  }

  const published = await graph.publishMedia(target.accessToken, target.igUserId, containerId);
  const permalink = graph.getMediaPermalink
    ? await graph.getMediaPermalink(target.accessToken, published.id).catch(() => undefined)
    : undefined;

  return { containerId, mediaId: published.id, permalink };
}
