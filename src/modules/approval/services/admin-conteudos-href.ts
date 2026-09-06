/** Volta ao workspace Conteúdos no calendário, preservando o cliente. */
export function adminConteudosCalendarHref(cadastroClienteId: number): {
  to: "/admin/aprovacoes";
  search: { cliente: number; tab: "calendar" };
} {
  return {
    to: "/admin/aprovacoes",
    search: { cliente: cadastroClienteId, tab: "calendar" },
  };
}
