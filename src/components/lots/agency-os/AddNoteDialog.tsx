import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/lots/FormField";
import type { AgencyClientCard } from "@/modules/agency-os";

export function AddNoteDialog({
  client,
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  client: AgencyClientCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: string) => void;
  isPending?: boolean;
}) {
  const [body, setBody] = useState("");

  const handleOpen = (next: boolean) => {
    if (!next) setBody("");
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Observação</DialogTitle>
          {client && <p className="text-sm text-muted-foreground">{client.nome_cliente}</p>}
        </DialogHeader>
        <TextArea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Registre contexto importante…"
          rows={4}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={() => onSubmit(body)} disabled={!body.trim() || isPending}>
            {isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
