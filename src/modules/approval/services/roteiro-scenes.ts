export const ROTEIRO_SCENE_KEYS = ["gancho", "meio", "cta"] as const;
export type RoteiroSceneKey = (typeof ROTEIRO_SCENE_KEYS)[number];
export type RoteiroScenes = Record<RoteiroSceneKey, string>;

export const ROTEIRO_SCENE_LABELS: Record<RoteiroSceneKey, string> = {
  gancho: "Gancho",
  meio: "Meio",
  cta: "CTA",
};

const HEADING_TO_SCENE: Array<{ re: RegExp; key: RoteiroSceneKey }> = [
  { re: /\b(gancho|hook|abertura)\b/i, key: "gancho" },
  { re: /\b(meio|desenvolvimento|corpo)\b/i, key: "meio" },
  { re: /\b(cta|chamada|fechamento)\b/i, key: "cta" },
];

export function emptyRoteiroScenes(): RoteiroScenes {
  return { gancho: "", meio: "", cta: "" };
}

export function isRoteiroHtmlEmpty(html: string | null | undefined): boolean {
  if (!html) return true;
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length === 0;
}

export function composeRoteiroHtml(scenes: RoteiroScenes): string {
  return ROTEIRO_SCENE_KEYS.map((key) => {
    const inner = scenes[key]?.trim() || "<p></p>";
    return `<section data-scene="${key}">${inner}</section>`;
  }).join("");
}

export function parseRoteiroScenes(html: string | null | undefined): RoteiroScenes {
  const empty = emptyRoteiroScenes();
  if (!html?.trim()) return empty;

  const structured = parseStructuredScenes(html);
  if (structured) return structured;

  const byHeading = parseHeadingScenes(html);
  if (byHeading) return byHeading;

  return parseBlockScenes(html);
}

function parseStructuredScenes(html: string): RoteiroScenes | null {
  const re = /<section\b[^>]*\bdata-scene=["'](gancho|meio|cta)["'][^>]*>([\s\S]*?)<\/section>/gi;
  const found = emptyRoteiroScenes();
  let hits = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const key = match[1] as RoteiroSceneKey;
    found[key] = (match[2] ?? "").trim();
    hits += 1;
  }
  return hits > 0 ? found : null;
}

function parseHeadingScenes(html: string): RoteiroScenes | null {
  const headingRe = /<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  const matches = [...html.matchAll(headingRe)];
  if (matches.length === 0) return null;

  const mapped = matches
    .map((m) => {
      const text = stripTags(m[1] ?? "");
      const hit = HEADING_TO_SCENE.find((row) => row.re.test(text));
      return hit ? { index: m.index ?? 0, key: hit.key } : null;
    })
    .filter((row): row is { index: number; key: RoteiroSceneKey } => row != null);

  if (mapped.length === 0) return null;

  const scenes = emptyRoteiroScenes();
  for (let i = 0; i < mapped.length; i++) {
    const current = mapped[i]!;
    const start = matches.find((m) => (m.index ?? 0) === current.index);
    if (!start) continue;
    const contentStart = (start.index ?? 0) + start[0].length;
    const nextIndex = mapped[i + 1]?.index ?? html.length;
    scenes[current.key] = html.slice(contentStart, nextIndex).trim();
  }
  return scenes;
}

function parseBlockScenes(html: string): RoteiroScenes {
  const blocks = html
    .split(/(?=<p\b|<h[1-6]\b|<ul\b|<ol\b|<blockquote\b|<div\b)/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !isRoteiroHtmlEmpty(part));

  if (blocks.length === 0) {
    return isRoteiroHtmlEmpty(html)
      ? emptyRoteiroScenes()
      : { gancho: html.trim(), meio: "", cta: "" };
  }
  if (blocks.length === 1) {
    return { gancho: blocks[0]!, meio: "", cta: "" };
  }
  if (blocks.length === 2) {
    return { gancho: blocks[0]!, meio: "", cta: blocks[1]! };
  }
  return {
    gancho: blocks[0]!,
    meio: blocks.slice(1, -1).join(""),
    cta: blocks[blocks.length - 1]!,
  };
}

function stripTags(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
