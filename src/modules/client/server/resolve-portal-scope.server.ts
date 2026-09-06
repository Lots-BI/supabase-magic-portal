import { slugify } from "@/lib/slug";
import type { ClientAccessScope } from "@/modules/approval/internal/client-access.server";
import { assertClientPortalAccess } from "@/modules/approval/internal/client-access.server";
import { isStaffMember } from "@/modules/approval/internal/staff-auth.server";
import type { ClientScopeInput } from "../scope-input";

type AuthCtx = {
  supabase: Parameters<typeof assertClientPortalAccess>[0]["supabase"];
  userId: string;
  claims?: { email?: string | null };
};

async function loadCadastroBySlug(
  ctx: AuthCtx,
  slug: string,
): Promise<{ id: number; nome: string }> {
  const { data: cad, error } = await ctx.supabase
    .from("cadastro_clientes")
    .select("id, nome_cliente, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!cad?.id) {
    throw new Error("Cliente não encontrado.");
  }

  return { id: Number(cad.id), nome: String(cad.nome_cliente) };
}

/**
 * Resolve o escopo do portal.
 * - client_access: vínculo real do usuário (portal do cliente).
 * - slug_context: preview da agência OU cliente abrindo a URL /cliente/:slug
 *   (neste caso o slug precisa pertencer ao vínculo do usuário).
 */
export async function resolvePortalScope(
  ctx: AuthCtx,
  input: ClientScopeInput,
): Promise<ClientAccessScope> {
  if (input.mode === "client_access") {
    return assertClientPortalAccess(ctx);
  }

  const slug = slugify(input.slug);
  const cad = await loadCadastroBySlug(ctx, slug);

  if (await isStaffMember(ctx)) {
    return {
      cadastroClienteIds: [cad.id],
      clientNames: [cad.nome],
    };
  }

  const own = await assertClientPortalAccess(ctx);
  if (!own.cadastroClienteIds.includes(cad.id)) {
    throw new Error("Você não tem acesso a estes conteúdos.");
  }

  return {
    cadastroClienteIds: [cad.id],
    clientNames: [cad.nome],
  };
}
