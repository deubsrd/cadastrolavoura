-- Adiciona a profissão do sócio, exigida no cabeçalho do Contrato de Franquia
-- ("...[NACIONALIDADE], [ESTADO CIVIL], [PROFISSÃO], portador(a) da Cédula...").
alter table public.socios
  add column if not exists profissao text;

comment on column public.socios.profissao is 'Profissão do sócio, usada no Contrato de Franquia e demais documentos';