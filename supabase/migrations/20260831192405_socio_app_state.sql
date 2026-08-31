-- ============================================================
-- Estado do app por sócio: tour guiado + novidades já vistas
-- ============================================================
-- Tabela separada (em vez de colunas em `socios`) para não abrir
-- as colunas de dados pessoais do sócio a UPDATE feito pelo próprio
-- franqueado via RLS.

CREATE TABLE public.socio_app_state (
  socio_id UUID NOT NULL PRIMARY KEY REFERENCES public.socios(id) ON DELETE CASCADE,
  tour_completo BOOLEAN NOT NULL DEFAULT false,
  ultima_atualizacao_vista_em TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.socio_app_state ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at_socio_app_state
  BEFORE UPDATE ON public.socio_app_state
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Franqueado gerencia só o próprio estado (via seu socio_id vinculado ao user_id)
CREATE POLICY "Franqueado gerencia o proprio estado do app"
  ON public.socio_app_state FOR ALL
  TO authenticated
  USING (
    socio_id IN (SELECT id FROM public.socios WHERE user_id = auth.uid())
  )
  WITH CHECK (
    socio_id IN (SELECT id FROM public.socios WHERE user_id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE ON public.socio_app_state TO authenticated;

NOTIFY pgrst, 'reload schema';
