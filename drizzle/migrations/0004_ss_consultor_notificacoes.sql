CREATE TABLE public.ss_consultor (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  username text,
  igsid text,
  ativo boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando','pronto','falha')),
  ultimo_erro text,
  ultima_mensagem_em timestamptz,
  ultimo_envio_em timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_consultor TO authenticated;
GRANT ALL ON public.ss_consultor TO service_role;
ALTER TABLE public.ss_consultor ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam consultor" ON public.ss_consultor FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.ss_consultor_fila (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texto text NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','enviada')),
  tentativas integer NOT NULL DEFAULT 0,
  ultimo_erro text,
  created_at timestamptz NOT NULL DEFAULT now(),
  enviada_em timestamptz
);
CREATE INDEX ss_consultor_fila_pendente_idx ON public.ss_consultor_fila (created_at) WHERE status = 'pendente';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ss_consultor_fila TO authenticated;
GRANT ALL ON public.ss_consultor_fila TO service_role;
ALTER TABLE public.ss_consultor_fila ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam fila do consultor" ON public.ss_consultor_fila FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));