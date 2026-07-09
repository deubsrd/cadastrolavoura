
-- Restrict anonymous SELECT to non-sensitive columns only.
-- Column-level privileges are enforced independently of RLS policies.
REVOKE SELECT ON public.unidades FROM anon;
GRANT SELECT (id, numero, nome, ativo, created_at, updated_at) ON public.unidades TO anon;

-- Ensure authenticated users retain full read access.
GRANT SELECT ON public.unidades TO authenticated;
