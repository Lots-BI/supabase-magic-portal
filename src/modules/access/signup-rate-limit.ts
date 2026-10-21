const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 10;

type Bucket = { count: number; resetAt: number };

const emailHits = new Map<string, Bucket>();
const ipHits = new Map<string, Bucket>();

function hit(store: Map<string, Bucket>, key: string, max: number, now: number): boolean {
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > max;
}

/** Limite por instância. Sem Redis; melhor que cadastro aberto. */
export function isSignupRateLimited(email: string, ip: string | null): boolean {
  const now = Date.now();
  const emailKey = email.trim().toLowerCase();
  const blockedEmail = hit(emailHits, emailKey, MAX_PER_EMAIL, now);
  const blockedIp = ip ? hit(ipHits, ip, MAX_PER_IP, now) : false;
  return blockedEmail || blockedIp;
}

export function passwordStrength(password: string): string | null {
  if (password.length < 10) return "A senha deve ter pelo menos 10 caracteres.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "A senha precisa de letra e número.";
  }
  return null;
}

export function clientIpFromHeaders(headers: {
  forwardedFor?: string | null;
  realIp?: string | null;
}): string | null {
  const forwarded = headers.forwardedFor?.split(",")[0]?.trim();
  if (forwarded) return forwarded.slice(0, 64);
  const real = headers.realIp?.trim();
  return real ? real.slice(0, 64) : null;
}
