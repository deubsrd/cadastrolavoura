CREATE TABLE public.camisa_pedidos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  socio_id UUID NOT NULL REFERENCES public.socios(id) ON DELETE CASCADE,
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'atendido')),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.camisa_pedido_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID NOT NULL REFERENCES public.camisa_pedidos(id) ON DELETE CASCADE,
  tamanho TEXT NOT NULL CHECK (tamanho IN ('PP', 'P', 'M', 'G', 'GG', 'XG')),
  quantidade INT NOT NULL CHECK (quantidade > 0)
);

CREATE TRIGGER set_camisa_pedidos_updated_at BEFORE UPDATE ON public.camisa_pedidos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.camisa_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camisa_pedido_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franqueado ve seus proprios pedidos de camisa"
  ON public.camisa_pedidos FOR SELECT
  TO authenticated
  USING (socio_id IN (SELECT id FROM public.socios WHERE user_id = auth.uid()));

CREATE POLICY "Franqueado cria pedidos de camisa"
  ON public.camisa_pedidos FOR INSERT
  TO authenticated
  WITH CHECK (socio_id IN (SELECT id FROM public.socios WHERE user_id = auth.uid()));

CREATE POLICY "Franqueado ve itens dos seus pedidos de camisa"
  ON public.camisa_pedido_itens FOR SELECT
  TO authenticated
  USING (
    pedido_id IN (
      SELECT id FROM public.camisa_pedidos
      WHERE socio_id IN (SELECT id FROM public.socios WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Franqueado cria itens dos seus pedidos de camisa"
  ON public.camisa_pedido_itens FOR INSERT
  TO authenticated
  WITH CHECK (
    pedido_id IN (
      SELECT id FROM public.camisa_pedidos
      WHERE socio_id IN (SELECT id FROM public.socios WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Admin ve todos os pedidos de camisa"
  ON public.camisa_pedidos FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin atualiza pedidos de camisa"
  ON public.camisa_pedidos FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin ve todos os itens de pedido de camisa"
  ON public.camisa_pedido_itens FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT ON public.camisa_pedidos TO authenticated;
GRANT UPDATE ON public.camisa_pedidos TO authenticated;
GRANT SELECT, INSERT ON public.camisa_pedido_itens TO authenticated;
GRANT ALL ON public.camisa_pedidos TO service_role;
GRANT ALL ON public.camisa_pedido_itens TO service_role;

NOTIFY pgrst, 'reload schema';