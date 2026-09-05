import { cn } from "@/lib/utils";

/**
 * Skeleton premium com shimmer tingido pela marca. Usar em substituição a
 * <Skeleton> da shadcn nos contextos de Lots BI.
 */
export function LotsSkeleton({ className }: { className?: string }) {
  return <div className={cn("lots-skeleton h-4 w-full", className)} />;
}
