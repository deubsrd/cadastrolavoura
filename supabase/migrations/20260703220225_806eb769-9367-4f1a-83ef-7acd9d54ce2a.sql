DROP POLICY IF EXISTS "Qualquer pessoa pode cadastrar sócios" ON public.socios;

CREATE POLICY "Qualquer pessoa pode cadastrar sócios"
ON public.socios
FOR INSERT
WITH CHECK (
  user_id IS NULL
  AND length(nome_completo) > 0
  AND length(cpf) > 0
  AND length(email) > 0
  AND length(numero_unidade) > 0
  AND documento_identidade_path IS NOT NULL
  AND documento_identidade_path LIKE 'pending/%'
  AND documento_cpf_path IS NOT NULL
  AND documento_cpf_path LIKE 'pending/%'
);