import { lazy, Suspense } from "react";
import type { AreaSeries } from "./AreaChartLotus";
import type { CommonMetric } from "@/lib/metrics";
import { cn } from "@/lib/utils";

export type { AreaSeriesTone } from "./AreaChartLotus";
export { getSeriesColor } from "./chart-colors";

type AreaChartLotusProps = {
  data: unknown[];
  series: AreaSeries[];
  height?: number;
  className?: string;
  yMetric?: CommonMetric;
};

const LazyAreaChart = lazy(() =>
  import("./AreaChartLotus").then((m) => ({ default: m.AreaChartLotus })),
);

function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("lotus-skeleton w-full rounded-lg", className)}
        style={{ minHeight: "clamp(176px, 38vw, 240px)" }}
    />
  );
}

/** AreaChartLotus com code-split do Recharts — use em dashboards. */
export function AreaChartLotusLazy(props: AreaChartLotusProps) {
  return (
    <Suspense fallback={<ChartSkeleton className={props.className} />}>
      <LazyAreaChart {...props} />
    </Suspense>
  );
}
