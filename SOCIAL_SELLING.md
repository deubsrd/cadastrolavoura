# Social Selling Lavoura — como colocar no ar

Módulo de automação do Instagram dentro do Sistema Lavoura, em **/admin/social**
(só o login da franqueadora enxerga). Faz o que o Gaio faz, sem limite de contatos
e sem marca d'água: comentário → resposta pública + DM com link, coleta de
WhatsApp/e-mail, perguntas, cartões, mídia, condições (inclusive "segue o perfil"),
teste A/B, HTTP/CRM, Google Sheets, IA, chat ao vivo, inbox com colunas da IA,
contatos, ranking, templates e assistente.

## 1. Banco (Supabase, projeto vmaniutkhisiktjrgswd)

1. Rodar a migration `supabase/migrations/20261030200000_social_selling.sql`
   (`supabase db push` ou colar no SQL Editor).
2. Rodar **uma vez** `replica/sql/cron_social_selling.sql` no SQL Editor, trocando
   `SEU_SS_SECRET` pelo mesmo valor da variável `SS_SECRET` (passo 3). Ele agenda o
   motor a cada minuto (bloco Aguardar, IA do inbox, sentimento) e a renovação
   diária do token do Instagram.

## 2. Edge Functions

```
supabase functions deploy ig-oauth ig-webhook ss-engine ss-ai ss-link
```

(o `config.toml` já marca as cinco como `verify_jwt = false`; cada uma valida
admin, assinatura da Meta ou segredo interno por conta própria.)

## 3. Variáveis (Supabase → Edge Functions → Secrets)

| variável | o que é |
| --- | --- |
| `IG_APP_ID` | "ID do app do Instagram" (passo 4.4) |
| `IG_APP_SECRET` | "Chave secreta do app do Instagram" (passo 4.4) |
| `SS_WEBHOOK_VERIFY_TOKEN` | qualquer texto longo que você inventar; o mesmo vai no painel da Meta |
| `SS_SECRET` | outro texto longo aleatório (cron e chamadas internas) |
| `SS_APP_URL` | endereço do sistema, ex.: `https://sistema.lavanderialavoura.com.br` |
| `ANTHROPIC_API_KEY` | já existe (usado no gerar-legenda) |
| `SS_AI_MODEL` | opcional; padrão `claude-sonnet-5`, o mesmo do gerar-legenda |
| `IG_GRAPH_VERSION` | opcional; padrão `v24.0` |

Gerar segredo: `openssl rand -hex 32`.

## 4. App na Meta (você faz, uma vez)

1. O Instagram da Lavoura precisa ser **conta profissional** (Empresa ou Criador).
2. No app do Instagram: Configurações → Mensagens e respostas → Ferramentas
   conectadas → **Permitir acesso às mensagens** = ligado.
3. Em developers.facebook.com → Meus apps → Criar app → caso de uso
   **"Gerenciar mensagens e conteúdo no Instagram"** → tipo Empresa.
4. No app criado: Instagram → **Configuração da API com login do Instagram**:
   1. *Configurar webhooks*: URL de callback = `https://vmaniutkhisiktjrgswd.supabase.co/functions/v1/ig-webhook`,
      token de verificação = o seu `SS_WEBHOOK_VERIFY_TOKEN`. Assinar: `comments`,
      `live_comments`, `messages`, `messaging_postbacks`.
   2. *Configurar login empresarial do Instagram*: URL de redirecionamento OAuth =
      `https://vmaniutkhisiktjrgswd.supabase.co/functions/v1/ig-oauth`.
   3. Permissões: `instagram_business_basic`, `instagram_business_manage_messages`,
      `instagram_business_manage_comments`.
   4. Copiar **ID do app do Instagram** e **chave secreta** para as variáveis.
   (Os dois endereços também aparecem, com botão de copiar, em /admin/social/config.)
5. No sistema: /admin/social/config → **Conectar Instagram** → login → pronto.

### ⚠️ Modo desenvolvimento x modo Live (importante)

- **Em modo desenvolvimento** (sem App Review) a Meta só entrega comentários e DMs
  de contas que têm função no app. Dá para testar tudo: em Funções do app →
  Testadores do Instagram, adicione 1 ou 2 perfis seus e aceite o convite no app
  do Instagram (Configurações → Apps e sites → Convites de testador).
- **Para funcionar com o público** (qualquer seguidor comentando), o app precisa de
  **Acesso Avançado** em `instagram_business_manage_messages` e
  `instagram_business_manage_comments`, o que exige **App Review** e trocar o app
  para **Live**. A Meta costuma pedir a verificação da empresa e um vídeo mostrando
  o uso. Requisito da Meta: pelo menos 1 chamada de API bem-sucedida antes de
  pedir o acesso (conectar o Instagram e testar uma automação já cumpre).
  Leve em conta alguns dias a algumas semanas de análise.

## 5. Regras do Instagram que o sistema já respeita

- DM só para quem interagiu. Depois de um **comentário**, sai **1** mensagem
  (resposta privada); a próxima só depois que a pessoa responder ou clicar num
  botão. Por isso os templates usam "Quero o link" antes do link.
- Janela de 24h: fora dela o chat e o envio em massa bloqueiam o envio.
- Botões: até 3 por mensagem, texto até 20 caracteres; até 10 cartões; até 13
  respostas rápidas.
- Ignora eco das próprias mensagens e comentários do próprio perfil (sem loop).

## 6. O que ficou de fora e por quê

- **Missões, recompensas, marca d'água, limite de contatos**: mecânicas de venda
  do Gaio, não fazem sentido para uso próprio.
- **Comunidade de templates de terceiros**: virou a Biblioteca Lavoura (7
  templates, incluindo "Quero ser franqueado").
- **Bloco Código (JS livre)**: rodaria dentro da função que guarda a chave de
  serviço do Supabase; o bloco HTTP cobre os mesmos casos com segurança.
- **Membros da equipe / log de auditoria**: só você acessa a área da franqueadora.
- **Google Sheets** usa um Web App do Apps Script (o editor mostra o código pronto)
  em vez de OAuth do Google, que exigiria verificação do Google.
