-- Estrutura pra receber os vídeos de treinamento por etapa da jornada
-- (Central de Suporte > Treinamentos). Sem vídeo ainda: fica "Em breve" no
-- front. Quando o vídeo existir, basta popular video_url pela etapa.
ALTER TABLE public.jornada_etapas
  ADD COLUMN IF NOT EXISTS video_url TEXT;

NOTIFY pgrst, 'reload schema';
