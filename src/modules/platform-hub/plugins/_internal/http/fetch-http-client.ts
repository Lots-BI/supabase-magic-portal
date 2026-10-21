import {
  HttpClientError,
  type HttpClientPort,
  type HttpRequestInitV1,
  type HttpResponseV1,
} from "./http-client.port";

function formatHttpErrorMessage(status: number, textBody: string): string {
  const head = textBody.trimStart().slice(0, 32).toLowerCase();
  if (head.startsWith("<!doctype") || head.startsWith("<html")) {
    return `HTTP ${status}: resposta HTML inesperada (recurso não encontrado)`;
  }
  return `HTTP ${status}: ${textBody.slice(0, 300)}`;
}

function buildUrl(base: string, searchParams?: HttpRequestInitV1["searchParams"]): string {
  if (!searchParams) return base;
  const url = new URL(base);
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }
  return url.toString();
}

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key.toLowerCase()] = value;
  });
  return record;
}

/** Implementação fetch — sem dependência de SDK. */
export class FetchHttpClient implements HttpClientPort {
  async request(url: string, init: HttpRequestInitV1 = {}): Promise<HttpResponseV1> {
    const response = await fetch(buildUrl(url, init.searchParams), {
      method: init.method ?? "GET",
      headers: init.headers,
      body: init.body,
    });

    const headers = headersToRecord(response.headers);
    const textBody = await response.text();

    const wrapped: HttpResponseV1 = {
      status: response.status,
      ok: response.ok,
      headers,
      async json<T>() {
        return JSON.parse(textBody) as T;
      },
      async text() {
        return textBody;
      },
    };

    if (!response.ok) {
      throw new HttpClientError(
        formatHttpErrorMessage(response.status, textBody),
        response.status,
        textBody,
      );
    }

    return wrapped;
  }
}

export class RateLimitHttpError extends HttpClientError {
  constructor(
    message: string,
    readonly retryAfterMs?: number,
  ) {
    super(message, 429);
    this.name = "RateLimitHttpError";
  }
}

export function parseRetryAfterMs(headers: Record<string, string>): number | undefined {
  const raw = headers["retry-after"];
  if (!raw) return undefined;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const date = Date.parse(raw);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return undefined;
}

export function throwIfRateLimited(error: unknown): never {
  if (error instanceof HttpClientError && error.status === 429) {
    throw new RateLimitHttpError(error.message);
  }
  throw error;
}
