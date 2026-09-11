import { createError, getRequestHeader } from "h3";

/** Auth compartilhado dos GET /api/cron/* — Bearer CRON_SECRET. */
export function assertCronAuth(event: { headers: Headers }): void {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    throw createError({ statusCode: 503, statusMessage: "CRON_SECRET não configurado" });
  }

  const auth = getRequestHeader(event, "authorization");
  if (auth !== `Bearer ${secret}`) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }
}
