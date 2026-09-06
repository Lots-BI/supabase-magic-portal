/**
 * Camada de adaptação Portal do Cliente → Approval.
 * Não duplica lógica de domínio; apenas resolve ClientScope e delega aos services existentes.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  getClientKanbanBoard,
  getClientCardDetail,
} from "@/modules/approval/internal/client-query.server";
import {
  searchLibrary,
  getLibraryItemDetail,
} from "@/modules/approval/internal/library-query.server";
import { editorialPillarRepository } from "@/modules/approval/repositories/editorial-pillar.repository.server";
import { calendarRepository } from "@/modules/approval/repositories/calendar.repository.server";
import { storyPlanRowRepository } from "@/modules/approval/repositories/story-plan-row.repository.server";
import { groupCardsByDate } from "@/modules/approval/services/group-cards-by-date";
import { librarySearchSchema } from "@/modules/approval/library/validators/library";
import { resolveClientPortalRole } from "@/modules/approval/internal/client-access.server";
import { isStaffMember } from "@/modules/approval/internal/staff-auth.server";
import { clientScopeInputSchema } from "./scope-input";
import { resolvePortalScope } from "./server/resolve-portal-scope.server";
import type { ContentCard } from "@/modules/approval/types/content-card";

const withScope = z.object({ scope: clientScopeInputSchema });

/** Rascunhos em `roteiro` ficam só na agência até "Enviar para aprovação". */
function excludeDraftRoteiro(cards: ContentCard[], mode: "client_access" | "slug_context") {
  if (mode !== "client_access") return cards;
  return cards.filter((c) => c.status !== "roteiro");
}

export const checkScopedPortalAccessFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => clientScopeInputSchema.parse(d ?? { mode: "client_access" }))
  .handler(async ({ data, context }) => {
    if (data.mode === "slug_context") {
      await resolvePortalScope(context, data);
      if (await isStaffMember(context)) {
        return { role: "slug_context" as const };
      }
      return { role: "cliente" as const };
    }
    const role = await resolveClientPortalRole(context);
    return { role };
  });

export const getScopedKanbanBoardFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => withScope.parse(d))
  .handler(async ({ data, context }) => {
    const scope = await resolvePortalScope(context, data.scope);
    const board = await getClientKanbanBoard(context.supabase, scope);
    if (data.scope.mode !== "client_access") return board;
    return {
      ...board,
      columns: board.columns.map((col) =>
        col.status === "roteiro" ? { ...col, cards: [] } : col,
      ),
    };
  });

export const getScopedContentCardFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => withScope.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const scope = await resolvePortalScope(context, data.scope);
    const detail = await getClientCardDetail(context.supabase, data.id, scope);
    if (!detail) throw new Error("Card não encontrado");
    if (data.scope.mode === "client_access" && detail.card.status === "roteiro") {
      throw new Error("Card não encontrado");
    }
    return detail;
  });

export const listScopedEditorialPillarsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => withScope.parse(d))
  .handler(async ({ data, context }) => {
    const scope = await resolvePortalScope(context, data.scope);
    return editorialPillarRepository.listForCadastroClienteIds(
      context.supabase,
      scope.cadastroClienteIds,
      true,
    );
  });

export const getScopedCalendarCardsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    withScope
      .extend({
        view: z.enum(["month", "week", "day"]),
        anchor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const scope = await resolvePortalScope(context, data.scope);
    const { from, to } = calendarRepository.resolveRange(data.view, data.anchor);
    const raw = await calendarRepository.listForCadastroClienteIdsByDateRange(
      context.supabase,
      scope.cadastroClienteIds,
      from,
      to,
    );
    const cards = excludeDraftRoteiro(raw, data.scope.mode);
    return {
      view: data.view,
      anchor: data.anchor,
      from,
      to,
      cards,
      byDay: Object.fromEntries(groupCardsByDate(cards)),
    };
  });

export const listScopedStoryPlanRowsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    withScope.extend({ semana_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const scope = await resolvePortalScope(context, data.scope);
    return storyPlanRowRepository.listForCadastroClienteIds(
      context.supabase,
      scope.cadastroClienteIds,
      data.semana_inicio,
    );
  });

export const searchScopedLibraryFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ scope: clientScopeInputSchema })
      .merge(librarySearchSchema.omit({ cadastro_cliente_id: true }))
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const scope = await resolvePortalScope(context, data.scope);
    const { scope: _s, ...filters } = data;
    return searchLibrary(context.supabase, filters, scope);
  });

export const getScopedLibraryItemFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => withScope.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const scope = await resolvePortalScope(context, data.scope);
    const detail = await getLibraryItemDetail(context.supabase, data.id, scope);
    if (!detail) throw new Error("Conteúdo não encontrado");
    return detail;
  });
