ALTER TABLE public.jornada_etapas
  ADD COLUMN IF NOT EXISTS video_url TEXT;

NOTIFY pgrst, 'reload schema';