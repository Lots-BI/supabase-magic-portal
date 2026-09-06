import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  LINHAS_EDITORIAIS_CATEGORIES,
  findLinhaEditorial,
} from "@/modules/approval/constants/linhas-editoriais";

export function LinhaEditorialSelect({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const meta = findLinhaEditorial(value);

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Linha editorial"
            className="h-auto min-h-9 w-full justify-between px-3 py-2 text-left font-normal"
          >
            <span className="min-w-0 flex-1">
              {meta ? (
                <span className="flex flex-col gap-0.5">
                  <span className="truncate font-medium leading-snug">{meta.value}</span>
                  <span className="line-clamp-1 text-xs text-muted-foreground">
                    {meta.description}
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground">Escolha a linha editorial</span>
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          sideOffset={4}
        >
          <Command
            filter={(itemValue, search) => {
              const q = search.trim().toLowerCase();
              if (!q) return 1;
              return itemValue.toLowerCase().includes(q) ? 1 : 0;
            }}
          >
            <CommandInput placeholder="Pesquisar linha editorial…" />
            <CommandList className="max-h-[min(22rem,60vh)]">
              <CommandEmpty>Nenhuma linha encontrada.</CommandEmpty>
              {LINHAS_EDITORIAIS_CATEGORIES.map((cat, idx) => (
                <div key={cat.id}>
                  {idx > 0 ? <CommandSeparator /> : null}
                  <CommandGroup
                    heading={cat.label}
                    className="[&_[cmdk-group-heading]]:sticky [&_[cmdk-group-heading]]:top-0 [&_[cmdk-group-heading]]:z-10 [&_[cmdk-group-heading]]:bg-popover [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide"
                  >
                    {cat.items.map((item) => (
                      <CommandItem
                        key={item.value}
                        value={`${item.value} ${item.description} ${cat.label}`}
                        onSelect={() => {
                          onChange(item.value);
                          setOpen(false);
                        }}
                        className="items-start py-2"
                      >
                        <Check
                          className={cn(
                            "mt-0.5 h-4 w-4 shrink-0",
                            value === item.value ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="font-medium leading-snug">{item.value}</span>
                          <span className="whitespace-normal text-xs font-normal leading-snug text-muted-foreground">
                            {item.description}
                          </span>
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </div>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {meta ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{meta.description}</p>
      ) : null}
    </div>
  );
}
