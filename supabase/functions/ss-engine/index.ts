// Motor das automações de Instagram.
//
// Chamado com header x-ss-secret (webhook e cron):
//   { action: "events", event_ids }   casa gatilhos / retoma execuções esperando resposta ou clique
//   { action: "tick" }                retoma Aguardar, classifica sentimento e inbox (cron, 1x/min)
// Chamado com JWT de admin (painel):
//   { action: "send", conversation_id, text?, attachment? }   resposta manual no chat
//   { action: "bulk_send", contact_ids, text }                 envio em massa (só janela de 24h)
//   { action: "test_run", workflow_id, contact_id }            testar automação num contato
//   { action: "media" }                                        lista posts/reels para escolher no gatilho
//   { action: "ice_breakers" }                                 publica os iniciadores de conversa
//
// Autocontida (sem ../_shared), mesmo padrão das outras functions do repo.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const GRAPH = `https://graph.instagram.com/${Deno.env.get("IG_GRAPH_VERSION") ?? "v24.0"}`;
const MAX_STEPS = 60;
const WINDOW_MS = 24 * 3600_000;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ss-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const env = (k: string) => {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`Variável ${k} não configurada.`);
  return v;
};
const errMsg = (e: unknown) =>
  e instanceof Error ? e.message : (e && typeof e === "object" && "message" in e) ? String((e as any).message) : "Erro inesperado.";

// ============================================================ tipos
type Kind = "comment" | "dm" | "story_reply" | "story_mention" | "live_comment" | "postback";
type Btn = { id: string; label: string; type: "url" | "next"; url?: string };
type Item =
  | { kind: "text"; text: string; buttons?: Btn[] }
  | { kind: "question"; text: string; field: string; validate?: "text" | "email" | "phone" | "number"; quickReplies?: string[]; retryText?: string }
  | { kind: "cards"; cards: { title: string; subtitle?: string; imageUrl?: string; buttons?: Btn[] }[] }
  | { kind: "wait"; seconds: number }
  | { kind: "image" | "video" | "audio" | "file"; url: string };
type Node = { id: string; type: string; data: any };
type Edge = { id: string; source: string; sourceHandle?: string | null; target: string };
type Graph = { nodes: Node[]; edges: Edge[] };
type Contact = {
  id: string; channel_id: string; external_id: string; username: string | null; name: string | null;
  email: string | null; whatsapp: string | null; fields: Record<string, unknown>; score: number;
  follows_business: boolean | null; blocked: boolean; automation_paused_until: string | null; last_inbound_at: string | null;
};
type Run = {
  id: string; workflow_id: string; contact_id: string; status: string; current_node: string | null;
  context: Record<string, any>; steps: number;
};
type Ctx = {
  sb: SupabaseClient; token: string; channel: { id: string; external_id: string };
  vars: Record<string, string>; contact: Contact; run: Run; graph: Graph; workflowName: string;
};

// ============================================================ utilidades
const service = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

function render(tpl: string, c: Contact, ctx: Record<string, any>, vars: Record<string, string>) {
  const first = (c.name ?? c.username ?? "").split(" ")[0];
  return (tpl ?? "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => {
    if (key === "nome") return c.name ?? c.username ?? "";
    if (key === "primeiro_nome") return first;
    if (key === "username") return c.username ? `@${c.username}` : "";
    if (key === "email") return c.email ?? "";
    if (key === "whatsapp") return c.whatsapp ?? "";
    if (key === "comentario" || key === "mensagem") return ctx.text ?? "";
    if (key.startsWith("campo.")) return String(c.fields?.[key.slice(6)] ?? "");
    if (key.startsWith("var.")) return vars[key.slice(4)] ?? "";
    return "";
  });
}

function getField(c: Contact, f: string): unknown {
  if (f === "email") return c.email;
  if (f === "whatsapp") return c.whatsapp;
  if (f === "username") return c.username;
  if (f === "nome") return c.name;
  if (f === "score") return c.score;
  return c.fields?.[f];
}

async function setField(sb: SupabaseClient, c: Contact, f: string, value: unknown) {
  if (f === "email" || f === "whatsapp" || f === "nome") {
    const col = f === "nome" ? "name" : f;
    (c as any)[col] = value;
    await sb.from("ss_contacts").update({ [col]: value }).eq("id", c.id);
    return;
  }
  c.fields = { ...(c.fields ?? {}), [f]: value };
  await sb.from("ss_contacts").update({ fields: c.fields }).eq("id", c.id);
}

// Avaliador aritmético seguro (sem eval): + - * / ( ) e números
function calc(expr: string): number {
  const tokens = expr.match(/\d+(?:[.,]\d+)?|[()+\-*/]/g) ?? [];
  let i = 0;
  const num = (): number => {
    const t = tokens[i++];
    if (t === "(") { const v = add(); i++; return v; }
    if (t === "-") return -num();
    const n = Number((t ?? "0").replace(",", "."));
    if (Number.isNaN(n)) throw new Error("expressão inválida");
    return n;
  };
  const mul = (): number => {
    let v = num();
    while (tokens[i] === "*" || tokens[i] === "/") { const op = tokens[i++]; const r = num(); v = op === "*" ? v * r : v / r; }
    return v;
  };
  const add = (): number => {
    let v = mul();
    while (tokens[i] === "+" || tokens[i] === "-") { const op = tokens[i++]; const r = mul(); v = op === "+" ? v + r : v - r; }
    return v;
  };
  return add();
}

function validateAnswer(v: string, kind?: string) {
  const t = v.trim();
  if (kind === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? t.toLowerCase() : null;
  if (kind === "phone") {
    const d = t.replace(/\D/g, "");
    if (d.length < 10 || d.length > 13) return null;
    return d.length <= 11 ? `55${d}` : d;
  }
  if (kind === "number") { const n = Number(t.replace(",", ".")); return Number.isNaN(n) ? null : String(n); }
  return t.length ? t : null;
}

function keywordMatch(text: string, mode: string, keywords: string[]) {
  if (mode === "any" || !keywords?.length) return true;
  const t = norm(text ?? "");
  return keywords.some((k) => {
    const kw = norm(k);
    if (!kw) return false;
    if (mode === "exact") return t === kw;
    if (mode === "starts") return t.startsWith(kw);
    return t.includes(kw);
  });
}

// ============================================================ Instagram
async function ig(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${GRAPH}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) throw new Error(body.error?.message ?? `Instagram ${res.status}`);
  return body;
}

async function trackedUrl(c: Ctx, url: string) {
  const { data } = await c.sb.from("ss_links").insert({
    url, workflow_id: c.run.workflow_id, contact_id: c.contact.id, run_id: c.run.id,
  }).select("code").single();
  return data ? `${env("SUPABASE_URL")}/functions/v1/ss-link?c=${data.code}` : url;
}

async function buildButtons(c: Ctx, nodeId: string, buttons: Btn[]) {
  const out = [];
  for (const b of buttons.slice(0, 3)) {
    if (b.type === "url" && b.url) {
      out.push({ type: "web_url", title: b.label.slice(0, 20), url: await trackedUrl(c, render(b.url, c.contact, c.run.context, c.vars)) });
    } else {
      out.push({ type: "postback", title: b.label.slice(0, 20), payload: `ss|${c.run.id}|${nodeId}|${b.id}` });
    }
  }
  return out;
}

async function conversationId(sb: SupabaseClient, channelId: string, contactId: string) {
  const { data } = await sb.from("ss_conversations").upsert(
    { channel_id: channelId, contact_id: contactId }, { onConflict: "channel_id,contact_id" },
  ).select("id").single();
  return data!.id as string;
}

async function logOut(sb: SupabaseClient, convId: string, content: unknown, sentBy: "automation" | "human",
  externalId: string | null, workflowId: string | null, error: string | null, preview: string) {
  await sb.from("ss_messages").insert({
    conversation_id: convId, direction: "out", sent_by: sentBy, external_id: externalId,
    content, workflow_id: workflowId, error,
  });
  if (!error) {
    await sb.from("ss_conversations").update({
      last_message_at: new Date().toISOString(), last_message_preview: preview.slice(0, 140), unread: 0,
    }).eq("id", convId);
  }
}

// Envia respeitando as regras da Meta: resposta privada a comentário (1 vez) ou janela de 24h.
async function sendDM(c: Ctx, message: Record<string, unknown>, preview: string) {
  const ctx = c.run.context;
  const windowOpen = c.contact.last_inbound_at && Date.now() - Date.parse(c.contact.last_inbound_at) < WINDOW_MS;
  let recipient: Record<string, string>;
  if (windowOpen) recipient = { id: c.contact.external_id };
  else if (ctx.comment_id && !ctx.private_reply_used) recipient = { comment_id: ctx.comment_id };
  else throw new Error("Fora da janela de 24h: a pessoa precisa responder (ou clicar num botão) antes da próxima mensagem.");

  const convId = await conversationId(c.sb, c.channel.id, c.contact.id);
  try {
    const r = await ig("/me/messages", c.token, { method: "POST", body: JSON.stringify({ recipient, message }) });
    if (recipient.comment_id) ctx.private_reply_used = true;
    await logOut(c.sb, convId, message, "automation", r.message_id ?? null, c.run.workflow_id, null, preview);
  } catch (e) {
    await logOut(c.sb, convId, message, "automation", null, c.run.workflow_id, errMsg(e), preview);
    throw e;
  }
}

// ============================================================ Claude
async function claude(system: string, user: string, maxTokens = 600) {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY não configurada.");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("SS_AI_MODEL") ?? "claude-sonnet-5",
      max_tokens: maxTokens, system, messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return (j.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("").trim();
}

// ============================================================ execução
function nextNode(g: Graph, from: string, handle = "next") {
  const e = g.edges.find((x) => x.source === from && (x.sourceHandle ?? "next") === handle)
    ?? (handle !== "next" ? g.edges.find((x) => x.source === from && (x.sourceHandle ?? "next") === "next") : undefined);
  return e?.target ?? null;
}

type Step = { next: string | null } | { stop: "waiting_time"; at: Date } | { stop: "waiting_input" | "waiting_click" };

async function runMessageNode(c: Ctx, node: Node): Promise<Step> {
  const items: Item[] = node.data?.items ?? [];
  const ctx = c.run.context;
  let idx: number = ctx.item_index ?? 0;
  for (; idx < items.length; idx++) {
    const it = items[idx];
    ctx.item_index = idx;
    if (it.kind === "wait") {
      ctx.item_index = idx + 1;
      return { stop: "waiting_time", at: new Date(Date.now() + Math.max(1, it.seconds) * 1000) };
    }
    if (it.kind === "text") {
      const text = render(it.text, c.contact, ctx, c.vars).slice(0, 1000);
      if (it.buttons?.length) {
        await sendDM(c, {
          attachment: { type: "template", payload: { template_type: "button", text: text.slice(0, 640), buttons: await buildButtons(c, node.id, it.buttons) } },
        }, text);
      } else {
        await sendDM(c, { text }, text);
      }
    } else if (it.kind === "question") {
      const text = render(it.text, c.contact, ctx, c.vars);
      const msg: Record<string, unknown> = { text };
      if (it.quickReplies?.length) {
        msg.quick_replies = it.quickReplies.slice(0, 13).map((q) => ({ content_type: "text", title: q.slice(0, 20), payload: q }));
      }
      await sendDM(c, msg, text);
      ctx.awaiting = { node: node.id, item: idx, field: it.field, validate: it.validate ?? "text", retry: it.retryText ?? "", tries: 0 };
      ctx.item_index = idx + 1;
      return { stop: "waiting_input" };
    } else if (it.kind === "cards") {
      const elements = [];
      for (const card of it.cards.slice(0, 10)) {
        elements.push({
          title: render(card.title, c.contact, ctx, c.vars).slice(0, 80),
          subtitle: card.subtitle ? render(card.subtitle, c.contact, ctx, c.vars).slice(0, 80) : undefined,
          image_url: card.imageUrl || undefined,
          buttons: card.buttons?.length ? await buildButtons(c, node.id, card.buttons) : undefined,
        });
      }
      await sendDM(c, { attachment: { type: "template", payload: { template_type: "generic", elements } } }, it.cards[0]?.title ?? "Cartões");
    } else {
      await sendDM(c, { attachment: { type: it.kind, payload: { url: it.url } } }, `[${it.kind}]`);
    }
  }
  ctx.item_index = 0;
  const waitsClick = items.some((it) =>
    (it.kind === "text" && it.buttons?.some((b) => b.type === "next")) ||
    (it.kind === "cards" && it.cards.some((cd) => cd.buttons?.some((b) => b.type === "next"))));
  if (waitsClick) { ctx.awaiting_click = node.id; return { stop: "waiting_click" }; }
  return { next: nextNode(c.graph, node.id) };
}

function evalCondition(c: Ctx, data: any, tagIds: Set<string>) {
  const rules: any[] = data?.rules ?? [];
  if (!rules.length) return true;
  const results = rules.map((r) => {
    if (r.field === "tag") return r.op === "not_has" ? !tagIds.has(r.value) : tagIds.has(r.value);
    if (r.field === "follows") return r.op === "neq" ? c.contact.follows_business !== true : c.contact.follows_business === true;
    const v = getField(c.contact, r.field);
    const s = v == null ? "" : String(v);
    switch (r.op) {
      case "empty": return s === "";
      case "not_empty": return s !== "";
      case "eq": return norm(s) === norm(String(r.value ?? ""));
      case "neq": return norm(s) !== norm(String(r.value ?? ""));
      case "contains": return norm(s).includes(norm(String(r.value ?? "")));
      case "gt": return Number(s) > Number(r.value);
      case "lt": return Number(s) < Number(r.value);
      default: return false;
    }
  });
  return data?.match === "any" ? results.some(Boolean) : results.every(Boolean);
}

async function runNode(c: Ctx, node: Node): Promise<Step> {
  const d = node.data ?? {};
  const ctx = c.run.context;
  switch (node.type) {
    case "trigger":
      return { next: nextNode(c.graph, node.id) };

    case "message":
      return runMessageNode(c, node);

    case "tags": {
      for (const t of d.add ?? []) await c.sb.from("ss_contact_tags").upsert({ contact_id: c.contact.id, tag_id: t });
      if (d.remove?.length) await c.sb.from("ss_contact_tags").delete().eq("contact_id", c.contact.id).in("tag_id", d.remove);
      return { next: nextNode(c.graph, node.id) };
    }

    case "wait": {
      const mult = d.unit === "days" ? 86_400_000 : d.unit === "hours" ? 3_600_000 : 60_000;
      ctx.after_wait = node.id;
      return { stop: "waiting_time", at: new Date(Date.now() + Math.max(1, Number(d.amount) || 1) * mult) };
    }

    case "condition": {
      if ((d.rules ?? []).some((r: any) => r.field === "follows")) {
        try {
          const p = await ig(`/${c.contact.external_id}?fields=is_user_follow_business`, c.token);
          c.contact.follows_business = !!p.is_user_follow_business;
          await c.sb.from("ss_contacts").update({ follows_business: c.contact.follows_business }).eq("id", c.contact.id);
        } catch { /* mantém o último valor conhecido */ }
      }
      const { data: tags } = await c.sb.from("ss_contact_tags").select("tag_id").eq("contact_id", c.contact.id);
      const ok = evalCondition(c, d, new Set((tags ?? []).map((t) => t.tag_id)));
      return { next: nextNode(c.graph, node.id, ok ? "yes" : "no") };
    }

    case "split": {
      const branches: { id: string; weight: number }[] = d.branches ?? [];
      const total = branches.reduce((s, b) => s + (Number(b.weight) || 0), 0) || 1;
      let r = Math.random() * total;
      const chosen = branches.find((b) => (r -= Number(b.weight) || 0) < 0) ?? branches[0];
      ctx.split = { ...(ctx.split ?? {}), [node.id]: chosen?.id };
      return { next: chosen ? nextNode(c.graph, node.id, chosen.id) : nextNode(c.graph, node.id) };
    }

    case "start_workflow": {
      if (d.workflowId) {
        await c.sb.from("ss_runs").insert({
          workflow_id: d.workflowId, contact_id: c.contact.id, status: "queued",
          resume_at: new Date().toISOString(), context: { text: ctx.text, kind: ctx.kind, from_workflow: c.run.workflow_id },
        });
      }
      return { next: nextNode(c.graph, node.id) };
    }

    case "pause_workflows": {
      const until = new Date(Date.now() + (Number(d.minutes) || 60) * 60_000).toISOString();
      c.contact.automation_paused_until = until;
      await c.sb.from("ss_contacts").update({ automation_paused_until: until }).eq("id", c.contact.id);
      return { next: nextNode(c.graph, node.id) };
    }

    case "math": {
      const expr = String(d.expression ?? "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, k) => {
        const key = String(k).replace(/^campo\./, "");
        return String(Number(getField(c.contact, key)) || 0);
      });
      await setField(c.sb, c.contact, d.field, calc(expr));
      return { next: nextNode(c.graph, node.id) };
    }

    case "custom_field": {
      await setField(c.sb, c.contact, d.field, render(String(d.value ?? ""), c.contact, ctx, c.vars));
      return { next: nextNode(c.graph, node.id) };
    }

    case "http": {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        for (const h of d.headers ?? []) if (h.k) headers[h.k] = render(h.v ?? "", c.contact, ctx, c.vars);
        const method = (d.method ?? "POST").toUpperCase();
        const res = await fetch(render(d.url ?? "", c.contact, ctx, c.vars), {
          method, headers, body: method === "GET" ? undefined : render(d.body ?? "", c.contact, ctx, c.vars),
          signal: AbortSignal.timeout(15_000),
        });
        const text = await res.text();
        if (d.saveTo) {
          let val: unknown = text;
          try {
            val = JSON.parse(text);
            for (const p of String(d.savePath ?? "").split(".").filter(Boolean)) val = (val as any)?.[p];
          } catch { /* texto puro */ }
          await setField(c.sb, c.contact, d.saveTo, typeof val === "object" ? JSON.stringify(val) : val);
        }
        return { next: nextNode(c.graph, node.id, res.ok ? "ok" : "error") };
      } catch {
        return { next: nextNode(c.graph, node.id, "error") };
      }
    }

    case "sheets": {
      // Planilha do Google via Web App do Apps Script (o painel mostra o script pronto)
      const row: Record<string, string> = {};
      for (const col of d.columns ?? []) row[col.name] = render(col.value ?? "", c.contact, ctx, c.vars);
      try {
        await fetch(d.webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(row), signal: AbortSignal.timeout(15_000) });
        return { next: nextNode(c.graph, node.id, "ok") };
      } catch {
        return { next: nextNode(c.graph, node.id, "error") };
      }
    }

    case "ai": {
      const { data: settings } = await c.sb.from("ss_settings").select("ai_tone").single();
      const convId = await conversationId(c.sb, c.channel.id, c.contact.id);
      const { data: hist } = await c.sb.from("ss_messages").select("direction, content").eq("conversation_id", convId)
        .order("created_at", { ascending: false }).limit(12);
      const transcript = (hist ?? []).reverse()
        .map((m) => `${m.direction === "in" ? "Cliente" : "Lavoura"}: ${(m.content as any)?.text ?? "[mídia]"}`).join("\n");
      const answer = await claude(
        `Você responde DMs do Instagram da Lavoura (franquia de lavanderia autosserviço). Tom: ${settings?.ai_tone ?? ""}
Responda em português do Brasil, curto (até 3 frases), sem inventar preços, endereços ou promessas que não estejam nas instruções.
Instruções do dono: ${d.prompt ?? ""}`,
        `Conversa até agora:\n${transcript}\n\nÚltima mensagem/comentário: ${ctx.text ?? ""}\n\nEscreva só a resposta.`,
        400,
      );
      if (d.saveTo) await setField(c.sb, c.contact, d.saveTo, answer);
      if (d.send !== false) await sendDM(c, { text: answer.slice(0, 1000) }, answer);
      return { next: nextNode(c.graph, node.id) };
    }

    default:
      return { next: nextNode(c.graph, node.id) };
  }
}

async function loadCtx(sb: SupabaseClient, run: Run): Promise<Ctx | null> {
  const { data: wf } = await sb.from("ss_workflows").select("graph, name, status").eq("id", run.workflow_id).single();
  const { data: contact } = await sb.from("ss_contacts").select("*").eq("id", run.contact_id).single();
  if (!wf || !contact) return null;
  const { data: channel } = await sb.from("ss_channels").select("id, external_id, status").eq("id", contact.channel_id).single();
  const { data: secret } = await sb.from("ss_channel_secrets").select("access_token").eq("channel_id", contact.channel_id).maybeSingle();
  if (!channel || !secret) return null;
  const { data: vars } = await sb.from("ss_variables").select("key, value");
  return {
    sb, token: secret.access_token, channel, contact: contact as Contact, run,
    graph: wf.graph as Graph, workflowName: wf.name,
    vars: Object.fromEntries((vars ?? []).map((v) => [v.key, v.value])),
  };
}

async function execute(sb: SupabaseClient, run: Run, startAt: string | null) {
  const c = await loadCtx(sb, run);
  if (!c) {
    await sb.from("ss_runs").update({ status: "failed", error: "Automação, contato ou canal não encontrado." }).eq("id", run.id);
    return;
  }
  let nodeId = startAt;
  let steps = run.steps ?? 0;
  try {
    while (nodeId) {
      if (++steps > MAX_STEPS) throw new Error("Limite de passos atingido (possível loop).");
      const node = c.graph.nodes.find((n) => n.id === nodeId);
      if (!node) break;
      await sb.from("ss_runs").update({ status: "running", current_node: node.id, context: run.context, steps }).eq("id", run.id);
      const step = await runNode(c, node);
      if ("stop" in step) {
        await sb.from("ss_runs").update({
          status: step.stop, current_node: node.id, steps, context: run.context,
          resume_at: step.stop === "waiting_time" ? step.at.toISOString() : null,
        }).eq("id", run.id);
        return;
      }
      nodeId = step.next;
    }
    await sb.from("ss_runs").update({ status: "done", current_node: null, steps, context: run.context, resume_at: null }).eq("id", run.id);
  } catch (e) {
    await sb.from("ss_runs").update({ status: "failed", error: errMsg(e), steps, context: run.context }).eq("id", run.id);
  }
}

// Retoma uma execução a partir do nó em que parou
async function resume(sb: SupabaseClient, run: Run) {
  const ctx = run.context;
  if (run.status === "waiting_time" || run.status === "queued") {
    if (run.status === "queued" && !run.current_node) {
      // execução criada por "Iniciar automação": começa depois do gatilho
      const { data: wf } = await sb.from("ss_workflows").select("graph").eq("id", run.workflow_id).single();
      const g = wf?.graph as Graph | undefined;
      const trig = g?.nodes.find((n) => n.type === "trigger");
      return execute(sb, run, trig && g ? nextNode(g, trig.id) : null);
    }
    if (ctx.after_wait) {
      const id = ctx.after_wait; delete ctx.after_wait;
      const { data: wf } = await sb.from("ss_workflows").select("graph").eq("id", run.workflow_id).single();
      return execute(sb, run, nextNode(wf!.graph as Graph, id));
    }
    return execute(sb, run, run.current_node); // pausa dentro de um bloco Mensagem
  }
}

async function startWorkflow(sb: SupabaseClient, wf: any, contactId: string, event: any) {
  const g = wf.graph as Graph;
  const trig = g.nodes.find((n) => n.type === "trigger");
  if (!trig) return;
  const { data: run } = await sb.from("ss_runs").insert({
    workflow_id: wf.id, contact_id: contactId, event_id: event?.id ?? null, status: "running",
    context: {
      kind: event?.kind, text: event?.text ?? "", media_id: event?.media_id ?? null,
      comment_id: event && (event.kind === "comment" || event.kind === "live_comment") ? event.external_id : null,
    },
  }).select("*").single();
  if (!run) return;
  await sb.from("ss_workflows").update({ runs_count: (wf.runs_count ?? 0) + 1 }).eq("id", wf.id);
  await execute(sb, run as Run, nextNode(g, trig.id));
}

async function publicReply(sb: SupabaseClient, token: string, trig: any, event: any, contact: Contact) {
  let replies: string[] = (trig.publicReplies ?? []).filter((r: string) => r?.trim());
  if (trig.replyListId) {
    const { data } = await sb.from("ss_reply_lists").select("replies").eq("id", trig.replyListId).maybeSingle();
    if (data?.replies?.length) replies = data.replies;
  }
  if (!replies.length) return;
  const text = render(pick(replies), contact, { text: event.text }, {});
  try {
    await ig(`/${event.external_id}/replies`, token, { method: "POST", body: JSON.stringify({ message: text }) });
  } catch (e) {
    console.error("resposta pública", errMsg(e));
  }
}

async function matchesPost(sb: SupabaseClient, token: string, wf: any, trig: any, mediaId: string | null) {
  const scope = trig.postScope ?? "any";
  if (scope === "any") return true;
  if (!mediaId) return false;
  if (scope === "specific") return (trig.mediaIds ?? []).includes(mediaId);
  if (scope === "next") {
    // "Meu próximo post": o primeiro post publicado depois de ativar trava a automação nele
    try {
      const m = await ig(`/${mediaId}?fields=timestamp`, token);
      if (Date.parse(m.timestamp) < Date.parse(trig.nextAfter ?? wf.published_at ?? 0)) return false;
      const g = wf.graph as Graph;
      const node = g.nodes.find((n) => n.type === "trigger")!;
      node.data = { ...node.data, postScope: "specific", mediaIds: [mediaId] };
      await sb.from("ss_workflows").update({ graph: g }).eq("id", wf.id);
      return true;
    } catch { return false; }
  }
  return false;
}

async function handleEvent(sb: SupabaseClient, eventId: string) {
  const { data: event } = await sb.from("ss_events").select("*").eq("id", eventId).single();
  if (!event?.contact_id) return;
  const { data: contact } = await sb.from("ss_contacts").select("*").eq("id", event.contact_id).single();
  if (!contact || contact.blocked) return;
  const { data: secret } = await sb.from("ss_channel_secrets").select("access_token").eq("channel_id", event.channel_id).maybeSingle();
  if (!secret) return;
  const token = secret.access_token as string;

  const payload: string | null = event.payload?.payload ?? event.payload?.quick_reply ?? null;

  // 1) clique em botão "seguir o fluxo"
  if (payload?.startsWith("ss|")) {
    const [, runId, nodeId, btnId] = payload.split("|");
    const { data: run } = await sb.from("ss_runs").select("*").eq("id", runId).eq("contact_id", contact.id).maybeSingle();
    if (run && run.status === "waiting_click") {
      const { data: wf } = await sb.from("ss_workflows").select("graph").eq("id", run.workflow_id).single();
      delete run.context.awaiting_click;
      run.context.text = event.text ?? "";
      await execute(sb, run as Run, nextNode(wf!.graph as Graph, nodeId, `btn:${btnId}`));
    }
    return;
  }
  // 2) iniciador de conversa
  if (payload?.startsWith("ib|")) {
    const { data: wf } = await sb.from("ss_workflows").select("*").eq("id", payload.slice(3)).eq("status", "active").maybeSingle();
    if (wf) await startWorkflow(sb, wf, contact.id, event);
    return;
  }

  // 3) resposta a uma pergunta pendente
  if (event.kind === "dm" || event.kind === "story_reply") {
    const { data: waiting } = await sb.from("ss_runs").select("*").eq("contact_id", contact.id)
      .eq("status", "waiting_input").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (waiting) {
      const aw = waiting.context.awaiting;
      const value = validateAnswer(event.text ?? "", aw?.validate);
      const c = await loadCtx(sb, waiting as Run);
      if (!c) return;
      if (value == null) {
        aw.tries = (aw.tries ?? 0) + 1;
        if (aw.tries <= 2) {
          const retry = aw.retry || (aw.validate === "email" ? "Hmm, não reconheci esse e-mail. Pode mandar de novo?" :
            aw.validate === "phone" ? "Pode mandar o número com DDD? Ex.: 95 99999-9999" : "Pode responder de novo?");
          await sendDM(c, { text: retry }, retry).catch(() => {});
          await sb.from("ss_runs").update({ context: waiting.context }).eq("id", waiting.id);
          return;
        }
        delete waiting.context.awaiting;
        await sb.from("ss_runs").update({ status: "failed", error: "Resposta inválida 3 vezes.", context: waiting.context }).eq("id", waiting.id);
        return;
      }
      await setField(sb, c.contact, aw.field, value);
      delete waiting.context.awaiting;
      waiting.context.text = event.text;
      await execute(sb, waiting as Run, waiting.current_node); // continua no mesmo bloco, item seguinte
      return;
    }
  }

  // 4) gatilhos
  if (contact.automation_paused_until && Date.parse(contact.automation_paused_until) > Date.now()) return;
  const { data: settings } = await sb.from("ss_settings").select("blocked_words").single();
  const blocked: string[] = settings?.blocked_words ?? [];
  if (event.text && blocked.some((w) => w && norm(event.text).includes(norm(w)))) return;

  const { data: wfs } = await sb.from("ss_workflows").select("*").eq("status", "active").contains("trigger_types", [event.kind]);
  for (const wf of wfs ?? []) {
    const trig = (wf.graph as Graph).nodes.find((n) => n.type === "trigger")?.data ?? {};
    if (!keywordMatch(event.text ?? "", trig.keywordMode ?? "any", trig.keywords ?? [])) continue;
    if ((trig.excludeKeywords ?? []).some((k: string) => k && norm(event.text ?? "").includes(norm(k)))) continue;
    if ((event.kind === "comment" || event.kind === "live_comment") && !(await matchesPost(sb, token, wf, trig, event.media_id))) continue;

    if (trig.onlyOnce !== false) {
      let q = sb.from("ss_runs").select("id", { count: "exact", head: true }).eq("workflow_id", wf.id).eq("contact_id", contact.id);
      if (event.media_id) q = q.eq("context->>media_id", event.media_id);
      const { count } = await q;
      if ((count ?? 0) > 0) continue;
    }

    if (event.kind === "comment" || event.kind === "live_comment") await publicReply(sb, token, trig, event, contact as Contact);
    await startWorkflow(sb, wf, contact.id, event);
  }
}

// ============================================================ tarefas periódicas (cron)
async function tick(sb: SupabaseClient) {
  const now = new Date().toISOString();
  const { data: due } = await sb.from("ss_runs").select("*").in("status", ["waiting_time", "queued"])
    .lte("resume_at", now).order("resume_at").limit(40);
  for (const run of due ?? []) {
    // trava otimista: só um tick pega cada execução
    const { data: locked } = await sb.from("ss_runs").update({ status: "running" }).eq("id", run.id).eq("status", run.status).select("id");
    if (locked?.length) await resume(sb, run as Run);
  }

  // expira execuções esperando resposta/clique há mais de 7 dias
  await sb.from("ss_runs").update({ status: "cancelled", error: "Sem resposta em 7 dias." })
    .in("status", ["waiting_input", "waiting_click"]).lt("updated_at", new Date(Date.now() - 7 * 86_400_000).toISOString());

  if (!Deno.env.get("ANTHROPIC_API_KEY")) return { resumed: due?.length ?? 0 };

  // sentimento das interações (lote)
  const { data: evs } = await sb.from("ss_events").select("id, text").is("sentiment", null).not("text", "is", null)
    .neq("text", "").gte("created_at", new Date(Date.now() - 3 * 86_400_000).toISOString()).limit(40);
  if (evs?.length) {
    try {
      const out = await claude(
        `Classifique o sentimento de cada interação de Instagram com uma marca. Responda SOMENTE JSON: {"<id>":"positivo|neutro|negativo"}`,
        JSON.stringify(Object.fromEntries(evs.map((e) => [e.id, e.text]))), 1500,
      );
      const map = JSON.parse(out.replace(/^```json|```$/g, "").trim());
      for (const [id, s] of Object.entries(map)) {
        if (["positivo", "neutro", "negativo"].includes(String(s))) await sb.from("ss_events").update({ sentiment: s }).eq("id", id);
      }
    } catch (e) { console.error("sentimento", errMsg(e)); }
  }

  // colunas inteligentes do inbox
  const { data: cols } = await sb.from("ss_inbox_columns").select("id, name, criteria").order("position");
  if (cols?.length) {
    const { data: convs } = await sb.from("ss_conversations").select("id, last_message_preview")
      .is("column_id", null).eq("status", "open").not("last_message_preview", "is", null).limit(30);
    if (convs?.length) {
      try {
        const out = await claude(
          `Você organiza o inbox do Instagram da Lavoura. Colunas disponíveis: ${JSON.stringify(cols.map((c) => ({ id: c.id, nome: c.name, criterio: c.criteria })))}.
Para cada conversa, escolha o id da coluna mais adequada, ou null se nenhuma servir. Responda SOMENTE JSON: {"<conversa_id>":"<coluna_id>|null"}`,
          JSON.stringify(Object.fromEntries(convs.map((c) => [c.id, c.last_message_preview]))), 1500,
        );
        const map = JSON.parse(out.replace(/^```json|```$/g, "").trim());
        const valid = new Set(cols.map((c) => c.id));
        for (const [id, col] of Object.entries(map)) {
          if (col && valid.has(String(col))) await sb.from("ss_conversations").update({ column_id: col }).eq("id", id);
        }
      } catch (e) { console.error("inbox", errMsg(e)); }
    }
  }
  return { resumed: due?.length ?? 0 };
}

// ============================================================ ações do painel
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

async function primaryChannel(sb: SupabaseClient) {
  const { data: ch } = await sb.from("ss_channels").select("id, external_id").eq("kind", "instagram").eq("status", "connected")
    .order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (!ch) throw new Error("Conecte o Instagram em Configurações → Canais.");
  const { data: s } = await sb.from("ss_channel_secrets").select("access_token").eq("channel_id", ch.id).single();
  return { channel: ch, token: s!.access_token as string };
}

async function manualSend(sb: SupabaseClient, contactId: string, message: Record<string, unknown>, preview: string) {
  const { data: contact } = await sb.from("ss_contacts").select("*").eq("id", contactId).single();
  if (!contact) throw new Error("Contato não encontrado.");
  if (!contact.last_inbound_at || Date.now() - Date.parse(contact.last_inbound_at) > WINDOW_MS) {
    throw new Error("A última mensagem dessa pessoa tem mais de 24h. O Instagram só libera responder dentro dessa janela.");
  }
  const { data: s } = await sb.from("ss_channel_secrets").select("access_token").eq("channel_id", contact.channel_id).single();
  const convId = await conversationId(sb, contact.channel_id, contact.id);
  try {
    const r = await ig("/me/messages", s!.access_token, {
      method: "POST", body: JSON.stringify({ recipient: { id: contact.external_id }, message }),
    });
    await logOut(sb, convId, message, "human", r.message_id ?? null, null, null, preview);
  } catch (e) {
    await logOut(sb, convId, message, "human", null, null, errMsg(e), preview);
    throw e;
  }
}

async function panel(req: Request, body: any) {
  await requireAdmin(req);
  const sb = service();
  switch (body.action) {
    case "send": {
      const { data: conv } = await sb.from("ss_conversations").select("contact_id").eq("id", body.conversation_id).single();
      if (!conv) throw new Error("Conversa não encontrada.");
      const text = String(body.text ?? "").slice(0, 1000);
      const message = body.attachment?.url
        ? { attachment: { type: body.attachment.type ?? "image", payload: { url: body.attachment.url } } }
        : { text };
      if (!body.attachment?.url && !text.trim()) throw new Error("Mensagem vazia.");
      await manualSend(sb, conv.contact_id, message, text || "[mídia]");
      return { ok: true };
    }
    case "bulk_send": {
      const ids: string[] = (body.contact_ids ?? []).slice(0, 500);
      const text = String(body.text ?? "").slice(0, 1000);
      if (!text.trim()) throw new Error("Mensagem vazia.");
      let sent = 0; const skipped: string[] = [];
      for (const id of ids) {
        try { await manualSend(sb, id, { text }, text); sent++; } catch { skipped.push(id); }
      }
      return { sent, skipped: skipped.length };
    }
    case "test_run": {
      const { data: wf } = await sb.from("ss_workflows").select("*").eq("id", body.workflow_id).single();
      if (!wf) throw new Error("Automação não encontrada.");
      await startWorkflow(sb, wf, body.contact_id, null);
      const { data: run } = await sb.from("ss_runs").select("status, error").eq("workflow_id", wf.id)
        .eq("contact_id", body.contact_id).order("created_at", { ascending: false }).limit(1).single();
      return run;
    }
    case "media": {
      const { token } = await primaryChannel(sb);
      const r = await ig(`/me/media?fields=id,caption,media_type,media_product_type,thumbnail_url,media_url,permalink,timestamp&limit=30`, token);
      return { media: r.data ?? [] };
    }
    case "ice_breakers": {
      const { token } = await primaryChannel(sb);
      const { data: ibs } = await sb.from("ss_ice_breakers").select("question, workflow_id").order("position").limit(4);
      if (!ibs?.length) {
        await ig(`/me/messenger_profile?fields=["ice_breakers"]`, token, { method: "DELETE" }).catch(() => {});
        return { ok: true };
      }
      await ig("/me/messenger_profile", token, {
        method: "POST",
        body: JSON.stringify({
          platform: "instagram",
          ice_breakers: [{ locale: "default", call_to_actions: ibs.map((i) => ({ question: i.question.slice(0, 80), payload: `ib|${i.workflow_id ?? ""}` })) }],
        }),
      });
      return { ok: true };
    }
    default:
      throw new Error("ação desconhecida");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const internal = req.headers.get("x-ss-secret") === Deno.env.get("SS_SECRET") && !!Deno.env.get("SS_SECRET");
    if (internal && body.action === "events") {
      const sb = service();
      for (const id of (body.event_ids ?? []).slice(0, 50)) {
        try { await handleEvent(sb, id); } catch (e) { console.error("evento", id, errMsg(e)); }
      }
      return json({ ok: true });
    }
    if (internal && body.action === "tick") return json(await tick(service()));
    return json(await panel(req, body));
  } catch (e) {
    return json({ error: errMsg(e) }, 400);
  }
});
