-- Liga cada conteúdo a uma pasta da biblioteca (data + título).
ALTER TABLE public.content_library_folders
  ADD COLUMN IF NOT EXISTS card_id uuid REFERENCES public.content_cards (id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS content_library_folders_card_uidx
  ON public.content_library_folders (card_id)
  WHERE card_id IS NOT NULL;
