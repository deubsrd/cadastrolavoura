
-- 1) Determinismo da função get_my_unidade_id
CREATE OR REPLACE FUNCTION public.get_my_unidade_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT unidade_id
  FROM public.socios
  WHERE user_id = auth.uid() AND unidade_id IS NOT NULL
  ORDER BY created_at ASC NULLS LAST, id ASC
  LIMIT 1
$$;

-- 2) Restringir EXECUTE em funções SECURITY DEFINER
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_my_unidade_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_unidade_id() TO authenticated, service_role;

-- Funções usadas apenas como gatilhos: não devem ser chamadas diretamente via API
REVOKE ALL ON FUNCTION public.tg_socios_set_unidade_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;

-- 3) Esconder cnpj de unidades para visitantes não autenticados
REVOKE SELECT ON public.unidades FROM anon;
GRANT SELECT (id, numero, nome, ativo, endereco, created_at, updated_at) ON public.unidades TO anon;
-- authenticated mantém SELECT completo (inclui cnpj)
GRANT SELECT ON public.unidades TO authenticated;
