import type { SupabaseClient } from "@supabase/supabase-js";

export async function resolveConnectionCadastroId(
  supabase: SupabaseClient,
  connectionId: string,
): Promise<number | null> {
  const { data, error } = await supabase
    .from("ph_connections")
    .select("cadastro_id")
    .eq("id", connectionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const id = (data as { cadastro_id?: number | null } | null)?.cadastro_id;
  return id ?? null;
}
