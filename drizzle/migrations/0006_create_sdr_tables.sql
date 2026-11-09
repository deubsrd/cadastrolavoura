-- SDR IA no WhatsApp (/admin/sdr) — Estratégia Agrotóxicos, fase 1
create table public.sdr_leads (
  id uuid primary key default gen_random_uuid(),
  wa_id text not null unique,
  nome text,
  nome_perfil text,
  origem text not null default 'whatsapp'
    check (origem in ('anuncio','site','instagram','indicacao','portal','whatsapp','outro')),
  anuncio jsonb,
  cidade text,
  bairro text,
  etapa text not null default 'novo'
    check (etapa in ('novo','contato','qualificado','agendada','realizada','cof','dia_lavoura','contrato','nutricao','perdido')),
  respostas jsonb not null default '{}'::jsonb,
  nota integer check (nota between 0 and 10),
  faixa text check (faixa in ('A','B','C')),
  ia_ativa boolean not null default true,
  precisa_humano boolean not null default false,
  motivo_humano text,
  opt_out boolean not null default false,
  motivo_perda text,
  observacoes text,
  entrou_em timestamptz not null default now(),
  primeiro_contato_em timestamptz,
  qualificado_em timestamptz,
  last_inbound_at timestamptz,
  last_message_at timestamptz,
  last_message_preview text,
  unread integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sdr_leads_last_message_idx on public.sdr_leads (last_message_at desc nulls last);
create index sdr_leads_etapa_idx on public.sdr_leads (etapa);

create table public.sdr_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.sdr_leads(id) on delete cascade,
  direction text not null check (direction in ('in','out')),
  sent_by text not null check (sent_by in ('lead','ia','humano','sistema')),
  type text not null default 'text',
  body text,
  payload jsonb,
  wa_message_id text unique,
  status text check (status in ('sent','delivered','read','failed')),
  error text,
  created_at timestamptz not null default now()
);
create index sdr_messages_lead_idx on public.sdr_messages (lead_id, created_at);

create table public.sdr_config (
  id boolean primary key default true check (id),
  ia_ligada boolean not null default true,
  mensagem_abertura text not null default
    'Oi, {nome}! Aqui é da Lavoura, lavanderia de autosserviço aberta 24h. Vi que você se interessou pela franquia. Pra eu te mandar as informações certas, posso te fazer 5 perguntas rápidas?',
  instrucoes text not null default '',
  base_conhecimento text not null default '',
  cidades_plano text not null default 'Roraima, Manaus, Natal, Campo Grande, região Sul',
  sdr_whatsapp text,
  closer_email text,
  updated_at timestamptz not null default now()
);
insert into public.sdr_config (id, closer_email, sdr_whatsapp)
values (true, 'deubsrd@gmail.com', '5592991176452')
on conflict (id) do update
  set closer_email = excluded.closer_email,
      sdr_whatsapp = excluded.sdr_whatsapp;

create trigger sdr_leads_updated before update on public.sdr_leads
  for each row execute function public.tg_set_updated_at();
create trigger sdr_config_updated before update on public.sdr_config
  for each row execute function public.tg_set_updated_at();

do $$
declare t text;
begin
  foreach t in array array['sdr_leads','sdr_messages','sdr_config'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format(
      'create policy "admin total" on public.%I for all to authenticated
         using (public.has_role(auth.uid(), ''admin''))
         with check (public.has_role(auth.uid(), ''admin''))', t);
  end loop;
end $$;

alter publication supabase_realtime add table public.sdr_leads, public.sdr_messages;