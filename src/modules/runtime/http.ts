export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/** Auth dos GET /api/cron/* — Bearer CRON_SECRET. null = autorizado. */
export function cronAuthResponse(request: Request): Response | null {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return jsonResponse({ error: "CRON_SECRET não configurado" }, 503);
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  return null;
}

export async function withCronAuth(
  request: Request,
  run: () => Promise<unknown>,
): Promise<Response> {
  const denied = cronAuthResponse(request);
  if (denied) return denied;
  try {
    return jsonResponse(await run());
  } catch (error) {
    console.error("[cron]", error);
    return jsonResponse(
      { ok: false, error: error instanceof Error ? error.message : "Cron failed" },
      500,
    );
  }
}
