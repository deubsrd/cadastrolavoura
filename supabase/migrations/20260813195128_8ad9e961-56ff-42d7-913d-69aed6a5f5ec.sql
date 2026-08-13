-- Remove acesso público/anon das funções SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.popular_gastos_padrao(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.tg_socios_set_unidade_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.tg_obra_item_para_biblioteca() FROM PUBLIC, anon;

-- Mantém execução para usuários autenticados nas funções chamadas pelo app
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.popular_gastos_padrao(UUID) TO authenticated;