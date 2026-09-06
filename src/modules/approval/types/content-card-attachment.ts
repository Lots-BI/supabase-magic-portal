export const ATTACHMENT_KINDS = ["image", "video", "pdf", "document", "audio"] as const;
export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

export const MEDIA_ROLES = ["preview", "attachment", "cliente_material", "final"] as const;
export type MediaRole = (typeof MEDIA_ROLES)[number];

export type ContentCardAttachment = {
  id: string;
  card_id: string;
  storage_path: string;
  mime_type: string;
  kind: AttachmentKind;
  media_role: MediaRole;
  file_name: string | null;
  file_size: number | null;
  ordem: number;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  poster_path: string | null;
  legacy_media_id: string | null;
  created_at: string;
};

export type ContentCardAttachmentInsert = Omit<ContentCardAttachment, "id" | "created_at"> & {
  id?: string;
};
