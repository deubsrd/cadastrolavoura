
-- 1) Restrict CNPJ exposure to authenticated users via column-level grants on anon
REVOKE SELECT ON public.unidades FROM anon;
GRANT SELECT (id, numero, nome, ativo, endereco, link_projeto_3d, created_at, updated_at) ON public.unidades TO anon;

-- 2) Tighten public socios INSERT policy to prevent setting unidade_id / user_id
DROP POLICY IF EXISTS "Qualquer pessoa pode cadastrar sócios" ON public.socios;
CREATE POLICY "Qualquer pessoa pode cadastrar sócios"
  ON public.socios
  FOR INSERT
  TO public
  WITH CHECK (
    user_id IS NULL
    AND unidade_id IS NULL
    AND length(nome_completo) > 0
    AND length(cpf) > 0
    AND length(email) > 0
    AND length(numero_unidade) > 0
    AND documento_identidade_path IS NOT NULL
    AND length(documento_identidade_path) > 0
    AND documento_cpf_path IS NOT NULL
    AND length(documento_cpf_path) > 0
  );
