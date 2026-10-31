# Roadmap — Social Selling (/admin/social)

- [ ] Ativar extensões pg_cron e pg_net
- [ ] Aplicar migration 20261030200000_social_selling.sql verbatim (tabelas ss_*, policies, ss_channel_secrets, ss_dashboard, bucket social-midia, realtime)
- [ ] Agendar cron jobs ss-engine-tick (*/min) e ss-ig-token-refresh (6h17 diário)
- [ ] Deploy das 5 edge functions: ig-oauth, ig-webhook, ss-engine, ss-ai, ss-link
- [ ] Secrets: SS_SECRET, SS_WEBHOOK_VERIFY_TOKEN, SS_APP_URL (set_secret); IG_APP_ID, IG_APP_SECRET (add_secret ao usuário)
- [ ] Confirmar: tabelas ss_* existem, 2 cron jobs em cron.job, 5 funções publicadas
