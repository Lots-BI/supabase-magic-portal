import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { createUserAccount, listClientes } from "@/lib/admin.functions";
import { PageHeader } from "@/components/lots/PageHeader";
import { Field, FormRow, TextInput, Select } from "@/components/lots/FormField";
import { SectionCard } from "@/components/lots/SectionCard";
import { adminTitle, BRAND_NAME } from "@/lib/brand";
import { Copy, Send, KeyRound } from "lucide-react";

const clientesQuery = {
  queryKey: ["admin", "clientes", "list"],
  queryFn: () => listClientes(),
};

export const Route = createFileRoute("/_authenticated/admin/usuarios/novo")({
  head: () => ({ meta: [{ title: adminTitle("Novo usuário") }] }),
  loader: ({ context }) => (context as any).queryClient.ensureQueryData(clientesQuery),
  component: NovoUsuarioPage,
  errorComponent: ({ error }) => (
    <div className="lots-surface p-4 text-sm text-destructive">Erro: {error.message}</div>
  ),
});

function NovoUsuarioPage() {
  const router = useRouter();
  const { data: clientes } = useSuspenseQuery(clientesQuery);
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"cliente" | "admin">("cliente");
  const [mode, setMode] = useState<"invite" | "password">("invite");
  const [clienteId, setClienteId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{
    invite_sent: boolean;
    temp_password: string | null;
    user_id: string;
    invite_redirect_to?: string | null;
  } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Informe o email do usuário.");
      return;
    }
    setSaving(true);
    try {
      const res = await createUserAccount({
        data: {
          email: email.trim(),
          nome: nome.trim() || null,
          tipo,
          mode,
          cadastro_cliente_id: clienteId ? Number(clienteId) : null,
          client_origin: window.location.origin,
        },
      });
      setResult(res);
      toast.success(
        res.invite_sent ? "Convite enviado por email." : "Usuário criado com senha temporária.",
      );
    } catch (err: any) {
      const msg = err?.message ?? "Falha ao criar usuário.";
      toast.error(msg);
      if (/já está cadastrado|reenviar convite/i.test(msg)) {
        toast.message("Dica", {
          description: "Vá em Admin → Usuários, filtre por Pendentes e use “Reenviar e-mail”.",
        });
      }
    } finally {
      setSaving(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Usuários"
          title="Usuário criado"
          description="Compartilhe os dados de acesso com o cliente."
        />
        <SectionCard eyebrow="Acesso" title={email}>
          <div className="space-y-3 text-[13px]">
            {result.invite_sent ? (
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-foreground">
                  <Send className="h-4 w-4 text-primary" /> Convite enviado por email. O usuário
                  receberá um link para definir a senha.
                </p>
                {result.invite_redirect_to && (
                  <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                    Link de redirecionamento:{" "}
                    <span className="font-mono text-foreground">{result.invite_redirect_to}</span>
                  </p>
                )}
              </div>
            ) : (
              <>
                <p className="flex items-center gap-2 text-foreground">
                  <KeyRound className="h-4 w-4 text-primary" /> Senha temporária gerada. Compartilhe
                  com o usuário de forma segura.
                </p>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-[13px]">
                  <span className="flex-1 select-all">{result.temp_password}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(result.temp_password ?? "");
                      toast.success("Senha copiada.");
                    }}
                    className="lots-focus inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="h-3 w-3" /> Copiar
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="mt-5 flex gap-2">
            <button
              onClick={() => router.navigate({ to: "/admin/usuarios" })}
              className="lots-focus h-9 rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground"
            >
              Ir para usuários
            </button>
            <button
              onClick={() => {
                setResult(null);
                setEmail("");
                setNome("");
                setClienteId("");
              }}
              className="lots-focus h-9 rounded-lg border border-border bg-card px-4 text-[13px] font-medium text-muted-foreground hover:text-foreground"
            >
              Criar outro
            </button>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Usuários"
        title="Novo usuário"
        description={`Crie acesso para administradores internos ou para clientes do ${BRAND_NAME}.`}
      />
      <form onSubmit={onSubmit} className="space-y-5">
        <SectionCard eyebrow="Identidade" title="Dados do usuário">
          <FormRow cols={2}>
            <Field label="Email" required>
              <TextInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@empresa.com.br"
                autoComplete="off"
              />
            </Field>
            <Field label="Nome completo" hint="Opcional, ajuda na identificação.">
              <TextInput
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Maria Silva"
              />
            </Field>
          </FormRow>
        </SectionCard>

        <SectionCard eyebrow="Permissões" title="Tipo de acesso">
          <FormRow cols={2}>
            <Field label="Perfil" required>
              <Select value={tipo} onChange={(e) => setTipo(e.target.value as any)}>
                <option value="cliente">Cliente</option>
                <option value="admin">Administrador</option>
              </Select>
            </Field>
            <Field
              label="Cliente vinculado"
              hint={
                tipo === "admin"
                  ? "Opcional. Admins têm acesso a tudo."
                  : "Vincule o cliente para liberar o acesso ao painel."
              }
            >
              <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                <option value="">— sem vínculo —</option>
                {(clientes as any[]).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome_cliente}
                  </option>
                ))}
              </Select>
            </Field>
          </FormRow>
        </SectionCard>

        <SectionCard eyebrow="Acesso" title="Como o usuário receberá a senha?">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {(
              [
                {
                  key: "invite",
                  title: "Convite por email",
                  desc: "O usuário define a própria senha através do link recebido.",
                },
                {
                  key: "password",
                  title: "Senha temporária",
                  desc: "O sistema gera uma senha. Você compartilha manualmente.",
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setMode(opt.key)}
                className={
                  "lots-focus rounded-lg border p-3 text-left transition-colors " +
                  (mode === opt.key
                    ? "border-primary bg-primary/8"
                    : "border-border hover:border-primary-300")
                }
              >
                <p className="text-[13px] font-medium text-foreground">{opt.title}</p>
                <p className="mt-1 text-[11.5px] text-muted-foreground">{opt.desc}</p>
              </button>
            ))}
          </div>
        </SectionCard>

        <div className="sticky bottom-3 flex items-center justify-end gap-2 rounded-xl border border-border bg-background/95 p-3 backdrop-blur">
          <button
            type="button"
            onClick={() => router.navigate({ to: "/admin/usuarios" })}
            className="lots-focus h-9 rounded-lg border border-border bg-card px-4 text-[13px] font-medium text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="lots-focus h-9 rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Criando…" : "Criar usuário"}
          </button>
        </div>
      </form>
    </div>
  );
}
