import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/lots/PageHeader";
import { SectionCard } from "@/components/lots/SectionCard";
import { Field, TextInput } from "@/components/lots/FormField";
import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/brand";
import {
  getAcquisitionGate,
  submitAccessApplication,
} from "@/modules/access/access-application.server";

export const Route = createFileRoute("/_authenticated/solicitar-acesso")({
  head: () => ({ meta: [{ title: `Pedido de acesso — ${BRAND_NAME}` }] }),
  component: SolicitarAcessoPage,
});

function SolicitarAcessoPage() {
  const gate = useQuery({
    queryKey: ["me", "acquisition-gate"],
    queryFn: () => getAcquisitionGate(),
  });
  const [fullName, setFullName] = useState("");
  const [document, setDocument] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await submitAccessApplication({ data: { fullName, document, whatsapp } });
      await gate.refetch();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar.");
    } finally {
      setSaving(false);
    }
  }

  const status = gate.data?.status;
  const waiting = gate.data?.gate === "wait" || status === "pending";

  return (
    <div className="mx-auto max-w-lg space-y-6 py-8">
      <PageHeader
        title="Pedido de acesso"
        description="A Lots analisa cada pedido antes de abrir a plataforma."
      />
      {waiting ? (
        <SectionCard title="Em análise">
          <p className="text-sm text-muted-foreground">
            Recebemos seu pedido. O acesso abre depois da aprovação. Você pode fechar esta página.
          </p>
        </SectionCard>
      ) : (
        <SectionCard title={status === "rejected" ? "Enviar novamente" : "Seus dados"}>
          <form className="space-y-4" onSubmit={onSubmit}>
            <Field label="Nome completo">
              <TextInput
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </Field>
            <Field label="CPF ou CNPJ">
              <TextInput
                value={document}
                onChange={(event) => setDocument(event.target.value)}
                required
              />
            </Field>
            <Field label="WhatsApp">
              <TextInput
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
                required
              />
            </Field>
            <Field label="E-mail">
              <TextInput value={gate.data?.email ?? ""} readOnly />
            </Field>
            {message && <p className="text-sm text-destructive">{message}</p>}
            <Button type="submit" disabled={saving || gate.isLoading}>
              {saving ? "Enviando…" : "Enviar pedido"}
            </Button>
          </form>
        </SectionCard>
      )}
    </div>
  );
}
