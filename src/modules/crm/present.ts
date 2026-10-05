export const SIGNAL_KIND_LABEL: Record<string, string> = {
  comment: "Comentário",
  reply: "Resposta em comentário",
  dm: "Direct",
  story_reply: "Resposta ao story",
  lead_form: "Formulário de anúncio",
  whatsapp: "WhatsApp",
  review: "Avaliação",
  mention: "Menção",
  brand_reply: "Resposta da marca",
  form: "Formulário do site",
  email: "E-mail",
  call: "Ligação",
  other: "Outro contato",
};

export const PLACE_LABEL: Record<string, string> = {
  feed: "Feed",
  reels: "Reels",
  story: "Story",
  ads: "Anúncio",
  whatsapp: "WhatsApp",
  gbp: "Google",
  youtube: "YouTube",
  web: "Site",
  phone: "Telefone",
  unknown: "",
};

export const IDENTITY_LABEL: Record<string, string> = {
  igsid: "ID Instagram",
  ig_username: "Instagram",
  email: "E-mail",
  phone: "Telefone",
  whatsapp: "WhatsApp",
  messenger_psid: "Messenger",
  leadgen: "Lead Ads",
  gbp_reviewer: "Google",
  yt_channel: "YouTube",
};

export const FIELD_LABEL: Record<string, string> = {
  email: "E-mail",
  phone: "Telefone",
  address: "Endereço",
  full_name: "Nome",
};

export const COLLECTOR_STATUS_LABEL: Record<string, string> = {
  live: "coletando",
  scope_missing: "falta permissão",
  planned: "ainda não ligado",
  impossible: "a plataforma não entrega",
};

export const PROFILE_GROUPS = [
  { id: "instagram", label: "Instagram", hint: "Comentários e menções" },
  { id: "direct", label: "Direct", hint: "Mensagens privadas e stories" },
  { id: "whatsapp", label: "WhatsApp", hint: "Conversas no WhatsApp" },
  { id: "form", label: "Formulário", hint: "Anúncio e site" },
  { id: "email", label: "E-mail", hint: "Contatos por e-mail" },
  { id: "review", label: "Avaliações", hint: "Google e outras avaliações" },
  { id: "other", label: "Outros", hint: "Ligações e canais sem classificação" },
] as const;

export type CrmProfileGroupId = (typeof PROFILE_GROUPS)[number]["id"];

const KIND_GROUP: Record<string, CrmProfileGroupId> = {
  comment: "instagram",
  reply: "instagram",
  mention: "instagram",
  dm: "direct",
  story_reply: "direct",
  whatsapp: "whatsapp",
  lead_form: "form",
  form: "form",
  email: "email",
  review: "review",
  call: "other",
  other: "other",
  brand_reply: "other",
};

export function profileGroupId(lastKind: string | null | undefined): CrmProfileGroupId {
  if (!lastKind) return "other";
  return KIND_GROUP[lastKind] ?? "other";
}

export function groupPeopleByProfile<T extends { lastKind: string | null }>(people: readonly T[]) {
  const buckets = new Map<CrmProfileGroupId, T[]>();
  for (const person of people) {
    const id = profileGroupId(person.lastKind);
    const list = buckets.get(id) ?? [];
    list.push(person);
    buckets.set(id, list);
  }
  return PROFILE_GROUPS.filter((group) => (buckets.get(group.id)?.length ?? 0) > 0).map(
    (group) => ({
      ...group,
      people: buckets.get(group.id) ?? [],
    }),
  );
}

export function kindLabel(kind: string): string {
  return SIGNAL_KIND_LABEL[kind] ?? kind;
}

export function placeLabel(place: string): string {
  return PLACE_LABEL[place] ?? place;
}

export function identityLabel(kind: string): string {
  return IDENTITY_LABEL[kind] ?? kind;
}

export function fieldLabel(field: string): string {
  return FIELD_LABEL[field] ?? field;
}

export function formatIdentityValue(kind: string, value: string): string {
  if (kind === "ig_username") return value.startsWith("@") ? value : `@${value}`;
  return value;
}

/** Um único nome na lista. O @ gravado no nome não se repete ao lado do username. */
export function personListTitle(displayName: string, igUsername: string | null): string {
  const handle = igUsername?.trim().replace(/^@+/, "") ?? "";
  const name = displayName.trim();
  if (!name || name === "@") return handle ? `@${handle}` : "Pessoa";
  if (!handle) return name;
  const bare = name.replace(/^@+/, "");
  if (bare.toLowerCase() === handle.toLowerCase()) return `@${handle}`;
  return `${name} · @${handle}`;
}

/** O número de 0 a 100 já exibido na ficha. O heat interno do banco pode passar de 100. */
export function clampIntent(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}
