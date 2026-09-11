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
    const { data, error } = await supabase.rpc("portfolio_clientes_ativos");
    if (error) throw error;
    return (data ?? []).map((row) => ({
      cliente: row.cliente,
      ultima_data_recebida:
        row.ultima_data_recebida != null ? String(row.ultima_data_recebida).slice(0, 10) : null,
      plataformas_ativas: row.plataformas_ativas ?? null,
    }));
  },
  staleTime: 60_000,
});
