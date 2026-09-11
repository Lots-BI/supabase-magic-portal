export type MergePerson = {
  id: string;
  cadastroClienteId: number;
  mergedIntoId: string | null;
  isVip: boolean;
};

export type MergePlan = {
  intoId: string;
  fromId: string;
  vip: boolean;
};

export function assertCanMerge(from: MergePerson, into: MergePerson): MergePlan {
  if (from.id === into.id) {
    throw new Error("Não é possível unir uma pessoa com ela mesma.");
  }
  if (from.cadastroClienteId !== into.cadastroClienteId) {
    throw new Error("Só é possível unir pessoas da mesma marca.");
  }
  if (from.mergedIntoId) {
    throw new Error("Esta ficha já foi unida a outra pessoa.");
  }
  if (into.mergedIntoId) {
    throw new Error("A ficha de destino já foi unida a outra pessoa.");
  }
  return {
    fromId: from.id,
    intoId: into.id,
    vip: from.isVip || into.isVip,
  };
}

export type IdentityRow = { kind: string; value: string; personId: string };

/** Em conflito de unique (cadastro, kind, value), a identidade do `from` cai fora. */
export function identitiesAfterMerge(
  fromIdentities: readonly IdentityRow[],
  intoIdentities: readonly IdentityRow[],
): { keepFrom: IdentityRow[]; dropFrom: IdentityRow[] } {
  const intoKeys = new Set(intoIdentities.map((i) => `${i.kind}:${i.value}`));
  const keepFrom: IdentityRow[] = [];
  const dropFrom: IdentityRow[] = [];
  for (const ident of fromIdentities) {
    if (intoKeys.has(`${ident.kind}:${ident.value}`)) dropFrom.push(ident);
    else keepFrom.push(ident);
  }
  return { keepFrom, dropFrom };
}
