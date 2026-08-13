-- ============================================================
-- Acompanhamento de Gastos da Obra por Unidade
-- ============================================================

CREATE TABLE public.obra_gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  descricao TEXT NOT NULL,
  valor_previsto NUMERIC(12,2),
  valor_pago NUMERIC(12,2) DEFAULT 0,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_obra_gastos_unidade ON public.obra_gastos(unidade_id);

ALTER TABLE public.obra_gastos ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at_obra_gastos
  BEFORE UPDATE ON public.obra_gastos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Admin: CRUD total
CREATE POLICY "Admin gerencia gastos de obra"
  ON public.obra_gastos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Franqueado: lê e atualiza (apenas valor_pago) da própria unidade
CREATE POLICY "Franqueado lê gastos da própria unidade"
  ON public.obra_gastos FOR SELECT
  TO authenticated
  USING (unidade_id = public.get_my_unidade_id());

CREATE POLICY "Franqueado atualiza valor pago da própria unidade"
  ON public.obra_gastos FOR UPDATE
  TO authenticated
  USING (unidade_id = public.get_my_unidade_id())
  WITH CHECK (unidade_id = public.get_my_unidade_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.obra_gastos TO authenticated;

-- ============================================================
-- Função para popular os gastos padrão de uma nova unidade
-- ============================================================
CREATE OR REPLACE FUNCTION public.popular_gastos_padrao(p_unidade_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só insere se a unidade ainda não tem gastos cadastrados
  IF EXISTS (SELECT 1 FROM public.obra_gastos WHERE unidade_id = p_unidade_id LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO public.obra_gastos (unidade_id, categoria, descricao, valor_previsto, ordem) VALUES
  -- 1. Máquinas e Equipamentos
  (p_unidade_id, '1. Máquinas e Equipamentos', 'Máquina de lavar 10kg (4 un.)', 26000.00, 1),
  (p_unidade_id, '1. Máquinas e Equipamentos', 'Secadora 10kg (4 un.)', 22000.00, 2),
  (p_unidade_id, '1. Máquinas e Equipamentos', 'Dosadoras (4 un.)', 3200.00, 3),
  (p_unidade_id, '1. Máquinas e Equipamentos', 'Totem de pagamento', 6900.00, 4),
  (p_unidade_id, '1. Máquinas e Equipamentos', 'Máquina de café (aluguel mensal)', 0.00, 5),
  -- 2. Tecnologia e Sistemas
  (p_unidade_id, '2. Tecnologia e Sistemas', 'Sistema Face ID (geladeira)', 3500.00, 1),
  (p_unidade_id, '2. Tecnologia e Sistemas', 'Câmeras de segurança', 1800.00, 2),
  (p_unidade_id, '2. Tecnologia e Sistemas', 'Roteador / internet', 300.00, 3),
  -- 3. Adequações do Imóvel - Mobília
  (p_unidade_id, '3. Adequações do Imóvel - Mobília', 'Mesa para dobrar roupas', 900.00, 1),
  (p_unidade_id, '3. Adequações do Imóvel - Mobília', 'Mesa de coworking', 400.00, 2),
  (p_unidade_id, '3. Adequações do Imóvel - Mobília', 'Poltronas (4 un.)', 1400.00, 3),
  (p_unidade_id, '3. Adequações do Imóvel - Mobília', 'Cadeiras Tramontina lavanda (2 un.)', 450.00, 4),
  (p_unidade_id, '3. Adequações do Imóvel - Mobília', 'Cestos roupas limpas (3 un.)', 500.00, 5),
  (p_unidade_id, '3. Adequações do Imóvel - Mobília', 'Cestos roupas sujas (3 un.)', 300.00, 6),
  (p_unidade_id, '3. Adequações do Imóvel - Mobília', 'Lixeiras 60L', 200.00, 7),
  (p_unidade_id, '3. Adequações do Imóvel - Mobília', 'Borrifadores 1L (4 un.)', 95.00, 8),
  (p_unidade_id, '3. Adequações do Imóvel - Mobília', 'Tapete entrada', 400.00, 9),
  (p_unidade_id, '3. Adequações do Imóvel - Mobília', 'Tapete máquinas', 800.00, 10),
  (p_unidade_id, '3. Adequações do Imóvel - Mobília', 'Central de ar-condicionado 18.000btus', 2300.00, 11),
  (p_unidade_id, '3. Adequações do Imóvel - Mobília', 'Brinquedos psicomotores (6 un.)', 350.00, 12),
  -- 4. Identificação Visual
  (p_unidade_id, '4. Identificação Visual', 'Fachada', 4900.00, 1),
  (p_unidade_id, '4. Identificação Visual', 'Wind Banner (4 un.)', 1120.00, 2),
  (p_unidade_id, '4. Identificação Visual', 'Adesivos internos', 0.00, 3),
  -- 5. Marketing de Inauguração
  (p_unidade_id, '5. Marketing de Inauguração', 'Tráfego pago Instagram (mensal)', 1000.00, 1),
  (p_unidade_id, '5. Marketing de Inauguração', 'Evento de inauguração', 0.00, 2),
  -- 6. Custo Operacional (Reforma)
  (p_unidade_id, '6. Custo Operacional - Reforma', 'Pedreiro + material', NULL, 1),
  (p_unidade_id, '6. Custo Operacional - Reforma', 'Vidraceiro + material', NULL, 2),
  (p_unidade_id, '6. Custo Operacional - Reforma', 'Eletricista + material', 4500.00, 3),
  (p_unidade_id, '6. Custo Operacional - Reforma', 'Marceneiro + material', 2000.00, 4),
  (p_unidade_id, '6. Custo Operacional - Reforma', 'Acartonador + material', 3000.00, 5),
  (p_unidade_id, '6. Custo Operacional - Reforma', 'Pintor + material', 2500.00, 6),
  (p_unidade_id, '6. Custo Operacional - Reforma', 'Hidráulica + material', 4500.00, 7),
  (p_unidade_id, '6. Custo Operacional - Reforma', 'Instalação da central de ar', 400.00, 8),
  (p_unidade_id, '6. Custo Operacional - Reforma', 'Arquiteto', 6000.00, 9),
  -- 7. Estoque Inicial
  (p_unidade_id, '7. Estoque Inicial', 'Lava roupas líquido (120L)', 1079.00, 1),
  (p_unidade_id, '7. Estoque Inicial', 'Amaciante (120L)', 1750.00, 2),
  -- 8. Diversos
  (p_unidade_id, '8. Diversos', 'Contador', 600.00, 1),
  (p_unidade_id, '8. Diversos', 'Taxa de franquia', 0.00, 2);
END;
$$;

GRANT EXECUTE ON FUNCTION public.popular_gastos_padrao(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
