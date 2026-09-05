import { cn } from "@/lib/utils";
import type {
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
} from "react";

export function FormRow({
  children,
  cols = 2,
  className,
}: {
  children: ReactNode;
  cols?: 1 | 2 | 3;
  className?: string;
}) {
  const map = { 1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3" } as const;
  return <div className={cn("grid grid-cols-1 gap-3", map[cols], className)}>{children}</div>;
}

interface FieldProps {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, error, required, children, className }: FieldProps) {
  return (
    <label className={cn("block space-y-1", className)}>
      <span className="flex items-center gap-1 text-[12px] font-medium text-foreground">
        {label}
        {required && <span className="text-destructive">*</span>}
      </span>
      {children}
      {error ? (
        <span className="block text-[11.5px] text-destructive">{error}</span>
      ) : hint ? (
        <span className="block text-[11.5px] text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}

const baseInput =
  "lots-focus h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground/60 transition-colors hover:border-primary-300 disabled:opacity-60 sm:h-9";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const { className, invalid, ...rest } = props;
  return <input {...rest} className={cn(baseInput, invalid && "border-destructive", className)} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return (
    <textarea
      {...rest}
      className={cn(
        "lots-focus w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/60 hover:border-primary-300 disabled:opacity-60",
        className,
      )}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props;
  return <select {...rest} className={cn(baseInput, "pr-8", className)} />;
}
