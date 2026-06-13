-- ============================================================
-- Sistema Lavoura: área logada do franqueado (/app)
-- ============================================================

-- 1) Vincular um sócio (administrador) a um usuário de autenticação
ALTER TABLE public.socios
  ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX idx_socios_user_id
  ON public.socios(user_id)
  WHERE user_id IS NOT NULL;

-- 2) Sócio vê o próprio registro
CREATE POLICY "Franqueado vê o próprio registro de sócio"
  ON public.socios FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3) Função helper: unidade do usuário logado (SECURITY INVOKER, respeita RLS acima)
CREATE OR REPLACE FUNCTION public.get_my_unidade_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT unidade_id
  FROM public.socios
  WHERE user_id = auth.uid() AND unidade_id IS NOT NULL
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_my_unidade_id() TO authenticated;

-- 4) Franqueado pode ver os documentos da própria unidade
CREATE POLICY "Franqueado vê documentos da própria unidade"
  ON public.unidade_documentos FOR SELECT
  TO authenticated
  USING (unidade_id = public.get_my_unidade_id());

-- 5) Novo tipo de documento: planta/prancha da obra
ALTER TABLE public.unidade_documentos
  DROP CONSTRAINT IF EXISTS unidade_documentos_tipo_check;

ALTER TABLE public.unidade_documentos
  ADD CONSTRAINT unidade_documentos_tipo_check
  CHECK (tipo IN ('cof', 'pre_contrato', 'contrato', 'planta_obra', 'outros'));

-- 6) Storage: franqueado pode visualizar as plantas/pranchas da própria unidade
--    (path = {unidade_id}/{tipo}/{arquivo})
CREATE POLICY "Franqueado vê plantas da própria unidade"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'unidade-documentos'
    AND (storage.foldername(name))[2] = 'planta_obra'
    AND (storage.foldername(name))[1] = (public.get_my_unidade_id())::text
  );

-- ============================================================
-- Aba "Obra": checklist de itens a comprar/instalar por unidade
-- ============================================================
CREATE TABLE public.obra_checklist_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  item TEXT NOT NULL,
  quantidade_sugerida TEXT,
  observacao TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'comprado', 'instalado')),
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_obra_checklist_unidade ON public.obra_checklist_itens(unidade_id);

ALTER TABLE public.obra_checklist_itens ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at_obra_checklist
  BEFORE UPDATE ON public.obra_checklist_itens
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Admin gerencia tudo
CREATE POLICY "Admin gerencia checklist de obra"
  ON public.obra_checklist_itens FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Franqueado vê o checklist da própria unidade
CREATE POLICY "Franqueado vê checklist da própria unidade"
  ON public.obra_checklist_itens FOR SELECT
  TO authenticated
  USING (unidade_id = public.get_my_unidade_id());

-- Franqueado pode atualizar (marcar status) dos itens da própria unidade
CREATE POLICY "Franqueado atualiza checklist da própria unidade"
  ON public.obra_checklist_itens FOR UPDATE
  TO authenticated
  USING (unidade_id = public.get_my_unidade_id())
  WITH CHECK (unidade_id = public.get_my_unidade_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.obra_checklist_itens TO authenticated;

-- ============================================================
-- Aba "Financeiro": DRE mensal por unidade (substitui month_records por user_id)
-- ============================================================
CREATE TABLE public.financeiro_mensal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  label TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  custom_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  removed_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (unidade_id, month, year)
);

CREATE INDEX idx_financeiro_mensal_unidade ON public.financeiro_mensal(unidade_id);

ALTER TABLE public.financeiro_mensal ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at_financeiro_mensal
  BEFORE UPDATE ON public.financeiro_mensal
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Franqueado gerencia o financeiro da própria unidade
CREATE POLICY "Franqueado gerencia financeiro da própria unidade"
  ON public.financeiro_mensal FOR ALL
  TO authenticated
  USING (unidade_id = public.get_my_unidade_id())
  WITH CHECK (unidade_id = public.get_my_unidade_id());

-- Admin visualiza o financeiro de todas as unidades (consolidado)
CREATE POLICY "Admin visualiza financeiro de todas unidades"
  ON public.financeiro_mensal FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financeiro_mensal TO authenticated;

NOTIFY pgrst, 'reload schema';
