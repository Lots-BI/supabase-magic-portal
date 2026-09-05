import { Suspense, type ReactNode } from "react";
import type { DashboardDefinition, WidgetDefinition } from "../types/widgets";
import { configRegistry } from "../registry/config-registry";
import { widgetRegistry } from "../registry/widget-registry";

export interface DashboardRenderContext {
  clientId?: number;
  context?: Record<string, unknown>;
}

export function resolveDashboard(dashboardId: string): DashboardDefinition | undefined {
  return configRegistry.allDashboards().find((d) => d.id === dashboardId);
}

export function resolveDashboardWidgets(dashboardId: string): WidgetDefinition[] {
  const dashboard = resolveDashboard(dashboardId);
  if (!dashboard) return [];
  return dashboard.widgetIds
    .map((id) => widgetRegistry.get(id))
    .filter((w): w is WidgetDefinition => Boolean(w));
}

export interface DashboardGridProps extends DashboardRenderContext {
  dashboardId: string;
  className?: string;
}

/** Renderiza dashboard a partir do registro — zero hardcode de widgets. */
export function DashboardGrid({ dashboardId, clientId, context, className }: DashboardGridProps) {
  const widgets = resolveDashboardWidgets(dashboardId);

  if (widgets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhum widget registrado para este dashboard.</p>
    );
  }

  return (
    <div className={className ?? "grid gap-4 lg:grid-cols-2"}>
      {widgets.map((widget) => (
        <div key={widget.id} className={widget.colSpan === 2 ? "lg:col-span-2" : undefined}>
          <RegisteredWidget widget={widget} clientId={clientId} context={context} />
        </div>
      ))}
    </div>
  );
}

function RegisteredWidget({
  widget,
  clientId,
  context,
}: {
  widget: WidgetDefinition;
  clientId?: number;
  context?: Record<string, unknown>;
}) {
  const Component = widget.component;
  const body = <Component clientId={clientId} context={context} />;

  if (widget.lazy) {
    return <Suspense fallback={<WidgetLoading title={widget.title} />}>{body}</Suspense>;
  }
  return body;
}

function WidgetLoading({ title }: { title: string }): ReactNode {
  return (
    <section className="lots-surface flex min-h-[120px] animate-pulse flex-col justify-center p-6">
      <p className="text-sm text-muted-foreground">Carregando {title}…</p>
    </section>
  );
}
