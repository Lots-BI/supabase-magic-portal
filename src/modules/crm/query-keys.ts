export const crmKeys = {
  coverage: (cadastroClienteId: number | "portfolio") =>
    ["crm", "coverage", cadastroClienteId] as const,
  people: (cadastroClienteId: number | "portfolio", days: number, view = "all") =>
    ["crm", "people", cadastroClienteId, days, view] as const,
  person: (id: string) => ["crm", "person", id] as const,
  portfolio: (days: number) => ["crm", "portfolio", days] as const,
  ranking: (cadastroClienteId: number, days: number) =>
    ["crm", "ranking", cadastroClienteId, days] as const,
};
