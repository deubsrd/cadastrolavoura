DROP POLICY IF EXISTS "Admin faz upload de fotos de obra" ON storage.objects;
DROP POLICY IF EXISTS "Admin deleta fotos de obra" ON storage.objects;
DROP POLICY IF EXISTS "Autenticados visualizam fotos de obra" ON storage.objects;

CREATE POLICY "Autenticados fazem upload de fotos de obra"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'obra-fotos');

CREATE POLICY "Autenticados deletam fotos de obra"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'obra-fotos');

CREATE POLICY "Autenticados visualizam fotos de obra"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'obra-fotos');