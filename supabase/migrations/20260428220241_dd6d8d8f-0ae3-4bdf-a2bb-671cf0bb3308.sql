GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.unidades TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.unidades TO authenticated;

GRANT INSERT ON public.socios TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.socios TO authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tg_set_updated_at() TO authenticated;

NOTIFY pgrst, 'reload schema';