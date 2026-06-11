
DROP POLICY IF EXISTS "Qualquer pessoa pode enviar documentos de sócio" ON storage.objects;
CREATE POLICY "Qualquer pessoa pode enviar documentos de sócio (pending)"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'socio-documentos'
  AND (storage.foldername(name))[1] = 'pending'
);

CREATE POLICY "Apenas admin pode inserir roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Apenas admin pode atualizar roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Apenas admin pode excluir roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$function$;
