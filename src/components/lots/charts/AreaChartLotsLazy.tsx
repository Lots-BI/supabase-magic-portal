import { lazy, Suspense } from "react";
import type { AreaSeries } from "./AreaChartLots";
import type { CommonMetric } from "@/lib/metrics";
import { cn } from "@/lib/utils";

export type { AreaSeriesTone } from "./AreaChartLots";
export { getSeriesColor } from "./chart-colors";

type AreaChartLotsProps = {
  data: unknown[];
  series: AreaSeries[];
  height?: number;
  className?: string;
  yMetric?: CommonMetric;
};

const LazyAreaChart = lazy(() =>
  import("./AreaChartLots").then((m) => ({ default: m.AreaChartLots })),
);

function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("lots-skeleton w-full rounded-lg", className)}
        style={{ minHeight: "clamp(176px, 38vw, 240px)" }}
    />
  );
}

/** AreaChartLots com code-split do Recharts — use em dashboards. */
export function AreaChartLotsLazy(props: AreaChartLotsProps) {
  return (
    <Suspense fallback={<ChartSkeleton className={props.className} />}>
      <LazyAreaChart {...props} />
    </Suspense>
  );
}
