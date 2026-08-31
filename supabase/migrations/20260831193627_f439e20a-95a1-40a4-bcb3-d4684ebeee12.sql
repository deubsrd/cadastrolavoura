CREATE TABLE public.socio_app_state (
  socio_id UUID NOT NULL PRIMARY KEY REFERENCES public.socios(id) ON DELETE CASCADE,
  tour_completo BOOLEAN NOT NULL DEFAULT false,
  ultima_atualizacao_vista_em TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.socio_app_state TO authenticated;
GRANT ALL ON public.socio_app_state TO service_role;

ALTER TABLE public.socio_app_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franqueado gerencia o proprio estado do app"
  ON public.socio_app_state FOR ALL
  TO authenticated
  USING (
    socio_id IN (SELECT id FROM public.socios WHERE user_id = auth.uid())
  )
  WITH CHECK (
    socio_id IN (SELECT id FROM public.socios WHERE user_id = auth.uid())
  );

CREATE TRIGGER set_updated_at_socio_app_state
  BEFORE UPDATE ON public.socio_app_state
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

NOTIFY pgrst, 'reload schema';