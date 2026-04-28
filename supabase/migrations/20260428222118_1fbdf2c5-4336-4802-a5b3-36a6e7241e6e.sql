ALTER TABLE public.socios ALTER COLUMN unidade_id DROP NOT NULL;

-- Ajustar política pública de inserção: não exigir mais unidade_id, apenas numero_unidade
DROP POLICY IF EXISTS "Qualquer pessoa pode cadastrar sócios" ON public.socios;

CREATE POLICY "Qualquer pessoa pode cadastrar sócios"
ON public.socios
FOR INSERT
TO public
WITH CHECK (
  length(nome_completo) > 0
  AND length(cpf) > 0
  AND length(email) > 0
  AND length(numero_unidade) > 0
  AND documento_identidade_path IS NOT NULL
  AND length(documento_identidade_path) > 0
  AND documento_cpf_path IS NOT NULL
  AND length(documento_cpf_path) > 0
);