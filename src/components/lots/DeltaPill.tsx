// Lots BI · DeltaPill
// Indicador reutilizável de variação percentual vs período anterior.
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  delta: number | null | undefined;
  /** true = subir é bom (cores success/danger seguem a regra). */
  positiveIsGood?: boolean;
  /** Mostra "vs período anterior" depois do %. */
  showSuffix?: boolean;
  className?: string;
  size?: "sm" | "md";
}

export function DeltaPill({
  delta,
  positiveIsGood = true,
  showSuffix = false,
  className,
  size = "sm",
}: Props) {
  if (delta == null || !Number.isFinite(delta)) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground",
          className,
        )}
      >
        sem base
      </span>
    );
  }
  const trend = delta === 0 ? "flat" : delta > 0 ? "up" : "down";
  const good = trend === "flat" ? null : (trend === "up") === positiveIsGood;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold tabular-nums",
        size === "sm" ? "text-[10.5px]" : "text-[12px] px-2 py-1",
        good === null && "bg-muted text-muted-foreground",
        good === true && "bg-success/12 text-[color:var(--success)]",
        good === false && "bg-danger/12 text-[color:var(--danger)]",
        className,
      )}
    >
      {trend === "flat" ? (
        <Minus className="h-3 w-3" />
      ) : trend === "up" ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      {Math.abs(delta).toFixed(1)}%
      {showSuffix && <span className="font-normal opacity-80"> vs período anterior</span>}
    </span>
  );
}
