# Sistema Lavoura — área do franqueado (/app)

Implementação feita dentro do repositório `cadastrolavoura`. Resumo do que foi
adicionado/alterado e dos passos para colocar no ar.

## 1. Banco de dados (Supabase)

Duas novas migrations em `supabase/migrations/`:

- `20260613120000_add_franqueado_role.sql`
  Adiciona o valor `franqueado` ao enum `app_role` (precisa estar em arquivo
  separado por exigência do Postgres).

- `20260613120100_sistema_franqueado_app.sql`
  - `socios.user_id` (uuid, FK para `auth.users`, único): vincula o sócio
    administrador a um login.
  - Policy: sócio vê o próprio registro (`auth.uid() = user_id`).
  - Função `get_my_unidade_id()`: retorna a unidade do usuário logado.
  - Franqueado pode ler `unidade_documentos` da própria unidade.
  - Novo tipo de documento `planta_obra` (CHECK constraint atualizado).
  - Storage policy: franqueado lê arquivos `unidade-documentos/{unidade_id}/planta_obra/...`.
  - Tabela `obra_checklist_itens` (categoria, item, quantidade sugerida,
    observação, status: pendente/comprado/instalado). Admin tem CRUD total;
    franqueado lê e atualiza status da própria unidade.
  - Tabela `financeiro_mensal` (substitui o `month_records` do lavourafinancas,
    agora por `unidade_id` em vez de `user_id`). Franqueado tem CRUD da própria
    unidade; admin lê o financeiro de todas (para um futuro dashboard
    consolidado).

**Rodar**: `supabase db push` (ou aplicar via dashboard) no projeto
`vmaniutkhisiktjrgswd`.

## 2. Edge Function: convidar-socio

`supabase/functions/convidar-socio/index.ts` (+ entrada em `supabase/config.toml`)

- Chamada pelo admin (valida `has_role(..., 'admin')`).
- Recebe `{ socio_id }`.
- Usa a Admin API do Supabase para convidar o e-mail do sócio
  (`inviteUserByEmail`) — o próprio Supabase envia o e-mail com link de
  definição de senha.
- Vincula `socios.user_id` e garante a role `franqueado`.

**Variável de ambiente a configurar no projeto**: `APP_REDIRECT_URL`
(ex.: `https://SEU-DOMINIO/app`) — para onde o link do e-mail deve apontar
após o sócio definir a senha. Sem ela, a function tenta deduzir a partir da
URL do Supabase, mas o ideal é configurar explicitamente.

**Deploy**: `supabase functions deploy convidar-socio`.

## 3. Frontend — área `/app` (franqueado)

- `src/routes/app.tsx` — layout com sidebar (Minha Unidade, Financeiro,
  Central de Suporte, Obra) + guard que exige role `franqueado`.
- `src/routes/app.index.tsx` — "Minha Unidade": dados da unidade, do sócio
  logado e documentos da unidade (visualização via signed URL).
- `src/routes/app.central.tsx` — Central de Suporte: sistemas operacionais
  (Totem, Macpay, Face ID), treinamentos e contatos de suporte (conteúdo
  portado do `centrallavoura`, agora atrás de login real em vez da senha
  compartilhada `lavoura2026`).
- `src/routes/app.financeiro.tsx` — Dashboard + Planilha DRE, portados do
  `lavourafinancas`, agora consultando `financeiro_mensal` por `unidade_id`.
  Reaproveita `src/lib/dre-structure.ts` (copiado quase verbatim) e
  `src/components/financeiro/MonthSelector.tsx`.
- `src/routes/app.obra.tsx` — checklist de itens da obra (com troca de
  status) + visualização das plantas/pranchas enviadas pela franqueadora.
- `src/hooks/use-franqueado.ts` — hook que carrega sócio + unidade do usuário
  logado.
- `src/hooks/use-financeiro.ts` — hook do DRE, adaptado do `use-store.ts`
  do lavourafinancas para trabalhar por `unidade_id`.

## 4. Frontend — admin

- `src/routes/login.tsx` — agora, após login, verifica a role: e-mail admin
  → `/admin`; role `franqueado` → `/app`; caso contrário, acesso negado.
- `src/routes/admin.index.tsx` — nova coluna "Acesso" na lista de sócios:
  para sócios do tipo "administrador" com unidade vinculada, mostra botão
  "Conceder acesso" (chama a edge function `convidar-socio`); se já tem
  acesso, mostra badge "Acesso liberado" + botão para reenviar o convite.
- `src/routes/admin.obra.tsx` (nova) — por unidade: upload de plantas/pranchas
  (tipo `planta_obra`, mesmo padrão de storage do `UnidadeDocumentos`) e
  CRUD do checklist de itens (categoria, item, quantidade sugerida,
  observação, status).
- `src/routes/admin.tsx` — novo item "Obra" no menu.

## 5. Estilo

- `src/styles.css` — adicionados os tokens `--success` / `--success-foreground`
  (usados pelos KPIs do Financeiro).

## 6. Build

`npm install && npx vite build` rodou sem erros e `routeTree.gen.ts` foi
regenerado automaticamente com as novas rotas `/app`, `/app/`, `/app/central`,
`/app/financeiro`, `/app/obra` e `/admin/obra`. `tsc --noEmit` limpo.
`node_modules/` e `dist/` foram removidos antes de empacotar — rode
`npm install` (ou `bun install`) novamente após extrair.

## Pendências conhecidas / próximos passos

1. **Fluxo de aprovação completo**: hoje o admin precisa (a) editar o sócio
   e vincular a `unidade_id`, depois (b) clicar "Conceder acesso". Pode ser
   simplificado depois com um status "pendente/aprovado" mais explícito.
2. **Permissão de update no checklist**: a policy de UPDATE do franqueado em
   `obra_checklist_itens` permite alterar qualquer coluna do item da própria
   unidade (não só o `status`). Para uma v2 mais restritiva, dá para criar
   uma função `SECURITY DEFINER` que só permite trocar o status.
3. **Dashboard consolidado do admin** para o financeiro: a policy já permite
   o admin ler `financeiro_mensal` de todas as unidades, falta a tela.
4. Checklist "modelo" clonável para novas unidades — hoje cada unidade começa
   vazia e o admin cadastra item a item em `/admin/obra`.
