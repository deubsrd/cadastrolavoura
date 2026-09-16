-- Cada item do pedido de camisa agora também especifica o gênero
-- (masculino/feminino), além do tamanho.
ALTER TABLE public.camisa_pedido_itens
  ADD COLUMN IF NOT EXISTS genero TEXT NOT NULL DEFAULT 'masculino'
    CHECK (genero IN ('masculino', 'feminino'));

NOTIFY pgrst, 'reload schema';
