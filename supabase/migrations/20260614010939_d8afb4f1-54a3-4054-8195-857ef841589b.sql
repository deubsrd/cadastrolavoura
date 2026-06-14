CREATE POLICY "Admin faz upload de fotos de obra"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'obra-fotos'
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admin deleta fotos de obra"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'obra-fotos'
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Autenticados visualizam fotos de obra"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'obra-fotos');