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
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ClienteOption = {
  id: number;
  nome_cliente: string;
};

export function ClienteCombobox({
  clientes,
  value,
  onChange,
  placeholder = "Selecionar cliente",
}: {
  clientes: ClienteOption[];
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = clientes.find((c) => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Cliente do workspace"
          className="h-10 w-full min-w-0 justify-between sm:w-[260px]"
        >
          <span className="truncate">{selected?.nome_cliente ?? placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 sm:w-[260px]"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Buscar cliente…" />
          <CommandList>
            <CommandEmpty>Nenhum cliente.</CommandEmpty>
            <CommandGroup>
              {value != null && (
                <CommandItem
                  value="__all__"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                >
                  Todos os clientes
                </CommandItem>
              )}
              {clientes.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.nome_cliente}
                  onSelect={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("h-4 w-4", value === c.id ? "opacity-100" : "opacity-0")} />
                  {c.nome_cliente}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
