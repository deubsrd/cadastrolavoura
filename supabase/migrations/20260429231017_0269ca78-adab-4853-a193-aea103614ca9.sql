-- Table for unit documents
CREATE TABLE public.unidade_documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('cof', 'pre_contrato', 'contrato', 'outros')),
  nome TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  tamanho_bytes BIGINT,
  data_vencimento DATE,
  arquivado BOOLEAN NOT NULL DEFAULT false,
  versao INTEGER NOT NULL DEFAULT 1,
  substituido_por UUID REFERENCES public.unidade_documentos(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_unidade_documentos_unidade ON public.unidade_documentos(unidade_id);
CREATE INDEX idx_unidade_documentos_tipo ON public.unidade_documentos(unidade_id, tipo, arquivado);

ALTER TABLE public.unidade_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode visualizar documentos das unidades"
  ON public.unidade_documentos FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin pode inserir documentos das unidades"
  ON public.unidade_documentos FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin pode atualizar documentos das unidades"
  ON public.unidade_documentos FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin pode excluir documentos das unidades"
  ON public.unidade_documentos FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_updated_at_unidade_documentos
  BEFORE UPDATE ON public.unidade_documentos
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_updated_at();

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('unidade-documentos', 'unidade-documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: admins only
CREATE POLICY "Admin pode ver arquivos de unidade"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'unidade-documentos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin pode enviar arquivos de unidade"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'unidade-documentos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin pode atualizar arquivos de unidade"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'unidade-documentos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin pode excluir arquivos de unidade"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'unidade-documentos' AND has_role(auth.uid(), 'admin'::app_role));