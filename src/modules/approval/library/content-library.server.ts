import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { loadCallerAccess } from "@/modules/access/organization.server";
import { getClientAccessScope } from "@/modules/approval/internal/client-access.server";
import { ensureClientCardFolders } from "./card-library-folder.server";

const BUCKET = "editorial-media";

async function importarAnexos(
  admin: ReturnType<typeof getSupabaseAdmin>,
  cadastroClienteId: number,
) {
  const folderByCard = await ensureClientCardFolders(admin, cadastroClienteId);
  if (folderByCard.size === 0) return;
  const { data: anexos, error: anexosError } = await admin
    .from("content_card_attachments")
    .select("id, card_id, file_name, storage_path, mime_type, file_size")
    .in("card_id", [...folderByCard.keys()]);
  if (anexosError || !anexos?.length) return;
  const { data: ligados } = await admin
    .from("content_library_files")
    .select("id, attachment_id, folder_id")
    .eq("cadastro_cliente_id", cadastroClienteId)
    .not("attachment_id", "is", null);
  const ja = new Map(
    (ligados ?? [])
      .filter((row) => row.attachment_id)
      .map((row) => [row.attachment_id as string, row]),
  );
  const mover = (ligados ?? []).filter((row) => {
    const anexo = anexos.find((item) => item.id === row.attachment_id);
    const pasta = anexo ? folderByCard.get(anexo.card_id as string) : null;
    return pasta && row.folder_id !== pasta;
  });
  for (const row of mover) {
    const anexo = anexos.find((item) => item.id === row.attachment_id);
    const pasta = anexo ? folderByCard.get(anexo.card_id as string) : null;
    if (!pasta) continue;
    const { error } = await admin
      .from("content_library_files")
      .update({ folder_id: pasta })
      .eq("id", row.id);
    if (error) throw new Error(error.message);
  }
  const novos = anexos.filter((anexo) => anexo.storage_path && !ja.has(anexo.id as string));
  if (novos.length === 0) return;
  const { error } = await admin.from("content_library_files").insert(
    novos.map((anexo) => ({
      cadastro_cliente_id: cadastroClienteId,
      folder_id: folderByCard.get(anexo.card_id as string) ?? null,
      attachment_id: anexo.id,
      nome: (anexo.file_name as string | null)?.trim() || "Arquivo enviado",
      storage_path: anexo.storage_path,
      mime_type: anexo.mime_type,
      file_size: anexo.file_size,
    })),
  );
  if (error && !/duplicate|unique/i.test(error.message)) throw new Error(error.message);
}

async function assertLibraryAccess(
  context: { supabase: Parameters<typeof getClientAccessScope>[0]; userId: string },
  cadastroClienteId: number,
) {
  const access = await loadCallerAccess(context);
  const operacional = access.isPlatformOwner || access.isOperational || access.isGlobalAdmin;
  if (operacional) return;
  const scope = await getClientAccessScope(context.supabase, context.userId);
  if (!scope.cadastroClienteIds.includes(cadastroClienteId)) {
    throw new Error("Sem acesso a esta biblioteca.");
  }
}

export const listContentLibrary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ cadastroClienteId: z.number().int().positive() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertLibraryAccess(context, data.cadastroClienteId);
    const admin = getSupabaseAdmin();
    await importarAnexos(admin, data.cadastroClienteId);
    const [foldersRes, filesRes] = await Promise.all([
      admin
        .from("content_library_folders")
        .select("id, parent_id, nome")
        .eq("cadastro_cliente_id", data.cadastroClienteId)
        .order("nome"),
      admin
        .from("content_library_files")
        .select("id, folder_id, nome, storage_path, mime_type, file_size, created_at")
        .eq("cadastro_cliente_id", data.cadastroClienteId)
        .order("nome"),
    ]);
    if (foldersRes.error) throw new Error(foldersRes.error.message);
    if (filesRes.error) throw new Error(filesRes.error.message);
    const files = await Promise.all(
      (filesRes.data ?? []).map(async (file) => {
        const [signed, download] = await Promise.all([
          admin.storage.from(BUCKET).createSignedUrl(file.storage_path, 3600),
          admin.storage
            .from(BUCKET)
            .createSignedUrl(file.storage_path, 3600, { download: file.nome as string }),
        ]);
        return {
          id: file.id as string,
          folderId: (file.folder_id as string | null) ?? null,
          nome: file.nome as string,
          mimeType: (file.mime_type as string | null) ?? null,
          fileSize: file.file_size != null ? Number(file.file_size) : null,
          url: signed.data?.signedUrl ?? null,
          downloadUrl: download.data?.signedUrl ?? signed.data?.signedUrl ?? null,
        };
      }),
    );
    return {
      folders: (foldersRes.data ?? []).map((folder) => ({
        id: folder.id as string,
        parentId: (folder.parent_id as string | null) ?? null,
        nome: folder.nome as string,
      })),
      files,
    };
  });

export const createLibraryFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        cadastroClienteId: z.number().int().positive(),
        parentId: z.string().uuid().nullable(),
        nome: z.string().trim().min(1).max(120),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertLibraryAccess(context, data.cadastroClienteId);
    const { error } = await getSupabaseAdmin().from("content_library_folders").insert({
      cadastro_cliente_id: data.cadastroClienteId,
      parent_id: data.parentId,
      nome: data.nome,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const prepareLibraryUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        cadastroClienteId: z.number().int().positive(),
        folderId: z.string().uuid().nullable(),
        nome: z.string().trim().min(1).max(180),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertLibraryAccess(context, data.cadastroClienteId);
    const safe = data.nome.replace(/[^\w.\- ]+/g, "").slice(0, 120) || "arquivo";
    const path = `${data.cadastroClienteId}/biblioteca/${crypto.randomUUID()}-${safe}`;
    const signed = await getSupabaseAdmin().storage.from(BUCKET).createSignedUploadUrl(path);
    if (signed.error || !signed.data)
      throw new Error(signed.error?.message ?? "Upload indisponível.");
    return { path, token: signed.data.token };
  });

export const confirmLibraryFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        cadastroClienteId: z.number().int().positive(),
        folderId: z.string().uuid().nullable(),
        nome: z.string().trim().min(1).max(180),
        path: z.string().min(1),
        mimeType: z.string().max(120).nullable(),
        fileSize: z.number().int().nonnegative().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertLibraryAccess(context, data.cadastroClienteId);
    if (!data.path.startsWith(`${data.cadastroClienteId}/biblioteca/`)) {
      throw new Error("Arquivo fora da biblioteca.");
    }
    const { error } = await getSupabaseAdmin().from("content_library_files").insert({
      cadastro_cliente_id: data.cadastroClienteId,
      folder_id: data.folderId,
      nome: data.nome,
      storage_path: data.path,
      mime_type: data.mimeType,
      file_size: data.fileSize,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const moveLibraryFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        cadastroClienteId: z.number().int().positive(),
        fileIds: z.array(z.string().uuid()).min(1).max(200),
        folderId: z.string().uuid().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertLibraryAccess(context, data.cadastroClienteId);
    const { error } = await getSupabaseAdmin()
      .from("content_library_files")
      .update({ folder_id: data.folderId })
      .in("id", data.fileIds)
      .eq("cadastro_cliente_id", data.cadastroClienteId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const renameLibraryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        cadastroClienteId: z.number().int().positive(),
        kind: z.enum(["file", "folder"]),
        id: z.string().uuid(),
        nome: z.string().trim().min(1).max(180),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertLibraryAccess(context, data.cadastroClienteId);
    const tabela = data.kind === "folder" ? "content_library_folders" : "content_library_files";
    const { error } = await getSupabaseAdmin()
      .from(tabela)
      .update({ nome: data.nome })
      .eq("id", data.id)
      .eq("cadastro_cliente_id", data.cadastroClienteId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const listMaterialStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ cadastroClienteId: z.number().int().positive() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertLibraryAccess(context, data.cadastroClienteId);
    const admin = getSupabaseAdmin();
    const { data: cards, error } = await admin
      .from("content_cards")
      .select("id, titulo, status")
      .eq("cadastro_cliente_id", data.cadastroClienteId)
      .neq("status", "arquivado");
    if (error) throw new Error(error.message);
    const ids = (cards ?? []).map((card) => card.id as string);
    if (ids.length === 0) return [];
    const { data: files, error: filesError } = await admin
      .from("content_card_attachments")
      .select("card_id, file_name, downloaded_at")
      .in("card_id", ids)
      .eq("media_role", "cliente_material");
    if (filesError) throw new Error(filesError.message);
    return (cards ?? [])
      .map((card) => {
        const materiais = (files ?? []).filter((file) => file.card_id === card.id);
        if (materiais.length === 0) return null;
        return {
          cardId: card.id as string,
          titulo: card.titulo as string,
          baixado: materiais.every((file) => Boolean(file.downloaded_at)),
        };
      })
      .filter((item): item is { cardId: string; titulo: string; baixado: boolean } => item != null);
  });
