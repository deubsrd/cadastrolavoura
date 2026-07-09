-- Etapa 7: Cuidando da Lavoura
-- Move todas as aulas das etapas 4 e 5 para esta nova etapa

-- 1) Insere a nova etapa
INSERT INTO public.jornada_etapas (numero, nome, descricao, ordem)
VALUES (7, 'Cuidando da Lavoura', 'Aulas e capacitações para a gestão contínua da unidade', 7);

-- 2) Move os subitens de "aula" para a nova etapa
UPDATE public.jornada_subitens
SET etapa_id = (SELECT id FROM public.jornada_etapas WHERE numero = 7),
    ordem = ROW_NUMBER() OVER (ORDER BY ordem)
WHERE texto ILIKE 'aula:%'
  AND etapa_id IN (
    SELECT id FROM public.jornada_etapas WHERE numero IN (4, 5)
  );

-- 3) Reordena os subitens restantes da etapa 4
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY ordem) AS nova_ordem
  FROM public.jornada_subitens
  WHERE etapa_id = (SELECT id FROM public.jornada_etapas WHERE numero = 4)
)
UPDATE public.jornada_subitens s
SET ordem = r.nova_ordem
FROM ranked r
WHERE s.id = r.id;

-- 4) Reordena os subitens restantes da etapa 5
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY ordem) AS nova_ordem
  FROM public.jornada_subitens
  WHERE etapa_id = (SELECT id FROM public.jornada_etapas WHERE numero = 5)
)
UPDATE public.jornada_subitens s
SET ordem = r.nova_ordem
FROM ranked r
WHERE s.id = r.id;

NOTIFY pgrst, 'reload schema';
