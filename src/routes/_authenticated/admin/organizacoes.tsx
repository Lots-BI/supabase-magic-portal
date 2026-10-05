import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/lots/PageHeader";
import { SectionCard } from "@/components/lots/SectionCard";
import { Field, TextInput } from "@/components/lots/FormField";
import { Button } from "@/components/ui/button";
import { adminTitle } from "@/lib/brand";
import { isPlatformOwnerEmail } from "@/lib/platform-owner";
import { createOrganization, listOrganizations } from "@/modules/access/organization.server";

export const Route = createFileRoute("/_authenticated/admin/organizacoes")({
  head: () => ({ meta: [{ title: adminTitle("Organizações") }] }),
  beforeLoad: ({ context }) => {
    const user = (context as { user?: { email?: string | null } }).user;
    if (!isPlatformOwnerEmail(user?.email)) throw redirect({ to: "/admin" });
  },
  component: OrganizacoesPage,
});

function OrganizacoesPage() {
  const queryClient = useQueryClient();
  const orgs = useQuery({
    queryKey: ["admin", "organizations"],
    queryFn: () => listOrganizations(),
  });
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await createOrganization({ data: { name, slug } });
      setName("");
      setSlug("");
      await queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] });
      toast.success("Organização criada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizações"
        description="Cada agência vê só os próprios clientes, conexões e conteúdos."
      />
      <SectionCard title="Nova organização">
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={onCreate}>
          <Field label="Nome">
            <TextInput value={name} onChange={(event) => setName(event.target.value)} required />
          </Field>
          <Field label="Slug">
            <TextInput
              value={slug}
              onChange={(event) => setSlug(event.target.value.toLowerCase())}
              pattern="[a-z0-9-]+"
              required
            />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Criando…" : "Criar"}
            </Button>
          </div>
        </form>
      </SectionCard>
      <SectionCard title="Agências">
        {orgs.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : orgs.error ? (
          <p className="text-sm text-destructive">
            {orgs.error instanceof Error ? orgs.error.message : "Erro ao listar"}
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {(orgs.data ?? []).map((org) => (
              <li key={org.id} className="flex items-center justify-between gap-3">
                <span>{org.name}</span>
                <span className="text-muted-foreground">{org.slug}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
