/** Detecção de ambiente Lots BI — reutilizável em workers, APIs e UI. */

import { isLocalhostUrl, normalizeAppUrl } from "@/lib/app-url";

export type LotsEnvironment = "development" | "staging" | "production";

export const DEFAULT_PRODUCTION_APP_URL = "https://lotsbi.leandromajr.com";

export function normalizeHostname(urlOrHost: string): string {
  try {
    if (urlOrHost.includes("://")) return new URL(urlOrHost).hostname.toLowerCase();
    return urlOrHost.split(":")[0]?.toLowerCase() ?? urlOrHost.toLowerCase();
  } catch {
    return urlOrHost.toLowerCase();
  }
}

export function urlOrigin(url: string): string {
  return new URL(normalizeAppUrl(url)).origin;
}

export function hostnamesMatch(a: string, b: string): boolean {
  return normalizeHostname(a) === normalizeHostname(b);
}

/** Infere ambiente a partir do host da requisição / browser. */
export function detectLotsEnvironment(
  hostnameOrOrigin: string,
  opts?: { nodeEnv?: string; isViteProd?: boolean },
): LotsEnvironment {
  const host = normalizeHostname(hostnameOrOrigin);
  if (isLocalhostUrl(`http://${host}`) || host === "[::1]") return "development";

  const nodeProd = opts?.nodeEnv === "production" || opts?.isViteProd === true;
  if (!nodeProd && (host.includes("localhost") || host === "127.0.0.1")) {
    return "development";
  }

  if (
    host.includes("staging") ||
    host.includes("preview") ||
    host.endsWith(".pages.dev") ||
    host.includes("workers.dev")
  ) {
    return "staging";
  }

  return nodeProd || !host.includes("localhost") ? "production" : "development";
}

export function environmentLabel(env: LotsEnvironment): string {
  switch (env) {
    case "development":
      return "Development";
    case "staging":
      return "Staging";
    case "production":
      return "Production";
  }
}

export function resolveExpectedAppUrl(
  env: LotsEnvironment,
  envVars?: {
    productionUrl?: string;
    stagingUrl?: string;
    developmentUrl?: string;
  },
): string {
  const production = envVars?.productionUrl?.trim() || DEFAULT_PRODUCTION_APP_URL;
  const staging = envVars?.stagingUrl?.trim() || production;
  const development = envVars?.developmentUrl?.trim() || "http://localhost:5173";

  switch (env) {
    case "development":
      return normalizeAppUrl(development);
    case "staging":
      return normalizeAppUrl(staging);
    case "production":
      return normalizeAppUrl(production);
  }
}
