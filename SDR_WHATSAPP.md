# SDR IA no WhatsApp — como colocar no ar (fase 1)

Módulo da Estratégia Agrotóxicos dentro do Sistema Lavoura, em **/admin/sdr**
(só o login da franqueadora enxerga). Todo lead que manda mensagem para o número
do WhatsApp da Lavoura recebe resposta da IA em menos de 1 minuto, passa pelo
filtro de 5 perguntas e ganha nota A, B ou C.

**Fase 1 (esta):** tabelas, webhook, agente com o filtro, telas Conversas e Agente.
**Próximas:** agenda do closer e alertas do SDR (fase 2), cadências com templates
(fase 3), pipeline em quadro e painel de expansão (fase 4).

## 1. Banco

Rodar a migration `supabase/migrations/20261108200000_sdr_whatsapp.sql`
(pelo Lovable ou no SQL Editor). Cria `sdr_leads`, `sdr_messages` e `sdr_config`,
todas com RLS só para admin e com tempo real ligado.

## 2. Edge Functions

```
supabase functions deploy wa-webhook sdr-engine
```

O `config.toml` já marca as duas como `verify_jwt = false`: o webhook valida a
assinatura da Meta e o `sdr-engine` valida o JWT de admin ou o `SS_SECRET`.

## 3. Variáveis (Edge Functions → Secrets)

| variável | o que é |
| --- | --- |
| `WA_PHONE_NUMBER_ID` | ID do número no app da Meta. Número de teste: `1358143747393394` |
| `WA_TOKEN` | Token de acesso. Para testar, o temporário da tela "Etapa 1. Experimente" (vale 24h). Para produção, o token permanente de um Usuário do sistema com `whatsapp_business_messaging` e `whatsapp_business_management` |
| `WA_WEBHOOK_VERIFY_TOKEN` | qualquer texto longo; o mesmo vai no painel da Meta |
| `WA_APP_SECRET` | opcional. Chave secreta do app (Configurações do app → Básico). Se não existir, usa `IG_APP_SECRET`, que é o mesmo app |
| `SS_SECRET` | já existe (social selling); usado na chamada interna webhook → agente |
| `ANTHROPIC_API_KEY` | já existe |
| `SDR_AI_MODEL` | opcional; padrão igual ao social selling |
| `WA_GRAPH_VERSION` | opcional; padrão `v24.0` |

## 4. Meta (app Lavoura Social Selling)

1. Casos de uso → Conectar no WhatsApp → **Configuração**: URL de callback =
   `https://vmaniutkhisiktjrgswd.supabase.co/functions/v1/wa-webhook`, token de
   verificação = o seu `WA_WEBHOOK_VERIFY_TOKEN`. Assinar o campo **messages**.
2. Com o número de teste, cadastre em "Etapa 1. Experimente → Destinatário" os
   telefones que vão testar (até 5). A Meta só deixa responder para eles.

## 5. Testar

Do seu celular cadastrado, mande "Oi, quero saber da franquia" para o número de
teste. Em até ~10 segundos a IA responde, e a conversa aparece em
/admin/sdr com a nota sendo preenchida a cada resposta do filtro.

## Regras que o agente segue

- Filtro e notas da Estratégia Agrotóxicos (orçamento, urgência, decisor, praça,
  ponto; 0 a 2 cada). A = 8 a 10, B = 5 a 7, C = 0 a 4.
- A e B: etapa "Qualificado" e alerta "Precisa humano" com o que fazer.
  C: etapa "Nutrição".
- Só usa números da base de conhecimento (tela Agente). Nunca promete
  faturamento ou retorno.
- Pausa e chama um humano se o lead pedir, se irritar ou sair do roteiro.
- "PARAR" ou "SAIR" bloqueia novas mensagens para o lead.
- Mensagens seguidas do lead viram uma resposta só (espera 5 segundos).
- Quando alguém da equipe responde pela tela, a IA pausa naquele lead; o botão
  "Devolver à IA" religa.
