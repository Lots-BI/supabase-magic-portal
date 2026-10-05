import { describe, expect, it } from "vitest";
import {
  brDateToIso,
  dueAtToEntrega,
  entregaToDueAt,
  isoToBrDate,
  maskBrDate,
  taskAbaAction,
  taskAbaHref,
  assigneeInScope,
  assigneeTipo,
  isEntregaAtrasada,
  nearestDeliveryTask,
  nextWeeklyEntrega,
  upcomingWeeklyEntrega,
  normalizeTaskDescription,
  visibleCadastroIds,
} from "./tasks-sheet";

describe("planilha de tarefas", () => {
  it("sem organização pronta deixa a lista no acesso antigo", () => {
    expect(
      visibleCadastroIds({
        orgTablesReady: false,
        seeAllCadastros: true,
        cadastroIds: [],
      }),
    ).toBeNull();
  });

  it("operador da plataforma vê os clientes de todas as organizações", () => {
    expect(
      visibleCadastroIds({
        orgTablesReady: true,
        seeAllCadastros: true,
        cadastroIds: [],
      }),
    ).toBeNull();
  });

  it("agência vê só os clientes do próprio acesso", () => {
    expect(
      visibleCadastroIds({
        orgTablesReady: true,
        seeAllCadastros: false,
        cadastroIds: [4, 9],
      }),
    ).toEqual([4, 9]);
  });

  it("escreve a entrega como dia/mês/ano de São Paulo", () => {
    expect(maskBrDate("02102026")).toBe("02/10/2026");
    expect(maskBrDate("02/10")).toBe("02/10");
    expect(isoToBrDate("2026-10-02")).toBe("02/10/2026");
    expect(brDateToIso("02/10/2026")).toBe("2026-10-02");
    expect(brDateToIso("31/02/2026")).toBeNull();
    expect(brDateToIso("02/10")).toBeNull();
  });

  it("guarda a data de entrega no dia escolhido", () => {
    expect(entregaToDueAt("2026-10-02")).toBe("2026-10-02T15:00:00.000Z");
    expect(entregaToDueAt(null)).toBeNull();
    expect(dueAtToEntrega("2026-10-02T15:00:00.000Z")).toBe("2026-10-02");
    expect(dueAtToEntrega("2026-10-02T02:00:00.000Z")).toBe("2026-10-01");
  });

  it("aceita admin e cliente como proprietário, e limita à organização", () => {
    expect(assigneeTipo({ appRoles: ["admin"], orgRoles: [] })).toBe("admin");
    expect(assigneeTipo({ appRoles: ["cliente"], orgRoles: ["cliente"] })).toBe("cliente");
    expect(assigneeTipo({ appRoles: [], orgRoles: ["social_media"] })).toBe("admin");
    expect(assigneeTipo({ appRoles: [], orgRoles: [] })).toBeNull();
    expect(
      assigneeInScope({
        orgTablesReady: true,
        seeAllCadastros: false,
        organizationIds: ["lots"],
        memberOrganizationIds: ["norte"],
      }),
    ).toBe(false);
    expect(
      assigneeInScope({
        orgTablesReady: false,
        seeAllCadastros: true,
        organizationIds: [],
        memberOrganizationIds: [],
      }),
    ).toBe(true);
  });

  it("mostra ao cliente a tarefa aberta com a entrega mais próxima", () => {
    const tasks = [
      { id: "longe", status: "open", entrega: "2026-12-01" },
      { id: "proxima", status: "open", entrega: "2026-10-20" },
      { id: "vencida", status: "open", entrega: "2026-09-01" },
      { id: "feita", status: "completed", entrega: "2026-10-03" },
    ];
    expect(nearestDeliveryTask(tasks, "2026-10-02")?.id).toBe("proxima");
    expect(
      nearestDeliveryTask(
        [
          { id: "vencida", status: "open", entrega: "2026-09-01" },
          { id: "feita", status: "completed", entrega: "2026-10-03" },
        ],
        "2026-10-02",
      )?.id,
    ).toBe("vencida");
    expect(nearestDeliveryTask([], "2026-10-02")).toBeNull();
  });

  it("repete na segunda seguinte, e inclui a própria segunda", () => {
    expect(nextWeeklyEntrega("2026-10-02", 1)).toBe("2026-10-05");
    expect(nextWeeklyEntrega("2026-10-05", 1)).toBe("2026-10-12");
    expect(upcomingWeeklyEntrega("2026-10-05", 1)).toBe("2026-10-05");
    expect(upcomingWeeklyEntrega("2026-10-02", 1)).toBe("2026-10-05");
  });

  it("guarda descrição com texto e descarta o editor vazio", () => {
    expect(normalizeTaskDescription("<p>Entregar criativos</p>")).toBe("<p>Entregar criativos</p>");
    expect(normalizeTaskDescription("<p></p>")).toBeNull();
    expect(normalizeTaskDescription("   ")).toBeNull();
  });

  it("leva a aprovação de conteúdo para a aba Conteúdos", () => {
    expect(taskAbaAction("conteudos")).toBe("Aprovar conteúdo");
    expect(taskAbaHref("conteudos", "admin", "Norte")).toBe("/admin/aprovacoes");
    expect(taskAbaHref("conteudos", "cliente", "Norte Mídia")).toBe(
      "/cliente/norte-midia/aprovacoes",
    );
    expect(taskAbaHref("crm", "cliente", "Norte Mídia")).toBe("/cliente/norte-midia/crm");
    expect(taskAbaHref("conexoes", "admin", "Norte")).toBe("/admin/conexoes");
  });

  it("marca atraso só em tarefa ainda aberta", () => {
    expect(isEntregaAtrasada("2026-10-01", "open", "2026-10-02")).toBe(true);
    expect(isEntregaAtrasada("2026-10-01", "completed", "2026-10-02")).toBe(false);
    expect(isEntregaAtrasada("2026-10-03", "open", "2026-10-02")).toBe(false);
  });
});
