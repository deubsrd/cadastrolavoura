-- Adiciona link de compra e foto a cada item do checklist de obra
ALTER TABLE public.obra_checklist_itens
  ADD COLUMN IF NOT EXISTS link_compra TEXT,
  ADD COLUMN IF NOT EXISTS foto_url TEXT;
