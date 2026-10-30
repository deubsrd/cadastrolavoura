# Recon map: Gaio (web app, app.gaio.social)

Escopo: todo o produto de automação de Instagram/social selling (grátis + Pro)
Para: uso próprio de Deubson / Lavoura (perfil "Lavanderia Lavoura | Franquias"), sem revenda
Data: 2026-10-30
Fonte principal: a própria conta do usuário (plano Free), navegada com ele presente.
Nenhum código, bundle ou chamada de rede do Gaio foi lido ou copiado.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | conta do usuário | https://app.gaio.social/general | dashboard, menus, construtor, configurações |
| 2 | página de assinatura | https://app.gaio.social/settings/account/subscription | Free 500 contatos; Pro a partir de R$ 74,90/mês |
| 3 | API oficial do Instagram (Meta) | https://developers.facebook.com/docs/instagram-platform | base técnica do clone: webhooks + Messaging API |

## Core loop

Alguém comenta / responde story / manda DM no Instagram → automação dispara → responde em público e manda DM com link/botões → captura o contato (WhatsApp, e-mail, etiquetas) → o time continua a conversa no Inbox.

## Plano Free vs Pro (o que a Gaio cobra)

O Pro não libera funcionalidade nova no construtor: remove a marca d'água das mensagens, sobe o limite de contatos (500 → 1500+), libera templates premium e suporte. No clone isso tudo vira "sem limite, sem marca".

## Screens

| ID | screen | rota | propósito | componentes | estados vistos |
| --- | --- | --- | --- | --- | --- |
| S01 | Página inicial | / | atalhos | cards | — |
| S02 | Geral (dashboard) | /general | KPIs, missões de onboarding, objetivos rápidos, relatório de interações | KPI cards, toggle Dia/Semana/Mês, stepper de missões, cards de objetivo, gráfico diário, sentimento | vazio (sem automação) |
| S03 | Assistente IA | /assistant | chat de IA: criar automação, recomendar, analisar perfil, sugerir colunas do inbox | chat, chips de ação | vazio |
| S04 | Lista de automações | /workflows | buscar, filtrar (status, gatilho, palavra-chave, no conteúdo), pastas, ordenar | tabela, filtros, pastas | vazio |
| S05 | Nova automação: escolha | /workflows/:id/editor | Criar com IA / Começar com template / Criar do zero | 3 cards | — |
| S06 | Editor (canvas) | /workflows/:id/editor | fluxo em nós: gatilho → blocos; testar e publicar; métricas; desfazer/refazer; organizar; zoom; painel IA | canvas, nós, painel lateral, toolbar | rascunho, salvo automático |
| S07 | Wizard de gatilho | painel do S06 | 3 etapas: palavras-chave → quais posts → resposta pública | stepper, select, radio, lista de respostas, "Gerar com IA" | — |
| S08 | Lista de blocos | painel do S06 | Mensagem, Etiquetas, Aguardar, Condicional, Distribuir; Avançado: Iniciar automação, Pausar automações, Matemática, Campo personalizado, Requisição HTTP, Google Sheets, Código (beta); Peça à IA | busca, lista | — |
| S09 | Bloco Mensagem | painel do S06 | conteúdo: Mensagem (texto+botões), Pergunta, Cartões, Aguardar, Áudio, Imagem, Vídeo, PDF | lista de sub-blocos | — |
| S10 | Lista de respostas | /replies-list | conjuntos de respostas públicas reutilizáveis | tabela (nome, publicada em, em uso, ações) | vazio |
| S11 | Meus templates | /templates | automações salvas como modelo | grade | — |
| S12 | Comunidade | /community/templates | biblioteca de templates | grade, filtros | — |
| S13 | LiveChat | /livechat | conversa 1:1 em tempo real, filtros por canal/estado, salvos | lista + thread + painel do contato | vazio |
| S14 | Inbox (kanban) | /inbox | colunas inteligentes que a IA classifica por assunto/intenção | colunas, cards, "Criar com IA", "Nova coluna" | vazio, coluna "Outros" |
| S15 | Contatos | /contacts | base de leads, filtros, filtros salvos, ações em massa | tabela | vazio |
| S16 | Ranking | /contacts/ranking | leads ordenados por pontos de engajamento | tabela | vazio |
| S17 | Config: Geral, Membros, Log de auditoria, Canais | /settings/account/* | conta, equipe com níveis e convite, auditoria, conexão Instagram/WhatsApp | formulários, tabela | 1 Instagram conectado |
| S18 | Config: Inbox, Ranking, Campos personalizados, Etiquetas, Bloqueios | /settings/account/* | regras de leads; ranking = 0–10 pts por tipo de interação por canal | formulários | — |
| S19 | Config: Atalhos de chat, Iniciadores de conversa | /settings/account/* | respostas rápidas do chat; ice breakers da DM | listas | — |
| S20 | Config: Google, Variáveis | /settings/account/* | integração Google Sheets; variáveis globais | — | — |
| S21 | Config: Assinatura, Minha conta, Perfil | /settings/* | plano/consumo; perfil do usuário | — | Free 0/500 |

## Flows

```
F01 Comentou → recebe link na DM (core)
    S04 → S05 → S06 → S07 (palavra-chave, post, resposta pública) → S08/S09 (Mensagem com botão de link) → Testar e publicar
    happy path: ~10 cliques
    edge: comentário duplicado do mesmo usuário, palavra não bate, post apagado, usuário bloqueado, janela de 24h expirada

F02 Coletar WhatsApp
    gatilho → Mensagem → Pergunta (salva em campo "whatsapp") → Condicional (válido?) → Etiqueta → (opcional) Google Sheets / HTTP

F03 Convidar para grupo de WhatsApp / Compartilhar produto
    gatilho → Mensagem com botão de URL

F04 Atender no Inbox / LiveChat
    S14 coluna da IA → S13 conversa → resposta com atalho → etiqueta

F05 Ranking de leads
    S18 pontos por interação → S16 ordenado → S15 filtro → ação em massa

F06 Criar automação com IA
    S03 ou painel IA → descreve → IA monta o fluxo no canvas → revisar → publicar
```

## Components

| component | variants | states | usado em |
| --- | --- | --- | --- |
| Botão | primário, secundário, ghost, ícone | default, hover, disabled, loading | todos |
| KPI card | número + rótulo | vazio, preenchido | S02 |
| Toggle de período | Dia/Semana/Mês, Diário/Semanal/Mensal | selecionado | S02 |
| Stepper de missões | com recompensa e progresso n/m | bloqueado, feito | S02 |
| Card de objetivo | ícone + título + descrição | hover | S02, S05 |
| Nó do canvas | Gatilho, Mensagem, Condição, etc. | selecionado, erro | S06 |
| Painel lateral de wizard | etapas 1..n, Pular, Continuar, Voltar | — | S06, S07 |
| Tabela | busca, filtros, salvos, ordenar | vazio, carregando | S04, S10, S15, S16 |
| Kanban | colunas + cards | vazio | S14 |
| Thread de chat | bolhas, anexos, atalhos | — | S13 |
| Toast | sucesso, erro | — | todos |
| Banner de upsell | — | — | não clonar |

## Inferred data model

```
Account      id, nome, fuso_horario                                  evidence: S17, S02   high
Member       account_id, user_id, nivel, entrou_em                     S17 high
Channel      account_id, tipo(instagram|whatsapp), ig_user_id, username, token, status   S17 high
Contact      account_id, channel, ig_scoped_id, username, nome, whatsapp, email, pontos, etiquetas[], campos(json), bloqueado, ultimo_contato   S15 S16 S18 high
Tag          account_id, nome, cor                                     S18 high
CustomField  account_id, chave, tipo                                   S18 high
Workflow     account_id, pasta_id, nome, status(rascunho|ativo|pausado), grafo(json nós+arestas), versão   S04 S06 high
Trigger      workflow_id, tipo(comment|story_reply|dm|live_comment|story_mention), keyword_mode(any|exact|contains|starts), keywords[], escopo_posts(any|specific|next), media_ids[], public_replies[]   S07 high
Run          workflow_id, contact_id, nó_atual, estado, retomar_em, contexto(json)   (Aguardar/Pergunta exigem) guess
Event        account_id, contact_id, tipo, conteúdo, media_id, sentimento, criado_em   S02 relatório medium
Conversation account_id, contact_id, coluna_inbox_id, status, ultima_msg_em    S13 S14 high
Message      conversation_id, direção, conteúdo(json), enviada_por(auto|humano), criado_em   S13 high
InboxColumn  account_id, nome, critério(texto p/ IA), ordem             S14 high
ReplyList    account_id, nome, respostas[]                              S10 high
ChatShortcut account_id, atalho, texto                                  S19 high
IceBreaker   channel_id, pergunta, payload                             S19 high
Variable     account_id, chave, valor                                  S20 medium
LinkClick    workflow_id, contact_id, url, criado_em                    S02 (cliques em links) high
AuditLog     account_id, user_id, ação, alvo, criado_em                 S17 high
```

## Feature matrix

Ver `features.csv`.

## Out of scope

- Missões/recompensas, convite de amigos, marca d'água e limites de plano: são mecânicas de venda da Gaio, não ajudam o seu social selling.
- Comunidade de templates de outros usuários: é a rede deles. No clone vira uma biblioteca de templates da Lavoura escrita por nós.
- Qualquer coisa que a API oficial da Meta não permita (ex.: DM para quem nunca interagiu).

## Size

Telas 21, fluxos 6, entidades 19. Partes difíceis: motor de execução do fluxo (com Aguardar/Pergunta retomando depois), webhooks e regras da Meta (janela de 24h, resposta privada a comentário, aprovação do app), Inbox com classificação por IA. Tamanho: L (algumas semanas de trabalho focado), com um MVP fatiado em dias.
