DROP POLICY IF EXISTS "Leitura publica dos arquivos de marketing" ON storage.objects;

CREATE POLICY "Franqueado le seus proprios arquivos de marketing"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'marketing-posts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Franqueado atualiza seus proprios arquivos de marketing"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'marketing-posts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'marketing-posts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Franqueado apaga seus proprios arquivos de marketing"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'marketing-posts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );