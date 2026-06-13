CREATE OR REPLACE FUNCTION public.tg_socios_set_unidade_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.unidade_id IS NULL AND NEW.numero_unidade IS NOT NULL THEN
    SELECT id INTO NEW.unidade_id
    FROM public.unidades
    WHERE numero = NEW.numero_unidade
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER socios_set_unidade_id
  BEFORE INSERT ON public.socios
  FOR EACH ROW EXECUTE FUNCTION public.tg_socios_set_unidade_id();