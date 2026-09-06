import type { ContentCardStatus } from "@/modules/approval/types/content-card";

export type KanbanColumnMeta = {
  emoji: string;
  dotClass: string;
  headerClass: string;
};

export const KANBAN_COLUMN_META: Record<ContentCardStatus, KanbanColumnMeta> = {
  roteiro: {
    emoji: "📝",
    dotClass: "bg-[color:var(--cw-col-edicao)]",
    headerClass: "border-[color:var(--cw-col-edicao)]/30 bg-[color:var(--cw-col-edicao)]/8",
  },
  aguardando_aprovacao: {
    emoji: "🔵",
    dotClass: "bg-[color:var(--cw-col-aguardando)]",
    headerClass: "border-[color:var(--cw-col-aguardando)]/30 bg-[color:var(--cw-col-aguardando)]/8",
  },
  aguardando_material: {
    emoji: "📎",
    dotClass: "bg-[color:var(--cw-col-aguardando)]",
    headerClass: "border-[color:var(--cw-col-aguardando)]/30 bg-[color:var(--cw-col-aguardando)]/8",
  },
  producao: {
    emoji: "🔴",
    dotClass: "bg-[color:var(--cw-col-producao)]",
    headerClass: "border-[color:var(--cw-col-producao)]/30 bg-[color:var(--cw-col-producao)]/8",
  },
  aguardando_aprovacao_final: {
    emoji: "🟣",
    dotClass: "bg-[color:var(--cw-col-aprovado)]",
    headerClass: "border-[color:var(--cw-col-aprovado)]/30 bg-[color:var(--cw-col-aprovado)]/8",
  },
  agendado: {
    emoji: "📅",
    dotClass: "bg-[color:var(--cw-col-aprovado)]",
    headerClass: "border-[color:var(--cw-col-aprovado)]/30 bg-[color:var(--cw-col-aprovado)]/8",
  },
  publicado: {
    emoji: "⚫",
    dotClass: "bg-[color:var(--cw-col-publicado)]",
    headerClass: "border-[color:var(--cw-col-publicado)]/30 bg-[color:var(--cw-col-publicado)]/8",
  },
  arquivado: {
    emoji: "📦",
    dotClass: "bg-muted-foreground",
    headerClass: "border-border bg-muted/40",
  },
  edicao: {
    emoji: "🟡",
    dotClass: "bg-[color:var(--cw-col-edicao)]",
    headerClass: "border-[color:var(--cw-col-edicao)]/30 bg-[color:var(--cw-col-edicao)]/8",
  },
  aprovado: {
    emoji: "🟢",
    dotClass: "bg-[color:var(--cw-col-aprovado)]",
    headerClass: "border-[color:var(--cw-col-aprovado)]/30 bg-[color:var(--cw-col-aprovado)]/8",
  },
};

export function formatCardSchedule(data: string, hora: string | null): string {
  const day = data.includes("-")
    ? data.replace(/^(\d{4})-(\d{2})-(\d{2}).*$/, "$3/$2/$1")
    : data;
  if (!hora) return day;
  return `${day} · ${hora.slice(0, 5)}`;
}

export function responsavelLabel(email: string | null): string {
  if (!email) return "—";
  return email.split("@")[0] ?? email;
}

export function publishConfirmationLabel(card: {
  status: ContentCardStatus;
  publish_status: string;
  publish_error: string | null;
}): string | null {
  if (card.publish_status === "published") return "Publicado no Instagram";
  if (card.publish_status === "failed") {
    return card.publish_error ? `Falha na publicação: ${card.publish_error}` : "Falha na publicação";
  }
  if (card.publish_status === "publishing" || card.publish_status === "queued") {
    return "Confirmando publicação…";
  }
  if (card.status === "agendado" && (card.publish_status === "scheduled" || card.publish_status === "none")) {
    return "Agendado no Lots — publica no horário";
  }
  return null;
}
