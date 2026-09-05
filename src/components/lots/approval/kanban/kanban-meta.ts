import type { ContentCardStatus } from "@/modules/approval/types/content-card";

export type KanbanColumnMeta = {
  emoji: string;
  dotClass: string;
  headerClass: string;
};

export const KANBAN_COLUMN_META: Record<ContentCardStatus, KanbanColumnMeta> = {
  producao: {
    emoji: "🔴",
    dotClass: "bg-[color:var(--cw-col-producao)]",
    headerClass: "border-[color:var(--cw-col-producao)]/30 bg-[color:var(--cw-col-producao)]/8",
  },
  edicao: {
    emoji: "🟡",
    dotClass: "bg-[color:var(--cw-col-edicao)]",
    headerClass: "border-[color:var(--cw-col-edicao)]/30 bg-[color:var(--cw-col-edicao)]/8",
  },
  aguardando_aprovacao: {
    emoji: "🔵",
    dotClass: "bg-[color:var(--cw-col-aguardando)]",
    headerClass: "border-[color:var(--cw-col-aguardando)]/30 bg-[color:var(--cw-col-aguardando)]/8",
  },
  aprovado: {
    emoji: "🟢",
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
};

export function formatCardSchedule(data: string, hora: string | null): string {
  if (!hora) return data;
  return `${data} · ${hora.slice(0, 5)}`;
}

export function responsavelLabel(email: string | null): string {
  if (!email) return "—";
  return email.split("@")[0] ?? email;
}
