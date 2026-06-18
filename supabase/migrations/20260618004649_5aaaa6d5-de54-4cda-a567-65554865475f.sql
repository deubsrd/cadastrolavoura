
CREATE TABLE IF NOT EXISTS public.obra_itens_biblioteca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria TEXT NOT NULL,
  item TEXT NOT NULL,
  quantidade_sugerida TEXT,
  observacao TEXT,
  link_compra TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (categoria, item)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.obra_itens_biblioteca TO authenticated;
GRANT ALL ON public.obra_itens_biblioteca TO service_role;

ALTER TABLE public.obra_itens_biblioteca ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gerencia biblioteca de obra" ON public.obra_itens_biblioteca;
CREATE POLICY "Admin gerencia biblioteca de obra"
  ON public.obra_itens_biblioteca FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.tg_obra_item_para_biblioteca()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.obra_itens_biblioteca (categoria, item, quantidade_sugerida, observacao, link_compra)
  VALUES (NEW.categoria, NEW.item, NEW.quantidade_sugerida, NEW.observacao, NEW.link_compra)
  ON CONFLICT (categoria, item) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS obra_item_para_biblioteca ON public.obra_checklist_itens;
CREATE TRIGGER obra_item_para_biblioteca
  AFTER INSERT ON public.obra_checklist_itens
  FOR EACH ROW EXECUTE FUNCTION public.tg_obra_item_para_biblioteca();
