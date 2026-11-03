# Roadmap — Social Selling (/admin/social)

- [x] Ativar extensões pg_cron e pg_net
- [x] Secrets: SS_SECRET, SS_WEBHOOK_VERIFY_TOKEN, SS_APP_URL (set_secret); IG_APP_ID, IG_APP_SECRET (usuário preencheu)
- [ ] Aplicar migration 20261030200000_social_selling.sql verbatim — BLOQUEADO: arquivo não existe no repositório do Lovable (merge do GitHub ainda não sincronizado; remoto tem commits novos)
- [ ] Agendar cron jobs ss-engine-tick (*/min) e ss-ig-token-refresh (6h17 diário) — aguarda migration + functions
- [ ] Deploy das 5 edge functions: ig-oauth, ig-webhook, ss-engine, ss-ai, ss-link — BLOQUEADO: pastas não existem em supabase/functions/
- [ ] Confirmar: tabelas ss_* existem, 2 cron jobs em cron.job, 5 funções publicadas
