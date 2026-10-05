import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { focusAdjacentSheetCell } from "@/components/lots/admin/sheet-cell-focus";
import { cn } from "@/lib/utils";

export type SheetPickOption = {
  value: string;
  label: string;
  hint?: string;
  group: string;
};

export function SheetOptionPicker({
  value,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  label,
  allowEmpty = false,
  emptyLabel = "Nenhum",
  triggerClassName,
  locked = false,
  onChange,
}: {
  value: string;
  options: SheetPickOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  label: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  triggerClassName?: string;
  locked?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const swallowEnter = useRef(false);
  const tabMoved = useRef(false);

  useEffect(() => {
    if (!open) return;
    const clear = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") swallowEnter.current = false;
    };
    window.addEventListener("keyup", clear);
    return () => window.removeEventListener("keyup", clear);
  }, [open]);
  const selected = options.find((option) => option.value === value);
  const groups = [...new Set(options.map((option) => option.group))];

  if (locked) {
    return (
      <span
        className={cn(
          "flex h-9 items-center truncate px-2 text-[13px] text-foreground",
          !selected && "text-muted-foreground",
          triggerClassName,
        )}
      >
        {selected?.label || placeholder}
      </span>
    );
  }

  function choose(next: string) {
    onChange(next);
    setOpen(false);
  }

  function moveTab(shift: boolean) {
    tabMoved.current = true;
    setOpen(false);
    focusAdjacentSheetCell(triggerRef.current, shift ? -1 : 1);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={label}
          data-sheet-cell=""
          className={cn(
            "flex h-9 w-full min-w-0 items-center gap-1 bg-transparent px-2 text-left text-[13px] font-normal text-foreground outline-none hover:bg-primary/10 focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
            triggerClassName,
          )}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            swallowEnter.current = true;
          }}
        >
          <span className={cn("min-w-0 flex-1 truncate", !selected && "text-muted-foreground")}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[80] w-[var(--radix-popover-trigger-width)] min-w-[240px] p-0"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          searchRef.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          if (!tabMoved.current) return;
          event.preventDefault();
          tabMoved.current = false;
        }}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          event.preventDefault();
          moveTab(event.shiftKey);
        }}
      >
        <Command
          filter={(itemValue, search) => {
            const query = search.trim().toLowerCase();
            if (!query) return 1;
            return itemValue.toLowerCase().includes(query) ? 1 : 0;
          }}
          onKeyDownCapture={(event) => {
            if (event.key !== "Enter" || !swallowEnter.current) return;
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <CommandInput ref={searchRef} placeholder={searchPlaceholder} />
          <CommandList className="max-h-64">
            <CommandEmpty>{emptyText}</CommandEmpty>
            {allowEmpty ? (
              <CommandGroup>
                <CommandItem value={emptyLabel} onSelect={() => choose("")}>
                  <Check className={cn("h-4 w-4", value === "" ? "opacity-100" : "opacity-0")} />
                  <span className="text-muted-foreground">{emptyLabel}</span>
                </CommandItem>
              </CommandGroup>
            ) : null}
            {groups.map((group) => (
              <CommandGroup key={group} heading={groups.length > 1 ? group : undefined}>
                {options
                  .filter((option) => option.group === group)
                  .map((option) => (
                    <CommandItem
                      key={option.value}
                      value={`${option.label} ${option.hint ?? ""} ${option.group} ${option.value}`}
                      onSelect={() => choose(option.value)}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4",
                          value === option.value ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate">{option.label}</span>
                        {option.hint ? (
                          <span className="truncate text-xs text-muted-foreground">
                            {option.hint}
                          </span>
                        ) : null}
                      </span>
                    </CommandItem>
                  ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
