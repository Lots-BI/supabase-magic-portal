import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { registerAccessAccount } from "@/modules/access/access-application.server";
import { AuthShell } from "@/modules/auth/components/auth-shell";
import { BRAND_NAME } from "@/lib/brand";

export const Route = createFileRoute("/criar-conta")({
  head: () => ({ meta: [{ title: `Pedir acesso — ${BRAND_NAME}` }] }),
  component: CriarContaPage,
});

function CriarContaPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      await registerAccessAccount({ data: { email, password } });
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError) throw new Error("Conta criada. Entre com o e-mail e a senha.");
      await router.navigate({ to: "/solicitar-acesso" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Pedir acesso" subtitle="O acesso é analisado pela Lots antes de abrir.">
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm font-medium">
          E-mail
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="lots-focus mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-medium">
          Senha
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="lots-focus mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-medium">
          Confirmar senha
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className="lots-focus mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? "Aguarde…" : "Criar conta"}
        </button>
      </form>
      <p className="text-center text-xs text-muted-foreground">
        <a href="/privacidade" className="underline underline-offset-2 hover:text-foreground">
          Política de privacidade
        </a>
        {" · "}
        <a href="/termos" className="underline underline-offset-2 hover:text-foreground">
          Termos de serviço
        </a>
      </p>
    </AuthShell>
  );
}
