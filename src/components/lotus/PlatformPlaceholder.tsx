import type { LucideIcon } from "lucide-react";
import { PageHeader } from "./PageHeader";
import { PlatformSwitcher } from "./PlatformSwitcher";
import { SectionCard } from "./SectionCard";

interface PlatformPlaceholderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  platformId: string;
}

export function PlatformPlaceholder({
  icon: Icon,
  title,
  platformId,
}: PlatformPlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Plataforma"
        title={<PlatformSwitcher currentId={platformId} currentLabel={title} />}
        description="Dados coletados para o período selecionado"
      />
      <SectionCard
        eyebrow="Em construção"
        title="Conteúdo em breve"
        description="Esta página será populada com as métricas detalhadas desta plataforma."
      >
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary-600 dark:text-primary-300">
            <Icon className="h-6 w-6" />
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">
            A visualização detalhada de <strong>{title}</strong> chega em uma próxima etapa. Por
            enquanto, volte aos dashboards e escolha outra plataforma.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
