-- Bucket público para fotos dos itens do checklist de obra
INSERT INTO storage.buckets (id, name, public)
VALUES ('obra-fotos', 'obra-fotos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Admin pode fazer upload
CREATE POLICY "Admin faz upload de fotos de obra"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'obra-fotos'
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Admin pode deletar
CREATE POLICY "Admin deleta fotos de obra"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'obra-fotos'
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Qualquer pessoa autenticada pode visualizar
CREATE POLICY "Autenticados visualizam fotos de obra"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'obra-fotos');
