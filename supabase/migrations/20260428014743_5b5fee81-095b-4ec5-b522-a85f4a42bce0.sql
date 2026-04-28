-- Storage bucket para documentos dos sócios (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('socio-documentos', 'socio-documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Permitir upload público (cadastro é aberto)
CREATE POLICY "Qualquer pessoa pode enviar documentos de sócio"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'socio-documentos');

-- Apenas admin pode ler documentos
CREATE POLICY "Admin pode visualizar documentos de sócio"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'socio-documentos' AND public.has_role(auth.uid(), 'admin'));

-- Apenas admin pode excluir documentos
CREATE POLICY "Admin pode excluir documentos de sócio"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'socio-documentos' AND public.has_role(auth.uid(), 'admin'));

-- Apenas admin pode atualizar documentos
CREATE POLICY "Admin pode atualizar documentos de sócio"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'socio-documentos' AND public.has_role(auth.uid(), 'admin'));

-- Colunas para guardar caminhos dos arquivos
ALTER TABLE public.socios
  ADD COLUMN documento_identidade_path text,
  ADD COLUMN documento_cpf_path text;

-- Atualiza política de INSERT pública para exigir os documentos
DROP POLICY IF EXISTS "Qualquer pessoa pode cadastrar sócios" ON public.socios;

CREATE POLICY "Qualquer pessoa pode cadastrar sócios"
ON public.socios FOR INSERT
TO public
WITH CHECK (
  length(nome_completo) > 0
  AND length(cpf) > 0
  AND length(email) > 0
  AND unidade_id IS NOT NULL
  AND documento_identidade_path IS NOT NULL
  AND length(documento_identidade_path) > 0
  AND documento_cpf_path IS NOT NULL
  AND length(documento_cpf_path) > 0
);