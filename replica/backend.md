# Backend — Social Selling

- Auth: login já existente do Sistema Lavoura; tudo atrás de `has_role(auth.uid(),'admin')` (RLS em todas as tabelas `ss_*`).
- Token do Instagram em `ss_channel_secrets` (RLS sem policy: só service role). Renovado diariamente pelo cron.
- Integrações oficiais: Instagram API com Instagram Login (OAuth, webhooks, Messaging API, comment replies, messenger_profile ice breakers), Claude API.
- Jobs: pg_cron 1x/min → `ss-engine` tick (Aguardar, expiração de 7 dias, sentimento, inbox); diário → refresh de token.
- Pagamentos/e-mail: não se aplicam (uso próprio).

## Checklist de segurança
- [x] segredos só em env vars das Edge Functions; nada no bundle do cliente
- [x] webhook valida `X-Hub-Signature-256` (HMAC com o app secret, comparação em tempo constante)
- [x] OAuth com `state` assinado (HMAC) e validade de 15 min
- [x] autorização checada em toda leitura/escrita (RLS testada: franqueado recebe 0 linhas e não insere)
- [x] link rastreado aceita só código hex e só redireciona para http(s) salvo pelo admin
- [x] uploads: bucket próprio, 25 MB, tipos de mídia permitidos, escrita só admin
- [x] sem dados pessoais em URLs (link rastreado usa código opaco)
- [ ] App Review da Meta para Acesso Avançado (necessário para o público; ver SOCIAL_SELLING.md)
