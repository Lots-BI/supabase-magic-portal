export type DocumentKind = "cpf" | "cnpj";

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function cpfCheckDigit(base: string, factor: number): number {
  let sum = 0;
  for (let i = 0; i < base.length; i += 1) sum += Number(base[i]) * (factor - i);
  const mod = (sum * 10) % 11;
  return mod === 10 ? 0 : mod;
}

export function isValidCpf(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  const first = cpfCheckDigit(digits.slice(0, 9), 10);
  const second = cpfCheckDigit(digits.slice(0, 10), 11);
  return first === Number(digits[9]) && second === Number(digits[10]);
}

function cnpjCheckDigit(base: string, weights: number[]): number {
  let sum = 0;
  for (let i = 0; i < weights.length; i += 1) sum += Number(base[i]) * weights[i];
  const mod = sum % 11;
  return mod < 2 ? 0 : 11 - mod;
}

export function isValidCnpj(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;
  const first = cnpjCheckDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = cnpjCheckDigit(digits.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return first === Number(digits[12]) && second === Number(digits[13]);
}

export function classifyDocument(value: string): { kind: DocumentKind; digits: string } | null {
  const digits = onlyDigits(value);
  if (digits.length === 11 && isValidCpf(digits)) return { kind: "cpf", digits };
  if (digits.length === 14 && isValidCnpj(digits)) return { kind: "cnpj", digits };
  return null;
}

/** Retorna 55 + DDD + número, ou null. */
export function normalizeWhatsapp(value: string): string | null {
  let digits = onlyDigits(value);
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
  return null;
}

export function whatsappHref(digits: string): string {
  return `https://wa.me/${digits}`;
}

export function slugFromName(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base.length >= 2 ? base : "agencia";
}

export type ApplicationStatus = "pending" | "approved" | "rejected" | null;

/** allow = segue o destino normal. form = pede dados. wait = pedido em análise. */
export function resolveAcquisitionGate(input: {
  orgTablesReady: boolean;
  isPlatformOwner: boolean;
  hasMembership: boolean;
  hasClientAccess: boolean;
  applicationStatus: ApplicationStatus;
}): "allow" | "form" | "wait" {
  if (!input.orgTablesReady) return "allow";
  if (input.isPlatformOwner || input.hasMembership || input.hasClientAccess) return "allow";
  if (input.applicationStatus === "pending" || input.applicationStatus === "approved") {
    return "wait";
  }
  return "form";
}
