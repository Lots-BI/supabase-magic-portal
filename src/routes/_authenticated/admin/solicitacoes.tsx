import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/lots/PageHeader";
import { SectionCard } from "@/components/lots/SectionCard";
import { Button } from "@/components/ui/button";
import { adminTitle } from "@/lib/brand";
import { isPlatformOwnerEmail } from "@/lib/platform-owner";
import { whatsappHref } from "@/modules/access/brazil-document";
import {
  listAccessApplications,
  reviewAccessApplication,
} from "@/modules/access/access-application.server";

export const Route = createFileRoute("/_authenticated/admin/solicitacoes")({
  head: () => ({ meta: [{ title: adminTitle("Pedidos de acesso") }] }),
  beforeLoad: ({ context }) => {
    const user = (context as { user?: { email?: string | null } }).user;
    if (!isPlatformOwnerEmail(user?.email)) throw redirect({ to: "/admin" });
  },
  component: SolicitacoesPage,
});

function SolicitacoesPage() {
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: ["admin", "access-applications"],
    queryFn: () => listAccessApplications(),
  });

  async function review(userId: string, decision: "approve" | "reject") {
    await reviewAccessApplication({ data: { userId, decision } });
    await queryClient.invalidateQueries({ queryKey: ["admin", "access-applications"] });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos de acesso"
        description="Quem pediu entrada ainda não tem organização. Aprovar cria a agência."
      />
      <SectionCard title="Fila">
        {list.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : list.error ? (
          <p className="text-sm text-destructive">
            {list.error instanceof Error ? list.error.message : "Erro ao listar"}
          </p>
        ) : (
          <ul className="space-y-4">
            {(list.data ?? []).map((item) => (
              <li key={item.user_id} className="space-y-2 border-b border-border pb-4 text-sm">
                <p className="font-medium">{item.full_name}</p>
                <p>{item.email}</p>
                <p>
                  {item.document_kind.toUpperCase()} {item.document_digits}
                </p>
                <a className="text-primary underline" href={whatsappHref(item.whatsapp_digits)}>
                  WhatsApp
                </a>
                <p className="text-muted-foreground">{item.status}</p>
                {item.status === "pending" && (
                  <div className="flex gap-2">
                    <Button type="button" onClick={() => review(item.user_id, "approve")}>
                      Aprovar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => review(item.user_id, "reject")}
                    >
                      Recusar
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
