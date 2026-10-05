-- Liga os arquivos já enviados nos conteúdos à raiz do Drive.
ALTER TABLE public.content_library_files
  ADD COLUMN IF NOT EXISTS attachment_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS content_library_files_attachment_idx
  ON public.content_library_files (attachment_id)
  WHERE attachment_id IS NOT NULL;
