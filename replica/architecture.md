# Arquitetura — Social Selling Lavoura (clone funcional do Gaio)

Vive dentro do Sistema Lavoura (`cadastrolavoura`), na área da franqueadora
(`/admin/social`). Só o admin (`has_role(auth.uid(), 'admin')`) enxerga.

## Stack (a mesma do repo, nada novo além do canvas)

| camada | escolha | por quê |
| --- | --- | --- |
| Front | TanStack Start/Router + shadcn + Tailwind (já no repo) | mesmo padrão das outras telas admin |
| Canvas do editor | `@xyflow/react` | única dependência nova; editor de nós maduro |
| Banco | Supabase Postgres, tabelas `ss_*`, RLS só admin | — |
| Backend | Supabase Edge Functions (Deno), autocontidas como as já existentes | — |
| Jobs | `pg_cron` + `pg_net` chamando `ss-engine` a cada minuto | bloco Aguardar, retomadas, renovação de token |
| IA | Claude API (`ANTHROPIC_API_KEY` já usado em gerar-legenda) | — |
| Instagram | Instagram API com Instagram Login (graph.instagram.com) | oficial; modo desenvolvimento dispensa App Review para o próprio perfil |
| WhatsApp | Z-API (opcional, via bloco HTTP) | você já usa |

## Edge Functions

| função | auth | faz |
| --- | --- | --- |
| `ig-oauth` | JWT admin (start) / pública (callback) | gera URL de login do Instagram; troca code → token longo (60 dias), salva canal, assina webhooks |
| `ig-webhook` | pública + assinatura `X-Hub-Signature-256` | valida, grava evento, atualiza contato/conversa/mensagem, casa gatilhos, cria runs, chama o motor |
| `ss-engine` | segredo `x-ss-secret` (cron/webhook) ou JWT admin | executa runs (todos os blocos), retoma Aguardar, renova tokens |
| `ss-api` | JWT admin | ações do painel: enviar DM manual, listar posts, testar automação, ações em massa |
| `ss-ai` | JWT admin | gerar respostas públicas, criar automação por descrição, classificar inbox, sentimento, analisar perfil |
| `ss-link` | pública | redireciona link rastreado e registra clique |

## Modelo de dados (resumo — SQL completo na migration)

`ss_channels` · `ss_contacts` · `ss_tags` · `ss_contact_tags` · `ss_custom_fields` ·
`ss_folders` · `ss_workflows` (grafo JSON) · `ss_runs` · `ss_events` · `ss_conversations` ·
`ss_messages` · `ss_inbox_columns` · `ss_reply_lists` · `ss_shortcuts` · `ss_ice_breakers` ·
`ss_variables` · `ss_links` · `ss_link_clicks` · `ss_settings` (pontos do ranking, bloqueios) · `ss_templates` · `ss_blocklist`

Grafo da automação: `{ nodes: [{ id, type, position, data }], edges: [{ id, source, sourceHandle, target }] }`.
O nó `trigger` é único e guarda tipos, palavras-chave, escopo de posts e respostas públicas.

## Regras da Meta que o motor respeita

- Só manda DM para quem interagiu (comentário → resposta privada via `recipient.comment_id`, uma por comentário).
- Janela de 24h desde a última mensagem do contato; fora dela o envio é bloqueado e registrado.
- Ignora eco (`is_echo`) e comentários do próprio perfil (evita loop).
- Um mesmo contato não dispara a mesma automação mais de uma vez por post/comentário (deduplicação por `ss_events.external_id`).

## Rotas

`/admin/social` Geral · `/admin/social/assistente` · `/admin/social/automacoes` ·
`/admin/social/automacoes/$id` (editor) · `/admin/social/respostas` · `/admin/social/templates` ·
`/admin/social/chat` · `/admin/social/inbox` · `/admin/social/contatos` · `/admin/social/ranking` ·
`/admin/social/config`

## Ordem de build

1. Migration + `ig-oauth` + `ig-webhook` + `ss-engine` (fatia vertical: comentário → resposta + DM)
2. Editor com todos os blocos
3. Contatos, ranking, chat, inbox
4. IA, templates, métricas
