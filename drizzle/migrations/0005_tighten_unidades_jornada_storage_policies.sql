DROP POLICY IF EXISTS "Unidades são visíveis publicamente" ON public.unidades;
CREATE POLICY "Unidades ativas visíveis no cadastro" ON public.unidades FOR SELECT TO anon, authenticated
  USING (ativo = true OR public.has_role(auth.uid(), 'admin') OR id = public.get_my_unidade_id());

DROP POLICY IF EXISTS "Autenticados leem etapas" ON public.jornada_etapas;
CREATE POLICY "Franqueados e admins leem etapas" ON public.jornada_etapas FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.get_my_unidade_id() IS NOT NULL);

DROP POLICY IF EXISTS "Autenticados leem subitens" ON public.jornada_subitens;
CREATE POLICY "Franqueados e admins leem subitens" ON public.jornada_subitens FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.get_my_unidade_id() IS NOT NULL);

DROP POLICY IF EXISTS "Qualquer pessoa pode enviar documentos de sócio (pending)" ON storage.objects;
CREATE POLICY "Cadastro envia documentos de sócio (pending)" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'socio-documentos'
    AND name ~ '^pending/[A-Za-z0-9_-]{1,20}/[A-Za-z0-9_-]{10,120}/(identidade|cpf)\.pdf$'
    AND (auth.uid() IS NULL OR owner_id = auth.uid()::text)
  );