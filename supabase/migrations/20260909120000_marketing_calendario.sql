-- Colunas de caminho (não a URL assinada) em generated_posts — permitem
-- regenerar uma signed URL nova quando a antiga (7 dias) expirar, o que é
-- essencial pro Histórico de posts poder mostrar itens antigos.
ALTER TABLE public.generated_posts
  ADD COLUMN IF NOT EXISTS image_path TEXT,
  ADD COLUMN IF NOT EXISTS final_image_path TEXT;

-- Calendário editorial do gerador de posts (Marketing)
-- Entradas simples: mês, pilar, tema/ideia, status. Cada entrada pode virar
-- um post real (o franqueado usa o tema como ponto de partida do briefing).

CREATE TABLE public.marketing_calendario (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  socio_id UUID NOT NULL REFERENCES public.socios(id) ON DELETE CASCADE,
  mes DATE NOT NULL, -- sempre o dia 1 do mês planejado
  pilar TEXT NOT NULL CHECK (pilar IN ('conhecer','gostar','confiar','comprar')),
  tema TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planejado' CHECK (status IN ('planejado','publicado')),
  post_id UUID REFERENCES public.generated_posts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_marketing_calendario_updated_at BEFORE UPDATE ON public.marketing_calendario
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.marketing_calendario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franqueado ve seu proprio calendario"
  ON public.marketing_calendario FOR SELECT
  TO authenticated
  USING (socio_id IN (SELECT id FROM public.socios WHERE user_id = auth.uid()));

CREATE POLICY "Franqueado cria entradas no seu calendario"
  ON public.marketing_calendario FOR INSERT
  TO authenticated
  WITH CHECK (socio_id IN (SELECT id FROM public.socios WHERE user_id = auth.uid()));

CREATE POLICY "Franqueado atualiza entradas do seu calendario"
  ON public.marketing_calendario FOR UPDATE
  TO authenticated
  USING (socio_id IN (SELECT id FROM public.socios WHERE user_id = auth.uid()))
  WITH CHECK (socio_id IN (SELECT id FROM public.socios WHERE user_id = auth.uid()));

CREATE POLICY "Franqueado apaga entradas do seu calendario"
  ON public.marketing_calendario FOR DELETE
  TO authenticated
  USING (socio_id IN (SELECT id FROM public.socios WHERE user_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_calendario TO authenticated;

NOTIFY pgrst, 'reload schema';
