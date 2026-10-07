import type { SupabaseClient } from "@supabase/supabase-js";
import { cardLibraryFolderName } from "./card-library-folder";

type CardFolderInput = {
  id: string;
  cadastro_cliente_id: number;
  data_publicacao: string;
  titulo: string;
};

type AttachmentInput = {
  id: string;
  file_name: string | null;
  storage_path: string;
  mime_type: string | null;
  file_size: number | null;
};

export async function ensureCardLibraryFolder(
  admin: SupabaseClient,
  card: CardFolderInput,
): Promise<string> {
  const nome = cardLibraryFolderName(card.data_publicacao, card.titulo);
  const { data: existing, error: findError } = await admin
    .from("content_library_folders")
    .select("id, nome")
    .eq("card_id", card.id)
    .maybeSingle();
  if (findError) throw new Error(findError.message);
  if (existing?.id) {
    if (existing.nome !== nome) {
      const { error } = await admin
        .from("content_library_folders")
        .update({ nome })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    }
    return existing.id as string;
  }

  const { data, error } = await admin
    .from("content_library_folders")
    .insert({
      cadastro_cliente_id: card.cadastro_cliente_id,
      parent_id: null,
      nome,
      card_id: card.id,
    })
    .select("id")
    .single();
  if (error) {
    const { data: raced } = await admin
      .from("content_library_folders")
      .select("id")
      .eq("card_id", card.id)
      .maybeSingle();
    if (raced?.id) return raced.id as string;
    throw new Error(error.message);
  }
  return data.id as string;
}

export async function syncAttachmentToCardLibrary(
  admin: SupabaseClient,
  card: CardFolderInput,
  attachment: AttachmentInput,
): Promise<void> {
  const folderId = await ensureCardLibraryFolder(admin, card);
  const { data: existing, error: findError } = await admin
    .from("content_library_files")
    .select("id, folder_id")
    .eq("attachment_id", attachment.id)
    .maybeSingle();
  if (findError) throw new Error(findError.message);
  if (existing?.id) {
    if (existing.folder_id !== folderId) {
      const { error } = await admin
        .from("content_library_files")
        .update({ folder_id: folderId })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    }
    return;
  }
  const { error } = await admin.from("content_library_files").insert({
    cadastro_cliente_id: card.cadastro_cliente_id,
    folder_id: folderId,
    attachment_id: attachment.id,
    nome: attachment.file_name?.trim() || "Arquivo enviado",
    storage_path: attachment.storage_path,
    mime_type: attachment.mime_type,
    file_size: attachment.file_size,
  });
  if (error && !/duplicate|unique/i.test(error.message)) throw new Error(error.message);
}

export async function ensureClientCardFolders(
  admin: SupabaseClient,
  cadastroClienteId: number,
): Promise<Map<string, string>> {
  const { data: cards, error: cardsError } = await admin
    .from("content_cards")
    .select("id, titulo, data_publicacao, cadastro_cliente_id")
    .eq("cadastro_cliente_id", cadastroClienteId)
    .neq("status", "arquivado");
  if (cardsError) throw new Error(cardsError.message);

  const { data: folders, error: foldersError } = await admin
    .from("content_library_folders")
    .select("id, card_id, nome")
    .eq("cadastro_cliente_id", cadastroClienteId)
    .not("card_id", "is", null);
  if (foldersError) throw new Error(foldersError.message);

  const byCard = new Map<string, { id: string; nome: string }>();
  for (const folder of folders ?? []) {
    if (folder.card_id) {
      byCard.set(folder.card_id as string, {
        id: folder.id as string,
        nome: folder.nome as string,
      });
    }
  }

  const folderByCard = new Map<string, string>();
  for (const card of cards ?? []) {
    const nome = cardLibraryFolderName(card.data_publicacao as string, card.titulo as string);
    const found = byCard.get(card.id as string);
    if (found) {
      if (found.nome !== nome) {
        const { error } = await admin
          .from("content_library_folders")
          .update({ nome })
          .eq("id", found.id);
        if (error) throw new Error(error.message);
      }
      folderByCard.set(card.id as string, found.id);
      continue;
    }
    const { data, error } = await admin
      .from("content_library_folders")
      .insert({
        cadastro_cliente_id: cadastroClienteId,
        parent_id: null,
        nome,
        card_id: card.id,
      })
      .select("id")
      .single();
    if (error) {
      const { data: raced } = await admin
        .from("content_library_folders")
        .select("id")
        .eq("card_id", card.id)
        .maybeSingle();
      if (!raced?.id) throw new Error(error.message);
      folderByCard.set(card.id as string, raced.id as string);
      continue;
    }
    folderByCard.set(card.id as string, data.id as string);
  }
  return folderByCard;
}
