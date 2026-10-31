// IA do Social Selling (JWT admin):
//   { action: "public_replies", example, n? }        -> { replies: string[] }
//   { action: "build_workflow", description }        -> { name, graph }
//   { action: "suggest_columns" }                     -> { columns: [{name, criteria}] }
//   { action: "analyze_profile" }                     -> { text }
//   { action: "chat", messages: [{role, content}] }   -> { text, graph? }   (Assistente)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GRAPH_API = `https://graph.instagram.com/${Deno.env.get("IG_GRAPH_VERSION") ?? "v24.0"}`;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const env = (k: string) => {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`Variável ${k} não configurada.`);
  return v;
};
const service = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

async function requireAdmin(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) throw new Error("Não autenticado.");
  const user = createClient(env("SUPABASE_URL"), Deno.env.get("SUPABASE_ANON_KEY") ?? env("SUPABASE_PUBLISHABLE_KEY"), {
    global: { headers: { Authorization: auth } },
  });
  const { data, error } = await user.auth.getUser();
  if (error || !data.user) throw new Error("Sessão inválida.");
  const { data: ok } = await service().rpc("has_role", { _user_id: data.user.id, _role: "admin" });
  if (!ok) throw new Error("Acesso restrito à franqueadora.");
}

async function claude(system: string, messages: { role: "user" | "assistant"; content: string }[], maxTokens = 1500) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": env("ANTHROPIC_API_KEY"), "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: Deno.env.get("SS_AI_MODEL") ?? "claude-sonnet-5", max_tokens: maxTokens, system, messages }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return (j.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("").trim();
}
const parseJson = (t: string) => JSON.parse(t.replace(/^[\s\S]*?```(?:json)?/, "").replace(/```[\s\S]*$/, "").trim() || t);
const tryJson = (t: string) => { try { return JSON.parse(t); } catch { try { return parseJson(t); } catch { return null; } } };

const BRAND = `A Lavoura é uma rede de franquias de lavanderia autosserviço (nunca escreva "self service", sempre "autosserviço"),
nascida em Boa Vista (RR). Diferenciais das lojas: café de autosserviço, mesa de coworking, espaço kids, poltronas confortáveis,
cestos grandes; algumas unidades têm delivery. Site: https://www.lavanderialavoura.com.br. O Instagram fala com quem mora perto
de uma unidade e com quem quer ser franqueado.`;

const GRAPH_SCHEMA = `Formato do grafo (JSON):
{ "nodes": [ { "id": "n1", "type": "<tipo>", "position": {"x":0,"y":0}, "data": {...} } ],
  "edges": [ { "id": "e1", "source": "n1", "sourceHandle": "next", "target": "n2" } ] }
Tipos e data:
- trigger (sempre id "trigger", único): { "types": ["comment"|"dm"|"story_reply"|"story_mention"|"live_comment"], "keywordMode": "any"|"exact"|"contains"|"starts",
  "keywords": [], "postScope": "any"|"specific"|"next", "mediaIds": [], "publicReplies": ["..."], "onlyOnce": true }
- message: { "items": [ item... ] } itens:
  {"kind":"text","text":"...","buttons":[{"id":"b1","label":"até 20 letras","type":"url","url":"https://..."} | {"id":"b2","label":"...","type":"next"}]}
  {"kind":"question","text":"...","field":"whatsapp"|"email"|"<campo>","validate":"text"|"email"|"phone"|"number","quickReplies":[]}
  {"kind":"wait","seconds":5}  {"kind":"image"|"video"|"audio"|"file","url":"https://..."}
  {"kind":"cards","cards":[{"title":"...","subtitle":"...","imageUrl":"...","buttons":[...]}]}
  Botão type "next" cria a saída "btn:<id>" do nó (o fluxo espera o clique). Saída padrão: "next".
- tags: {"add":[],"remove":[]}   - wait: {"amount":1,"unit":"minutes"|"hours"|"days"}
- condition: {"match":"all"|"any","rules":[{"field":"follows"|"tag"|"email"|"whatsapp"|"<campo>","op":"eq"|"neq"|"has"|"not_has"|"empty"|"not_empty"|"contains"|"gt"|"lt","value":"..."}]} saídas "yes"/"no"
- split: {"branches":[{"id":"a","weight":50},{"id":"b","weight":50}]} saídas = ids
- ai: {"prompt":"instruções","send":true}
- custom_field: {"field":"...","value":"..."}
Regras do Instagram: em gatilho de comentário só UMA mensagem pode ser enviada antes de a pessoa responder.
Por isso a 1ª mensagem depois de um comentário deve ter um botão type "next" (ex.: "Quero o link") e o resto vai no nó seguinte, ligado por "btn:<id>".
Variáveis no texto: {{primeiro_nome}}, {{nome}}, {{username}}, {{comentario}}, {{campo.x}}, {{var.x}}.
Posicione os nós da esquerda para a direita com x += 340.`;

async function igContext() {
  const sb = service();
  const { data: ch } = await sb.from("ss_channels").select("id, username, name").eq("kind", "instagram").eq("status", "connected").limit(1).maybeSingle();
  if (!ch) return { profile: null, media: [] as any[] };
  const { data: s } = await sb.from("ss_channel_secrets").select("access_token").eq("channel_id", ch.id).single();
  const token = s?.access_token;
  let profile: any = { username: ch.username, name: ch.name };
  let media: any[] = [];
  try {
    const p = await fetch(`${GRAPH_API}/me?fields=username,name,biography,followers_count,media_count&access_token=${token}`);
    if (p.ok) profile = await p.json();
    const m = await fetch(`${GRAPH_API}/me/media?fields=caption,media_type,timestamp,like_count,comments_count&limit=25&access_token=${token}`);
    if (m.ok) media = (await m.json()).data ?? [];
  } catch { /* contexto é opcional */ }
  return { profile, media };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    await requireAdmin(req);
    const body = await req.json();
    const sb = service();
    const { data: settings } = await sb.from("ss_settings").select("ai_tone").single();
    const tone = settings?.ai_tone ?? "";

    switch (body.action) {
      case "public_replies": {
        const n = Math.min(Math.max(Number(body.n) || 5, 1), 10);
        const out = await claude(`${BRAND}\nTom: ${tone}`, [{
          role: "user",
          content: `Escreva ${n} variações curtas (até 120 caracteres) de resposta pública a um comentário no Instagram,
no mesmo tom deste exemplo: "${String(body.example ?? "").slice(0, 300)}". Avisam que mandaram DM. Use no máximo 1 emoji.
Responda SOMENTE um array JSON de strings.`,
        }], 800);
        return json({ replies: (tryJson(out) ?? []).filter((x: unknown) => typeof x === "string").slice(0, n) });
      }

      case "build_workflow": {
        const out = await claude(`${BRAND}\nTom: ${tone}\n${GRAPH_SCHEMA}`, [{
          role: "user",
          content: `Monte uma automação para: ${String(body.description ?? "").slice(0, 2000)}
Responda SOMENTE JSON: {"name":"nome curto","graph":{...}}`,
        }], 4000);
        const parsed = tryJson(out);
        if (!parsed?.graph?.nodes) throw new Error("A IA não devolveu uma automação válida. Tente descrever de outro jeito.");
        return json(parsed);
      }

      case "suggest_columns": {
        const { data: recent } = await sb.from("ss_conversations").select("last_message_preview").not("last_message_preview", "is", null)
          .order("last_message_at", { ascending: false }).limit(60);
        const out = await claude(`${BRAND}`, [{
          role: "user",
          content: `Sugira de 4 a 6 colunas para organizar o inbox do Instagram da Lavoura por assunto, prioridade e intenção
(ex.: quer ser franqueado, dúvida de preço/unidade, delivery, reclamação, elogio). Mensagens recentes: ${JSON.stringify((recent ?? []).map((r) => r.last_message_preview))}
Responda SOMENTE JSON: [{"name":"...","criteria":"quando uma conversa entra aqui"}]`,
        }], 1000);
        return json({ columns: tryJson(out) ?? [] });
      }

      case "analyze_profile": {
        const ctx = await igContext();
        if (!ctx.profile) throw new Error("Conecte o Instagram primeiro.");
        const text = await claude(`${BRAND}\nVocê é estrategista de social selling.`, [{
          role: "user",
          content: `Analise este perfil e os últimos posts. Diga o que está funcionando (pelos comentários/curtidas), 3 oportunidades de automação
(com palavra-chave sugerida e objetivo) e 3 ideias de post com chamada para comentar. Português, direto, em tópicos curtos.
Perfil: ${JSON.stringify(ctx.profile)}\nPosts: ${JSON.stringify(ctx.media)}`,
        }], 2000);
        return json({ text });
      }

      case "chat": {
        const history = (body.messages ?? []).slice(-16).map((m: any) => ({
          role: m.role === "assistant" ? "assistant" : "user", content: String(m.content ?? "").slice(0, 4000),
        }));
        if (!history.length) throw new Error("Mensagem vazia.");
        const [{ data: wfs }, ctx] = await Promise.all([
          sb.from("ss_workflows").select("name, status, trigger_types, runs_count").limit(50),
          igContext(),
        ]);
        const text = await claude(`${BRAND}\nTom: ${tone}
Você é o assistente de social selling dentro do Sistema Lavoura. Ajuda a criar e melhorar automações de Instagram,
recomendar automações, analisar o perfil e organizar o inbox. Responda em português, curto e prático.
Se o usuário pedir para CRIAR uma automação, inclua no fim da resposta um bloco \`\`\`json {"name":"...","graph":{...}} \`\`\` seguindo o formato abaixo.
${GRAPH_SCHEMA}
Automações existentes: ${JSON.stringify(wfs ?? [])}
Perfil: ${JSON.stringify(ctx.profile)}  Últimos posts: ${JSON.stringify(ctx.media.slice(0, 10))}`, history, 4000);
        const m = text.match(/```json\s*([\s\S]*?)```/);
        const wf = m ? tryJson(m[1]) : null;
        return json({ text: text.replace(/```json[\s\S]*?```/, "").trim(), workflow: wf?.graph?.nodes ? wf : null });
      }

      default:
        return json({ error: "ação desconhecida" }, 400);
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erro inesperado." }, 400);
  }
});
