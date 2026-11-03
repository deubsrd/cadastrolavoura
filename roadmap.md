# Roadmap — Social Selling (/admin/social)

- [x] Ativar extensões pg_cron e pg_net
- [x] Secrets: SS_SECRET, SS_WEBHOOK_VERIFY_TOKEN, SS_APP_URL; IG_APP_ID, IG_APP_SECRET (usuário)
- [x] Aplicar migration social_selling (tabelas ss_*, policies, ss_channel_secrets, ss_dashboard, realtime) + GRANTs
- [x] Bucket social-midia criado (privado — público bloqueado pelo workspace)
- [x] Cron jobs ss-engine-tick (a cada minuto) e ss-ig-token-refresh (6h17 diário) ativos
- [x] Deploy das 5 edge functions: ig-oauth, ig-webhook, ss-engine, ss-ai, ss-link
- [x] Confirmado: 21 tabelas ss_*, 2 jobs em cron.job, /admin/social/config renderiza como admin
