import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

/** Campo de busca padronizado (ícone + clear). */
export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar…",
  className,
  inputClassName,
}: SearchInputProps) {
  return (
    <div className={cn("relative min-w-0 w-full flex-1", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "lots-focus h-10 w-full rounded-lg border border-border bg-background py-2 pl-9 pr-8 text-[13px] text-foreground placeholder:text-muted-foreground sm:h-9",
          inputClassName,
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="lots-focus absolute right-2 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground"
          aria-label="Limpar busca"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
