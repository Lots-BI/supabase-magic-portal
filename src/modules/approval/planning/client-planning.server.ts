import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertClientPortalAccess } from "../internal/client-access.server";
import { editorialPillarRepository } from "../repositories/editorial-pillar.repository.server";
import { calendarRepository } from "../repositories/calendar.repository.server";
import { storyPlanRowRepository } from "../repositories/story-plan-row.repository.server";
import { groupCardsByDate } from "../services/group-cards-by-date";

export const listClientEditorialPillars = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const scope = await assertClientPortalAccess(context);
    return editorialPillarRepository.listForCadastroClienteIds(
      context.supabase,
      scope.cadastroClienteIds,
      true,
    );
  });

export const getClientCalendarCards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        view: z.enum(["month", "week", "day"]),
        anchor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const scope = await assertClientPortalAccess(context);
    const { from, to } = calendarRepository.resolveRange(data.view, data.anchor);
    const raw = await calendarRepository.listForCadastroClienteIdsByDateRange(
      context.supabase,
      scope.cadastroClienteIds,
      from,
      to,
    );
    // Rascunhos (roteiro) só aparecem após a agência enviar para aprovação.
    const cards = raw.filter((c) => c.status !== "roteiro");
    return {
      view: data.view,
      anchor: data.anchor,
      from,
      to,
      cards,
      byDay: Object.fromEntries(groupCardsByDate(cards)),
    };
  });

export const listClientStoryPlanRows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ semana_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const scope = await assertClientPortalAccess(context);
    return storyPlanRowRepository.listForCadastroClienteIds(
      context.supabase,
      scope.cadastroClienteIds,
      data.semana_inicio,
    );
  });
