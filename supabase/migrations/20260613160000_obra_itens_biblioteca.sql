-- Biblioteca global de itens de obra
CREATE TABLE public.obra_itens_biblioteca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria TEXT NOT NULL,
  item TEXT NOT NULL,
  quantidade_sugerida TEXT,
  observacao TEXT,
  link_compra TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (categoria, item)
);

ALTER TABLE public.obra_itens_biblioteca ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia biblioteca de obra"
  ON public.obra_itens_biblioteca FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.obra_itens_biblioteca TO authenticated;

-- Trigger: toda vez que um item é inserido no checklist, vai automaticamente para a biblioteca
CREATE OR REPLACE FUNCTION public.tg_obra_item_para_biblioteca()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.obra_itens_biblioteca (categoria, item, quantidade_sugerida, observacao, link_compra)
  VALUES (NEW.categoria, NEW.item, NEW.quantidade_sugerida, NEW.observacao, NEW.link_compra)
  ON CONFLICT (categoria, item) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER obra_item_para_biblioteca
  AFTER INSERT ON public.obra_checklist_itens
  FOR EACH ROW EXECUTE FUNCTION public.tg_obra_item_para_biblioteca();

NOTIFY pgrst, 'reload schema';
