CREATE TABLE public.jornada_etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INTEGER NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE public.jornada_subitens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_id UUID NOT NULL REFERENCES public.jornada_etapas(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE public.jornada_progresso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  subitem_id UUID NOT NULL REFERENCES public.jornada_subitens(id) ON DELETE CASCADE,
  concluido BOOLEAN NOT NULL DEFAULT false,
  concluido_em TIMESTAMPTZ,
  UNIQUE (unidade_id, subitem_id)
);

CREATE INDEX idx_jornada_progresso_unidade ON public.jornada_progresso(unidade_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.jornada_etapas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jornada_subitens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jornada_progresso TO authenticated;
GRANT ALL ON public.jornada_etapas TO service_role;
GRANT ALL ON public.jornada_subitens TO service_role;
GRANT ALL ON public.jornada_progresso TO service_role;

ALTER TABLE public.jornada_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jornada_subitens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jornada_progresso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem etapas" ON public.jornada_etapas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados leem subitens" ON public.jornada_subitens FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin gerencia etapas" ON public.jornada_etapas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin gerencia subitens" ON public.jornada_subitens FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin gerencia progresso" ON public.jornada_progresso FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Franqueado lê próprio progresso" ON public.jornada_progresso FOR SELECT TO authenticated
  USING (unidade_id = public.get_my_unidade_id());

WITH e1 AS (
  INSERT INTO public.jornada_etapas (numero, nome, descricao, ordem) VALUES
    (1, 'Preparando o Solo', 'Primeiros passos para estruturar a franquia', 1)
  RETURNING id
)
INSERT INTO public.jornada_subitens (etapa_id, texto, ordem) SELECT id, unnest(ARRAY[
  'Procura e definição do ponto comercial',
  'Pré-contrato de franquia (CPF → CNPJ)',
  'Compra das máquinas',
  'Pedido das dosadoras'
]), generate_series(1,4) FROM e1;

WITH e2 AS (
  INSERT INTO public.jornada_etapas (numero, nome, descricao, ordem) VALUES
    (2, 'Plantio da Lavoura', 'Reuniões e pedidos iniciais de equipamentos', 2)
  RETURNING id
)
INSERT INTO public.jornada_subitens (etapa_id, texto, ordem) SELECT id, unnest(ARRAY[
  'Reunião com contador',
  'Reunião com arquiteto',
  'Envio de documentos para o arquiteto',
  'Reunião com a Max Pan (pedido do totem de pagamento)',
  'Compra do totem'
]), generate_series(1,5) FROM e2;

WITH e3 AS (
  INSERT INTO public.jornada_etapas (numero, nome, descricao, ordem) VALUES
    (3, 'Germinação', 'Formalização jurídica e compras complementares', 3)
  RETURNING id
)
INSERT INTO public.jornada_subitens (etapa_id, texto, ordem) SELECT id, unnest(ARRAY[
  'Constituição do CNPJ',
  'Assinatura do contrato de franquia (CNPJ → CNPJ)',
  'Compra dos acessórios (cadeiras, ecotimer, etc.)'
]), generate_series(1,3) FROM e3;

WITH e4 AS (
  INSERT INTO public.jornada_etapas (numero, nome, descricao, ordem) VALUES
    (4, 'Maturação', 'Obras, instalações e treinamentos operacionais', 4)
  RETURNING id
)
INSERT INTO public.jornada_subitens (etapa_id, texto, ordem) SELECT id, unnest(ARRAY[
  'Reunião de entrega do projeto arquitetônico',
  'Abertura da conta bancária',
  'Início das obras',
  'Acompanhamento (rodamentos) da obra',
  'Dúvidas de mão de obra',
  'Pedido da fachada (placa ACM)',
  'Instalação da central de ar',
  'Instalação das câmeras',
  'Pedido de adesivos',
  'Aluguel da máquina de café',
  'Compra dos insumos',
  'Aula: gerenciamento administrativo',
  'Aula: funcionamento da lavagem / insumos',
  'Aula: processo de limpeza diária',
  'Aula: como gerenciar estoque'
]), generate_series(1,15) FROM e4;

WITH e5 AS (
  INSERT INTO public.jornada_etapas (numero, nome, descricao, ordem) VALUES
    (5, 'Florada', 'Marketing, treinamentos finais e preparação para abertura', 5)
  RETURNING id
)
INSERT INTO public.jornada_subitens (etapa_id, texto, ordem) SELECT id, unnest(ARRAY[
  'Instalação das máquinas',
  'Teste das máquinas',
  'Abertura do Instagram',
  'Criação do Google Maps',
  'Treinamento de marketing',
  'Aula: jeito Lavoura de falar com os clientes / como encantar',
  'Aula: processo de remarketing',
  'Tráfego pago',
  'Pré-marketing para lançamento'
]), generate_series(1,9) FROM e5;

WITH e6 AS (
  INSERT INTO public.jornada_etapas (numero, nome, descricao, ordem) VALUES
    (6, 'Hora da Colheita', 'Abertura oficial da unidade', 6)
  RETURNING id
)
INSERT INTO public.jornada_subitens (etapa_id, texto, ordem) SELECT id, unnest(ARRAY[
  'Evento de inauguração'
]), generate_series(1,1) FROM e6;