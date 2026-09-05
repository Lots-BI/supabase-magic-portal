import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ClienteAtivo = {
  cliente: string;
  ultima_data_recebida: string | null;
  plataformas_ativas: string[] | null;
};

export const clientesAtivosQuery = queryOptions({
  queryKey: ["vw_clientes_ativos"],
  queryFn: async (): Promise<ClienteAtivo[]> => {
    const { data, error } = await supabase
      .from("vw_clientes_ativos")
      .select("cliente,ultima_data_recebida,plataformas_ativas")
      .order("ultima_data_recebida", { ascending: false });
    if (error) throw error;
    return (data ?? []) as ClienteAtivo[];
  },
  staleTime: 60_000,
});
