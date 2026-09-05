import type { ReactNode } from "react";
import { LotsBIWordmark } from "@/components/lots/LotsMark";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center space-y-3 text-center">
          <LotsBIWordmark size="lg" />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AuthBootstrapping() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="space-y-3 text-center">
        <LotsBIWordmark size="lg" className="mx-auto" />
        <p className="text-sm text-muted-foreground">Preparando acesso…</p>
      </div>
    </div>
  );
}
