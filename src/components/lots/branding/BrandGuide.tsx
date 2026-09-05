import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { LotsBIWordmark, LotsBIIcon } from "@/components/lots/LotsMark";
import { PageHeader } from "@/components/lots/PageHeader";
import { SectionCard } from "@/components/lots/SectionCard";
import { Button } from "@/components/ui/button";
import {
  BRAND_ASSETS,
  BRAND_ASSET_ITEMS,
  BRAND_COLOR_SWATCHES,
  BRAND_COLORS,
  BRAND_DESCRIPTION,
  BRAND_NAME,
  BRAND_TAGLINE,
  BRAND_TYPOGRAPHY,
} from "@/lib/brand";
import { cn } from "@/lib/utils";

function CopyHexButton({ hex }: { hex: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(true);
      toast.success("Copiado", { description: hex });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="lots-focus inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
      title="Copiar hex"
    >
      {hex}
      {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function ColorSwatch({
  name,
  hex,
  role,
  cssVar,
}: {
  name: string;
  hex: string;
  role: string;
  cssVar?: string;
}) {
  const lightText = hex.toUpperCase() === "#000000" || hex.toUpperCase() === "#2C2E3B";

  return (
    <div className="lots-surface overflow-hidden p-0">
      <div
        className="h-20 w-full border-b border-border"
        style={{ backgroundColor: hex }}
        aria-hidden
      />
      <div className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-medium text-foreground">{name}</p>
          <span
            className={cn(
              "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
              lightText ? "bg-muted text-muted-foreground" : "bg-foreground/10 text-foreground",
            )}
          >
            HEX
          </span>
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{role}</p>
        <CopyHexButton hex={hex} />
        {cssVar && (
          <p className="font-mono text-[10px] text-muted-foreground">
            CSS: <span className="text-foreground">{cssVar}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function AssetCard({
  label,
  description,
  url,
}: {
  label: string;
  description: string;
  url: string;
}) {
  const isSvg = url.endsWith(".svg");

  return (
    <div className="lots-surface flex flex-col gap-3 p-4">
      <div className="flex min-h-[88px] items-center justify-center rounded-lg border border-border bg-muted/30 p-4">
        <img
          src={url}
          alt={label}
          className={cn("max-h-16 max-w-full object-contain", isSvg && "max-h-14")}
          referrerPolicy="no-referrer"
          decoding="async"
        />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-[13px] font-medium">{label}</p>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
      <Button variant="outline" size="sm" className="w-full" asChild>
        <a href={url} target="_blank" rel="noopener noreferrer">
          Abrir asset <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </Button>
    </div>
  );
}

export function BrandGuide() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Plataforma"
        title="Branding Lots BI"
        description="Identidade visual oficial da plataforma — cores, tipografia, assets e gradientes para uso interno da equipe."
      />

      <SectionCard title="Marca" description={BRAND_DESCRIPTION}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <LotsBIWordmark size="lg" />
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Nome:</span>{" "}
              <strong className="font-medium">{BRAND_NAME}</strong>
            </p>
            <p>
              <span className="text-muted-foreground">Tagline:</span> {BRAND_TAGLINE}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Gradiente de marca"
        description="Roxo → azul — símbolo, wordmark e CTAs hero."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div
            className="flex h-28 items-end rounded-xl p-4 text-sm font-medium text-white shadow-md"
            style={{
              backgroundImage: `linear-gradient(135deg, ${BRAND_COLORS.purple}, ${BRAND_COLORS.blue})`,
            }}
          >
            135° · Primary → Secondary
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
            <LotsBIIcon size="lg" />
            <div className="space-y-2">
              <p className="text-[13px] font-medium">Lockup ao vivo</p>
              <p className="text-[11px] text-muted-foreground">
                Componente{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                  LotsBIWordmark
                </code>
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Paleta de cores" description="Âncoras hex do design system Lots BI.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BRAND_COLOR_SWATCHES.map((swatch) => (
            <ColorSwatch key={swatch.hex + swatch.name} {...swatch} />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Tipografia" description="Fontes carregadas via @fontsource-variable.">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="lots-surface space-y-2 p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Display
            </p>
            <p className="font-display text-2xl font-semibold tracking-tight">
              {BRAND_TYPOGRAPHY.display}
            </p>
            <p className="font-display text-lg">Títulos e KPIs</p>
            <p className="font-mono text-[10px] text-muted-foreground">font-display · Urbanist</p>
          </div>
          <div className="lots-surface space-y-2 p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Sans
            </p>
            <p className="text-2xl font-semibold">{BRAND_TYPOGRAPHY.sans}</p>
            <p className="text-sm leading-relaxed">Corpo, formulários e tabelas</p>
            <p className="font-mono text-[10px] text-muted-foreground">font-sans · Epilogue</p>
          </div>
          <div className="lots-surface space-y-2 p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Mono
            </p>
            <p className="font-mono text-xl">0123456789</p>
            <p className="font-mono text-sm text-muted-foreground">IDs, SQL, métricas</p>
            <p className="font-mono text-[10px] text-muted-foreground">font-mono · JetBrains</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Assets oficiais"
        description="Hospedados no Supabase Storage (bucket Midias). Uso externo somente com aprovação."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BRAND_ASSET_ITEMS.map((item) => (
            <AssetCard
              key={item.id}
              label={item.label}
              description={item.description}
              url={BRAND_ASSETS[item.id]}
            />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
