-- Move "Aluguel da máquina de café" da etapa 4 para a etapa 5
UPDATE public.jornada_subitens
SET etapa_id = (SELECT id FROM public.jornada_etapas WHERE numero = 5),
    ordem = (SELECT COALESCE(MAX(ordem), 0) + 1 FROM public.jornada_subitens WHERE etapa_id = (SELECT id FROM public.jornada_etapas WHERE numero = 5))
WHERE texto ILIKE '%aluguel da máquina de café%'
  AND etapa_id = (SELECT id FROM public.jornada_etapas WHERE numero = 4);
