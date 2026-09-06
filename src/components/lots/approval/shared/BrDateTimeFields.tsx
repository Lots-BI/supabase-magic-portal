import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatBR } from "@/lib/period";
import { parseIsoDay, isoDay } from "@/modules/approval/services/calendar-date-utils";

/** Máscara digitável HH:mm (24h). */
export function maskTime24h(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function isValidTime24h(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const h = Number(value.slice(0, 2));
  const m = Number(value.slice(3, 5));
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

/** Data + hora em formato brasileiro (dd/mm/aaaa + 24h). Valores internos: YYYY-MM-DD e HH:mm. */
export function BrDateTimeFields({
  date,
  time,
  onDateChange,
  onTimeChange,
  dateId = "data-br",
  timeId = "hora-br",
  requiredDate = false,
}: {
  date: string;
  time: string;
  onDateChange: (isoDate: string) => void;
  onTimeChange: (hhmm: string) => void;
  dateId?: string;
  timeId?: string;
  requiredDate?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = date ? parseIsoDay(date) : undefined;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <Label htmlFor={dateId}>Data</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={dateId}
              type="button"
              variant="outline"
              className={cn(
                "h-11 w-full justify-start px-3 text-left font-normal",
                !date && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-60" />
              {date ? formatBR(date) : "dd/mm/aaaa"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              locale={ptBR}
              selected={selected}
              defaultMonth={selected}
              onSelect={(d) => {
                if (!d) return;
                onDateChange(isoDay(d));
                setOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
        {requiredDate && !date ? (
          <p className="text-xs text-destructive">Informe a data.</p>
        ) : (
          <p className="text-[11px] text-muted-foreground">Formato: dd/mm/aaaa (SP)</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor={timeId}>Hora</Label>
        <Input
          id={timeId}
          inputMode="numeric"
          autoComplete="off"
          placeholder="16:00"
          value={time}
          onChange={(e) => onTimeChange(maskTime24h(e.target.value))}
          className="h-11 tabular-nums"
          aria-describedby={`${timeId}-hint`}
        />
        <p id={`${timeId}-hint`} className="text-[11px] text-muted-foreground">
          24h — ex.: 16:00
        </p>
      </div>
    </div>
  );
}
