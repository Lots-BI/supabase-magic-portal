import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveIsAdmin } from "@/lib/owner-admin";
import { DIRETRIZES_BUCKET, DIRETRIZES_SIGNED_TTL_SEC, assertPdfUpload } from "@/lib/diretrizes";

type AuthCtx = {
  supabase: Parameters<typeof resolveIsAdmin>[0]["supabase"];
  userId: string;
  claims?: { email?: string | null };
};

async function assertAdmin(ctx: AuthCtx) {
  const ok = await resolveIsAdmin({
    supabase: ctx.supabase,
    userId: ctx.userId,
    email: ctx.claims?.email ?? undefined,
    repair: true,
  });
  if (!ok) throw new Error("Forbidden: admin role required");
}

export type DiretrizesMeta = {
  cadastroClienteId: number;
  storagePath: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
};

export type ClienteDiretrizesRow = {
  id: number;
  nome: string;
  slug: string | null;
  ativo: boolean;
  diretrizes: DiretrizesMeta | null;
};

export const listClienteDiretrizes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ClienteDiretrizesRow[]> => {
    await assertAdmin(context);

    const { data: clientes, error: clientesError } = await context.supabase
      .from("cadastro_clientes")
      .select("id,nome_cliente,slug,ativo")
      .order("nome_cliente", { ascending: true });
    if (clientesError) throw new Error(clientesError.message);

    const { data: docs, error: docsError } = await context.supabase
      .from("cliente_diretrizes")
      .select("cadastro_cliente_id,storage_path,file_name,file_size,uploaded_at");
    if (docsError) throw new Error(docsError.message);

    const byCliente = new Map(
      (docs ?? []).map((row) => [
        Number(row.cadastro_cliente_id),
        {
          cadastroClienteId: Number(row.cadastro_cliente_id),
          storagePath: String(row.storage_path),
          fileName: String(row.file_name),
          fileSize: Number(row.file_size),
          uploadedAt: String(row.uploaded_at),
        } satisfies DiretrizesMeta,
      ]),
    );

    return (clientes ?? []).map((cliente) => ({
      id: Number(cliente.id),
      nome: String(cliente.nome_cliente),
      slug: cliente.slug ? String(cliente.slug) : null,
      ativo: Boolean(cliente.ativo),
      diretrizes: byCliente.get(Number(cliente.id)) ?? null,
    }));
  });

export const saveClienteDiretrizes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cadastroClienteId: z.number().int().positive(),
        storagePath: z.string().min(1).max(500),
        fileName: z.string().min(1).max(255),
        fileSize: z.number().int().positive(),
        mimeType: z.string().min(1).max(100),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    assertPdfUpload({ name: data.fileName, type: data.mimeType, size: data.fileSize });

    const expectedPrefix = `${data.cadastroClienteId}/`;
    if (!data.storagePath.startsWith(expectedPrefix) || !data.storagePath.endsWith(".pdf")) {
      throw new Error("Caminho de arquivo inválido.");
    }

    const { data: previous } = await context.supabase
      .from("cliente_diretrizes")
      .select("storage_path")
      .eq("cadastro_cliente_id", data.cadastroClienteId)
      .maybeSingle();

    const { error: upsertError } = await context.supabase.from("cliente_diretrizes").upsert(
      {
        cadastro_cliente_id: data.cadastroClienteId,
        storage_path: data.storagePath,
        file_name: data.fileName,
        mime_type: "application/pdf",
        file_size: data.fileSize,
        uploaded_by: context.userId,
        uploaded_at: new Date().toISOString(),
      },
      { onConflict: "cadastro_cliente_id" },
    );
    if (upsertError) throw new Error(upsertError.message);

    const oldPath = previous?.storage_path ? String(previous.storage_path) : null;
    if (oldPath && oldPath !== data.storagePath) {
      await context.supabase.storage.from(DIRETRIZES_BUCKET).remove([oldPath]);
    }

    return { ok: true as const };
  });

export const deleteClienteDiretrizes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ cadastroClienteId: z.number().int().positive() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { data: row, error: readError } = await context.supabase
      .from("cliente_diretrizes")
      .select("storage_path")
      .eq("cadastro_cliente_id", data.cadastroClienteId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!row) return { ok: true as const };

    const { error: deleteError } = await context.supabase
      .from("cliente_diretrizes")
      .delete()
      .eq("cadastro_cliente_id", data.cadastroClienteId);
    if (deleteError) throw new Error(deleteError.message);

    await context.supabase.storage.from(DIRETRIZES_BUCKET).remove([String(row.storage_path)]);
    return { ok: true as const };
  });

export const getDiretrizesSignedUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ cadastroClienteId: z.number().int().positive() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("cliente_diretrizes")
      .select("storage_path,file_name,file_size,uploaded_at")
      .eq("cadastro_cliente_id", data.cadastroClienteId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    const { data: signed, error: signedError } = await context.supabase.storage
      .from(DIRETRIZES_BUCKET)
      .createSignedUrl(String(row.storage_path), DIRETRIZES_SIGNED_TTL_SEC);
    if (signedError || !signed?.signedUrl) {
      throw new Error(signedError?.message ?? "Não foi possível abrir o PDF.");
    }

    return {
      url: signed.signedUrl,
      fileName: String(row.file_name),
      fileSize: Number(row.file_size),
      uploadedAt: String(row.uploaded_at),
    };
  });
