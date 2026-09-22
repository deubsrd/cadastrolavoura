-- Novo padrão visual do gerador de posts (AnuncioTemplate, renderizado no
-- navegador via html-to-image em vez do motor server-side anterior).
-- O texto único "headline" dá lugar a 4 campos distintos que o template
-- usa em camadas separadas (tarja de contexto, palavra de impacto,
-- subtítulo de apoio e CTA do rodapé).

ALTER TABLE public.generated_posts
  ADD COLUMN IF NOT EXISTS tarja TEXT,
  ADD COLUMN IF NOT EXISTS impacto TEXT,
  ADD COLUMN IF NOT EXISTS subtitulo TEXT,
  ADD COLUMN IF NOT EXISTS cta TEXT,
  DROP COLUMN IF EXISTS headline;

ALTER TABLE public.post_caption_versions
  ADD COLUMN IF NOT EXISTS tarja TEXT,
  ADD COLUMN IF NOT EXISTS impacto TEXT,
  ADD COLUMN IF NOT EXISTS subtitulo TEXT,
  ADD COLUMN IF NOT EXISTS cta TEXT,
  DROP COLUMN IF EXISTS headline;

NOTIFY pgrst, 'reload schema';
