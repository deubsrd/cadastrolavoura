-- ============================================================
-- Gerador de posts de Instagram — Central do Franqueado
-- Tabelas: post_briefings, generated_posts, post_caption_versions
-- + canva_connections e canva_oauth_state (necessárias pro OAuth
--   PKCE do Canva Connect API — não estavam no plano original)
-- ============================================================

CREATE TABLE public.post_briefings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  socio_id UUID NOT NULL REFERENCES public.socios(id) ON DELETE CASCADE,
  briefing_text TEXT NOT NULL,
  photo_url TEXT,
  pillar TEXT CHECK (pillar IN ('conhecer','gostar','confiar','comprar')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.generated_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  briefing_id UUID NOT NULL REFERENCES public.post_briefings(id) ON DELETE CASCADE,
  socio_id UUID NOT NULL REFERENCES public.socios(id) ON DELETE CASCADE,
  pillar TEXT CHECK (pillar IN ('conhecer','gostar','confiar','comprar')),
  headline TEXT,
  caption TEXT,
  hashtags TEXT[],
  image_url TEXT,
  canva_import_job_id TEXT,
  canva_design_id TEXT,
  canva_edit_url TEXT,
  canva_view_url TEXT,
  final_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft','rendering','imported_to_canva','editing','exporting','approved','error')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.post_caption_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.generated_posts(id) ON DELETE CASCADE,
  version INT NOT NULL,
  caption TEXT NOT NULL,
  hashtags TEXT[],
  headline TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, version)
);

-- Token OAuth do Canva Connect API, um por sócio
CREATE TABLE public.canva_connections (
  socio_id UUID NOT NULL PRIMARY KEY REFERENCES public.socios(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Estado efêmero do fluxo OAuth PKCE (init -> callback); a linha é apagada
-- assim que o callback processa o code
CREATE TABLE public.canva_oauth_state (
  state TEXT NOT NULL PRIMARY KEY,
  socio_id UUID NOT NULL REFERENCES public.socios(id) ON DELETE CASCADE,
  code_verifier TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger updated_at (reaproveita a função já criada em outras migrations)
CREATE TRIGGER set_generated_posts_updated_at BEFORE UPDATE ON public.generated_posts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER set_canva_connections_updated_at BEFORE UPDATE ON public.canva_connections
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.post_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_caption_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canva_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canva_oauth_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franqueado ve seus proprios briefings"
  ON public.post_briefings FOR SELECT
  TO authenticated
  USING (socio_id IN (SELECT id FROM public.socios WHERE user_id = auth.uid()));

CREATE POLICY "Franqueado ve seus proprios posts"
  ON public.generated_posts FOR SELECT
  TO authenticated
  USING (socio_id IN (SELECT id FROM public.socios WHERE user_id = auth.uid()));

CREATE POLICY "Franqueado ve versoes de seus proprios posts"
  ON public.post_caption_versions FOR SELECT
  TO authenticated
  USING (
    post_id IN (
      SELECT id FROM public.generated_posts
      WHERE socio_id IN (SELECT id FROM public.socios WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Franqueado ve sua propria conexao Canva"
  ON public.canva_connections FOR SELECT
  TO authenticated
  USING (socio_id IN (SELECT id FROM public.socios WHERE user_id = auth.uid()));

-- Insert/update em generated_posts, canva_connections e canva_oauth_state só
-- acontece pelas Edge Functions (service role, que ignora RLS); não há
-- policy de escrita pro cliente autenticado direto.
-- post_briefings.INSERT também é feito pela Edge Function gerar-legenda
-- (service role), pra manter a validação do socio_id num único lugar.

GRANT SELECT ON public.post_briefings TO authenticated;
GRANT SELECT ON public.generated_posts TO authenticated;
GRANT SELECT ON public.post_caption_versions TO authenticated;
GRANT SELECT ON public.canva_connections TO authenticated;

-- ---------------------------------------------------------------------------
-- Storage bucket
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing-posts', 'marketing-posts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Leitura publica dos arquivos de marketing"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'marketing-posts');

CREATE POLICY "Franqueado envia foto para sua propria pasta"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'marketing-posts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

NOTIFY pgrst, 'reload schema';
