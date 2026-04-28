
-- Fix search_path em tg_set_updated_at
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Revogar EXECUTE público das funções SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;

-- Substituir política INSERT pública por uma com checagem mínima (não-vazio)
DROP POLICY IF EXISTS "Qualquer pessoa pode cadastrar sócios" ON public.socios;
CREATE POLICY "Qualquer pessoa pode cadastrar sócios"
  ON public.socios FOR INSERT
  WITH CHECK (
    length(nome_completo) > 0
    AND length(cpf) > 0
    AND length(email) > 0
    AND unidade_id IS NOT NULL
  );
