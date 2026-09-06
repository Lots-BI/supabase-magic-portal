import type { ChecklistItem, ContentFormato } from "../types/content-card";

function item(
  id: string,
  label: string,
  opts?: { auto?: boolean; required?: boolean },
): ChecklistItem {
  return {
    id,
    label,
    done: false,
    auto: opts?.auto ?? false,
    required: opts?.required ?? true,
  };
}

export function buildProductionChecklist(formato: ContentFormato | string | null): ChecklistItem[] {
  const f = (formato ?? "estatico") as ContentFormato;
  const base: ChecklistItem[] = [
    item("material_recebido", "Material do cliente recebido", { auto: true, required: true }),
    item("roteiro_aprovado", "Roteiro aprovado", { auto: true, required: true }),
  ];

  if (f === "carrossel") {
    return [
      ...base,
      item("media_final", "Pelo menos 2 imagens finais anexadas", { required: true }),
      item("legenda_cta", "Legenda preenchida", { required: true }),
      item("preview_ok", "Preview revisado", { required: true }),
    ];
  }

  if (f === "reels") {
    return [
      ...base,
      item("media_final", "Vídeo do Reels anexado", { required: true }),
      item("legenda_cta", "Legenda preenchida", { required: true }),
      item("preview_ok", "Preview revisado", { required: true }),
    ];
  }

  return [
    ...base,
    item("media_final", "Imagem final anexada", { required: true }),
    item("legenda_cta", "Legenda preenchida", { required: true }),
    item("preview_ok", "Preview revisado", { required: true }),
  ];
}
