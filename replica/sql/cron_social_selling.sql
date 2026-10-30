-- Rodar UMA vez no SQL Editor do Supabase, depois da migration.
-- Troque SEU_SS_SECRET pelo mesmo valor da variável SS_SECRET das Edge Functions.
-- (Fica fora das migrations para o segredo não ir para o GitHub.)

select cron.schedule(
  'ss-engine-tick', '* * * * *',
  $$ select net.http_post(
       url := 'https://vmaniutkhisiktjrgswd.supabase.co/functions/v1/ss-engine',
       headers := '{"Content-Type":"application/json","x-ss-secret":"SEU_SS_SECRET"}'::jsonb,
       body := '{"action":"tick"}'::jsonb) $$
);

select cron.schedule(
  'ss-ig-token-refresh', '17 6 * * *',
  $$ select net.http_post(
       url := 'https://vmaniutkhisiktjrgswd.supabase.co/functions/v1/ig-oauth',
       headers := '{"Content-Type":"application/json","x-ss-secret":"SEU_SS_SECRET"}'::jsonb,
       body := '{"action":"refresh"}'::jsonb) $$
);
