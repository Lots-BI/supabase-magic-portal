import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { loadCallerAccess } from "@/modules/access/organization.server";
import { getClientAccessScope } from "@/modules/approval/internal/client-access.server";
import { todayInSaoPaulo } from "@/modules/agency-os/tasks-sheet";

function mondayOf(today: string): string {
  const [year, month, date] = today.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, date));
  const weekday = utc.getUTCDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  utc.setUTCDate(utc.getUTCDate() + delta);
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utc.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function acessoRelatorio(
  context: { supabase: Parameters<typeof getClientAccessScope>[0]; userId: string },
  cadastroClienteId: number,
) {
  const access = await loadCallerAccess(context);
  const operacional = access.isPlatformOwner || access.isOperational || access.isGlobalAdmin;
  if (!operacional) {
    const scope = await getClientAccessScope(context.supabase, context.userId);
    if (!scope.cadastroClienteIds.includes(cadastroClienteId)) {
      throw new Error("Sem acesso a este relatório.");
    }
  }
  return operacional;
}

export const listRelatorioNotas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ cadastroClienteId: z.number().int().positive() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const canEdit = await acessoRelatorio(context, data.cadastroClienteId);
    const semana = mondayOf(todayInSaoPaulo());
    const admin = getSupabaseAdmin();
    const [analisesRes, quedaRes] = await Promise.all([
      admin
        .from("relatorio_analises")
        .select("plataforma, html, enviada_em")
        .eq("cadastro_cliente_id", data.cadastroClienteId)
        .eq("semana", semana),
      admin
        .from("relatorio_ocorrencias")
        .select("html, enviada_em, periodo_inicio, periodo_fim")
        .eq("cadastro_cliente_id", data.cadastroClienteId)
        .order("periodo_fim", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (analisesRes.error && !/does not exist|schema cache/i.test(analisesRes.error.message)) {
      throw new Error(analisesRes.error.message);
    }
    return {
      canEdit,
      semana,
      analises: (analisesRes.data ?? []).map((row) => ({
        plataforma: row.plataforma as string,
        html: (row.html as string) ?? "",
        enviada: Boolean(row.enviada_em),
      })),
      queda:
        quedaRes.data && quedaRes.data.enviada_em
          ? {
              html: (quedaRes.data.html as string) ?? "",
              periodoInicio: quedaRes.data.periodo_inicio as string,
              periodoFim: quedaRes.data.periodo_fim as string,
            }
          : null,
    };
  });

export const saveRelatorioAnalise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        cadastroClienteId: z.number().int().positive(),
        plataforma: z.string().trim().min(1).max(40),
        html: z.string().max(40000),
        enviar: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const canEdit = await acessoRelatorio(context, data.cadastroClienteId);
    if (!canEdit) throw new Error("Só a operação grava a análise.");
    const semana = mondayOf(todayInSaoPaulo());
    const agora = new Date().toISOString();
    const { error } = await getSupabaseAdmin()
      .from("relatorio_analises")
      .upsert(
        {
          cadastro_cliente_id: data.cadastroClienteId,
          plataforma: data.plataforma,
          semana,
          html: data.html,
          autor_user_id: context.userId,
          enviada_em: data.enviar ? agora : null,
          updated_at: agora,
        },
        { onConflict: "cadastro_cliente_id,plataforma,semana" },
      );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const saveRelatorioOcorrencia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        cadastroClienteId: z.number().int().positive(),
        periodoInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        periodoFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        html: z.string().max(40000),
        enviar: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const canEdit = await acessoRelatorio(context, data.cadastroClienteId);
    if (!canEdit) throw new Error("Só a operação grava a ocorrência.");
    const agora = new Date().toISOString();
    const { error } = await getSupabaseAdmin()
      .from("relatorio_ocorrencias")
      .upsert(
        {
          cadastro_cliente_id: data.cadastroClienteId,
          periodo_inicio: data.periodoInicio,
          periodo_fim: data.periodoFim,
          html: data.html,
          autor_user_id: context.userId,
          enviada_em: data.enviar ? agora : null,
          updated_at: agora,
        },
        { onConflict: "cadastro_cliente_id,periodo_inicio,periodo_fim" },
      );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
