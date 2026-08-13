CREATE TABLE public.obra_gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  descricao TEXT NOT NULL,
  valor_previsto NUMERIC(12,2),
  valor_pago NUMERIC(12,2) DEFAULT 0,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.obra_gastos TO authenticated;
GRANT ALL ON public.obra_gastos TO service_role;

ALTER TABLE public.obra_gastos ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at_obra_gastos
  BEFORE UPDATE ON public.obra_gastos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE POLICY "Admin gerencia gastos de obra"
  ON public.obra_gastos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Franqueado lê gastos da própria unidade"
  ON public.obra_gastos FOR SELECT TO authenticated
  USING (unidade_id = public.get_my_unidade_id());

CREATE POLICY "Franqueado atualiza valor pago da própria unidade"
  ON public.obra_gastos FOR UPDATE TO authenticated
  USING (unidade_id = public.get_my_unidade_id())
  WITH CHECK (unidade_id = public.get_my_unidade_id());