import type { SupabaseClient } from "@supabase/supabase-js";
import { brandAuthor, type CrmBrandAuthor } from "../skip-rules";

/** Ids e @ da conta Instagram do próprio cliente, para não tratar a marca como audiência. */
export async function loadCrmBrandAuthor(
  supabase: SupabaseClient,
  cadastroClienteId: number,
  extra: { igUserId?: string | null; igUsername?: string | null } = {},
): Promise<CrmBrandAuthor> {
  const [{ data: cadastro }, { data: connections }] = await Promise.all([
    supabase
      .from("cadastro_clientes")
      .select("instagram_username")
      .eq("id", cadastroClienteId)
      .maybeSingle(),
    supabase
      .from("ph_connections")
      .select("id")
      .eq("cadastro_id", cadastroClienteId)
      .eq("plugin_key", "instagram_organic"),
  ]);

  const connectionIds = (connections ?? []).map((row) => row.id as string);
  const { data: identities } =
    connectionIds.length > 0
      ? await supabase
          .from("ph_identities")
          .select("external_id, label, identity_type")
          .in("connection_id", connectionIds)
          .eq("identity_type", "instagram")
      : { data: [] };

  return brandAuthor(
    [extra.igUserId, ...(identities ?? []).map((row) => row.external_id as string | null)],
    [
      extra.igUsername,
      cadastro?.instagram_username as string | null | undefined,
      ...(identities ?? []).map((row) => row.label as string | null),
    ],
  );
}

/** Tira do CRM a pessoa criada antes para a própria conta do cliente. */
export async function ignoreBrandPeople(
  supabase: SupabaseClient,
  cadastroClienteId: number,
  brand: CrmBrandAuthor,
) {
  const filters = [
    ...[...brand.ids].map((id) => `and(kind.eq.igsid,value.eq.${id})`),
    ...[...brand.usernames].map((name) => `and(kind.eq.ig_username,value.eq.${name})`),
  ];
  if (filters.length === 0) return;
  const { data } = await supabase
    .from("crm_identities")
    .select("person_id")
    .eq("cadastro_cliente_id", cadastroClienteId)
    .or(filters.join(","));
  const personIds = [...new Set((data ?? []).map((row) => row.person_id as string))];
  if (personIds.length === 0) return;
  await supabase
    .from("crm_people")
    .update({ ignored_at: new Date().toISOString() })
    .in("id", personIds)
    .is("ignored_at", null);
}
