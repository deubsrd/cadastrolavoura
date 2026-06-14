ALTER TABLE public.obra_checklist_itens
  ADD COLUMN IF NOT EXISTS link_compra TEXT,
  ADD COLUMN IF NOT EXISTS foto_url TEXT;