CREATE TABLE public.chat_duvidas_pendentes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  socio_id UUID REFERENCES public.socios(id) ON DELETE SET NULL,
  unidade_id UUID REFERENCES public.unidades(id) ON DELETE SET NULL,
  pergunta TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'respondida')),
  resposta TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  respondida_em TIMESTAMPTZ
);

CREATE INDEX idx_chat_duvidas_pendentes_status ON public.chat_duvidas_pendentes(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_duvidas_pendentes TO authenticated;
GRANT ALL ON public.chat_duvidas_pendentes TO service_role;

ALTER TABLE public.chat_duvidas_pendentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia duvidas pendentes"
  ON public.chat_duvidas_pendentes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.chat_conhecimento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pergunta TEXT NOT NULL,
  resposta TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_conhecimento TO authenticated;
GRANT ALL ON public.chat_conhecimento TO service_role;

ALTER TABLE public.chat_conhecimento ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at_chat_conhecimento
  BEFORE UPDATE ON public.chat_conhecimento
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE POLICY "Admin gerencia base de conhecimento do chat"
  ON public.chat_conhecimento FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

NOTIFY pgrst, 'reload schema';