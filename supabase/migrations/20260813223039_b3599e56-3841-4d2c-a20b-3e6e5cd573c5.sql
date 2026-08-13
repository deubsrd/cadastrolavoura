DROP POLICY IF EXISTS "Autenticados fazem upload de fotos de obra" ON storage.objects;
DROP POLICY IF EXISTS "Autenticados deletam fotos de obra" ON storage.objects;
DROP POLICY IF EXISTS "Autenticados visualizam fotos de obra" ON storage.objects;
DROP POLICY IF EXISTS "Admin faz upload de fotos de obra" ON storage.objects;
DROP POLICY IF EXISTS "Admin deleta fotos de obra" ON storage.objects;

CREATE POLICY "Fotos de obra: leitura restrita a unidade ou admin"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'obra-fotos'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.obra_checklist_itens i
        WHERE i.unidade_id = public.get_my_unidade_id()
          AND (i.foto_url = storage.objects.name OR i.id::text = (storage.foldername(storage.objects.name))[1])
      )
    )
  );

CREATE POLICY "Fotos de obra: upload restrito a unidade ou admin"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'obra-fotos'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.obra_checklist_itens i
        WHERE i.unidade_id = public.get_my_unidade_id()
          AND i.id::text = (storage.foldername(storage.objects.name))[1]
      )
    )
  );

CREATE POLICY "Fotos de obra: exclusao restrita a unidade ou admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'obra-fotos'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.obra_checklist_itens i
        WHERE i.unidade_id = public.get_my_unidade_id()
          AND i.id::text = (storage.foldername(storage.objects.name))[1]
      )
    )
  );