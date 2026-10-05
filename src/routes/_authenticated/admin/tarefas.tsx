import { createFileRoute } from "@tanstack/react-router";
import { TaskSheet } from "@/components/lots/admin/TaskSheet";
import { PageHeader } from "@/components/lots/PageHeader";
import { adminTitle } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/admin/tarefas")({
  head: () => ({ meta: [{ title: adminTitle("Tarefas") }] }),
  component: TarefasPage,
});

function TarefasPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operação"
        title="Tarefas"
        description="Planilha das entregas. Ao lado do status, escolha a aba. Depois de gravada, o campo vira o botão dessa aba. A caixa à esquerda seleciona para excluir."
      />
      <TaskSheet />
    </div>
  );
}
