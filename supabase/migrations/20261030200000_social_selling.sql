-- Social Selling Lavoura (/admin/social)
-- Automação de Instagram: canais, contatos, automações em grafo, execuções,
-- inbox, chat, ranking e links rastreados. Tudo restrito ao admin.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ---------------------------------------------------------------- canais
create table public.ss_channels (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'instagram' check (kind in ('instagram','whatsapp')),
  external_id text not null,              -- IG user id (o mesmo que chega em entry.id)
  username text,
  name text,
  avatar_url text,
  token_expires_at timestamptz,
  status text not null default 'connected' check (status in ('connected','expired','disconnected')),
  timezone text not null default 'America/Manaus',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, external_id)
);

-- ---------------------------------------------------------------- contatos
create table public.ss_contacts (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.ss_channels(id) on delete cascade,
  external_id text not null,              -- IGSID
  username text,
  name text,
  avatar_url text,
  email text,
  whatsapp text,
  fields jsonb not null default '{}'::jsonb,
  score integer not null default 0,
  follows_business boolean,
  blocked boolean not null default false,
  automation_paused_until timestamptz,
  last_inbound_at timestamptz,            -- janela de 24h
  last_interaction_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel_id, external_id)
);
create index ss_contacts_score_idx on public.ss_contacts (score desc);
create index ss_contacts_last_interaction_idx on public.ss_contacts (last_interaction_at desc);

create table public.ss_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#394f3e',
  created_at timestamptz not null default now()
);

create table public.ss_contact_tags (
  contact_id uuid not null references public.ss_contacts(id) on delete cascade,
  tag_id uuid not null references public.ss_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (contact_id, tag_id)
);

create table public.ss_custom_fields (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9_]+$'),
  label text not null,
  type text not null default 'text' check (type in ('text','number','email','phone','date','boolean')),
  created_at timestamptz not null default now()
);

create table public.ss_variables (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9_]+$'),
  value text not null default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- automações
create table public.ss_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.ss_workflows (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references public.ss_folders(id) on delete set null,
  name text not null default 'Sem título',
  status text not null default 'draft' check (status in ('draft','active','paused')),
  graph jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  -- cópia desnormalizada do nó gatilho para o webhook casar rápido
  trigger_types text[] not null default '{}',
  published_at timestamptz,
  runs_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ss_workflows_active_idx on public.ss_workflows using gin (trigger_types) where status = 'active';

create table public.ss_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null default 'meus',  -- 'meus' | 'lavoura'
  graph jsonb not null,
  created_at timestamptz not null default now()
);

create table public.ss_reply_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  replies text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ss_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.ss_workflows(id) on delete cascade,
  contact_id uuid not null references public.ss_contacts(id) on delete cascade,
  event_id uuid,
  status text not null default 'queued'
    check (status in ('queued','running','waiting_time','waiting_input','waiting_click','done','failed','cancelled')),
  current_node text,
  resume_at timestamptz,
  context jsonb not null default '{}'::jsonb,   -- comment_id, media_id, texto, campo aguardado...
  error text,
  steps integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ss_runs_due_idx on public.ss_runs (resume_at) where status in ('queued','waiting_time');
create index ss_runs_waiting_idx on public.ss_runs (contact_id) where status in ('waiting_input','waiting_click');

-- ---------------------------------------------------------------- eventos / conversa
create table public.ss_events (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.ss_channels(id) on delete cascade,
  contact_id uuid references public.ss_contacts(id) on delete set null,
  kind text not null check (kind in ('comment','dm','story_reply','story_mention','live_comment','postback')),
  external_id text not null,               -- comment id / message mid
  media_id text,
  text text,
  sentiment text check (sentiment in ('positivo','neutro','negativo')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (channel_id, kind, external_id)
);
create index ss_events_created_idx on public.ss_events (created_at desc);

create table public.ss_inbox_columns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  criteria text not null default '',      -- descrição em linguagem natural para a IA
  color text not null default '#394f3e',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.ss_conversations (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.ss_channels(id) on delete cascade,
  contact_id uuid not null references public.ss_contacts(id) on delete cascade,
  column_id uuid references public.ss_inbox_columns(id) on delete set null,
  status text not null default 'open' check (status in ('open','done')),
  starred boolean not null default false,
  unread integer not null default 0,
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz not null default now(),
  unique (channel_id, contact_id)
);
create index ss_conversations_last_idx on public.ss_conversations (last_message_at desc);

create table public.ss_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ss_conversations(id) on delete cascade,
  direction text not null check (direction in ('in','out')),
  sent_by text not null default 'contact' check (sent_by in ('contact','automation','human')),
  external_id text,
  content jsonb not null,                 -- {text} | {attachment:{type,url}} | {template...}
  workflow_id uuid references public.ss_workflows(id) on delete set null,
  error text,
  created_at timestamptz not null default now()
);
create index ss_messages_conv_idx on public.ss_messages (conversation_id, created_at);
create unique index ss_messages_ext_idx on public.ss_messages (external_id) where external_id is not null;

create table public.ss_shortcuts (
  id uuid primary key default gen_random_uuid(),
  shortcut text not null unique,
  text text not null,
  created_at timestamptz not null default now()
);

create table public.ss_ice_breakers (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  workflow_id uuid references public.ss_workflows(id) on delete set null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- links rastreados
create table public.ss_links (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default substr(replace(gen_random_uuid()::text,'-',''),1,10),
  url text not null,
  workflow_id uuid references public.ss_workflows(id) on delete set null,
  contact_id uuid references public.ss_contacts(id) on delete set null,
  run_id uuid,
  created_at timestamptz not null default now()
);

create table public.ss_link_clicks (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.ss_links(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index ss_link_clicks_created_idx on public.ss_link_clicks (created_at desc);

-- ---------------------------------------------------------------- configurações
create table public.ss_settings (
  id boolean primary key default true check (id),   -- linha única
  score_points jsonb not null default
    '{"comment":3,"story_reply":4,"story_mention":5,"live_comment":2,"dm":5,"whatsapp":5}'::jsonb,
  blocked_words text[] not null default '{}',
  minutes_saved_per_reply numeric not null default 1.5,
  ai_tone text not null default 'Próximo, caloroso, direto. Nunca usa "self service", sempre "autosserviço".',
  updated_at timestamptz not null default now()
);
insert into public.ss_settings (id) values (true) on conflict do nothing;

-- ---------------------------------------------------------------- updated_at
create trigger ss_channels_updated before update on public.ss_channels for each row execute function public.tg_set_updated_at();
create trigger ss_contacts_updated before update on public.ss_contacts for each row execute function public.tg_set_updated_at();
create trigger ss_workflows_updated before update on public.ss_workflows for each row execute function public.tg_set_updated_at();
create trigger ss_runs_updated before update on public.ss_runs for each row execute function public.tg_set_updated_at();
create trigger ss_reply_lists_updated before update on public.ss_reply_lists for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------- RLS: só admin
do $$
declare t text;
begin
  foreach t in array array[
    'ss_channels','ss_contacts','ss_tags','ss_contact_tags','ss_custom_fields','ss_variables',
    'ss_folders','ss_workflows','ss_templates','ss_reply_lists','ss_runs','ss_events',
    'ss_inbox_columns','ss_conversations','ss_messages','ss_shortcuts','ss_ice_breakers',
    'ss_links','ss_link_clicks','ss_settings'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "admin total" on public.%I for all to authenticated
         using (public.has_role(auth.uid(), ''admin''))
         with check (public.has_role(auth.uid(), ''admin''))', t);
  end loop;
end $$;

-- O token do Instagram fica numa tabela sem policy: só as edge functions
-- (service role) leem. Nunca chega ao navegador.
create table public.ss_channel_secrets (
  channel_id uuid primary key references public.ss_channels(id) on delete cascade,
  access_token text not null,
  updated_at timestamptz not null default now()
);
alter table public.ss_channel_secrets enable row level security;

-- ---------------------------------------------------------------- métricas
create or replace function public.ss_dashboard(_from timestamptz, _to timestamptz)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select case when not public.has_role(auth.uid(), 'admin') then null else jsonb_build_object(
    'auto_replies', (select count(*) from ss_messages where sent_by = 'automation' and direction = 'out' and created_at between _from and _to),
    'link_clicks',  (select count(*) from ss_link_clicks where created_at between _from and _to),
    'new_contacts', (select count(*) from ss_contacts where created_at between _from and _to),
    'minutes_saved', (select round(count(*) * (select minutes_saved_per_reply from ss_settings limit 1))
                       from ss_messages where sent_by = 'automation' and direction = 'out' and created_at between _from and _to),
    'by_kind', (select coalesce(jsonb_object_agg(kind, n), '{}'::jsonb) from (
                 select kind, count(*) n from ss_events where created_at between _from and _to group by kind) k),
    'by_day', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'total', n) order by d), '[]'::jsonb) from (
                 select date_trunc('day', created_at at time zone 'America/Manaus')::date d, count(*) n
                 from ss_events where created_at between _from and _to group by 1) x),
    'sentiment', (select coalesce(jsonb_object_agg(sentiment, n), '{}'::jsonb) from (
                 select sentiment, count(*) n from ss_events where sentiment is not null and created_at between _from and _to group by 1) s)
  ) end
$$;
grant execute on function public.ss_dashboard(timestamptz, timestamptz) to authenticated;

-- Realtime para o chat e o inbox
alter publication supabase_realtime add table public.ss_messages, public.ss_conversations;

-- Mídias das mensagens (imagem, vídeo, áudio, PDF). Leitura pública porque o
-- Instagram baixa o arquivo pela URL; só o admin envia/apaga.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('social-midia', 'social-midia', true, 26214400,
        array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','audio/mpeg','audio/mp4','audio/aac','audio/wav','application/pdf'])
on conflict (id) do nothing;

create policy "social-midia admin envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'social-midia' and public.has_role(auth.uid(), 'admin'));
create policy "social-midia admin apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'social-midia' and public.has_role(auth.uid(), 'admin'));
