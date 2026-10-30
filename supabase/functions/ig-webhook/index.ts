// Webhook do Instagram (configurado no app da Meta).
// GET  -> verificação (hub.challenge)
// POST -> valida X-Hub-Signature-256, grava contato/evento/mensagem e entrega
//         o evento ao ss-engine, que casa os gatilhos e executa as automações.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GRAPH = `https://graph.instagram.com/${Deno.env.get("IG_GRAPH_VERSION") ?? "v24.0"}`;
const env = (k: string) => {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`Variável ${k} não configurada.`);
  return v;
};
const db = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

type Kind = "comment" | "dm" | "story_reply" | "story_mention" | "live_comment" | "postback";

async function validSignature(raw: string, header: string | null) {
  if (!header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(env("IG_APP_SECRET")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
  const hex = Array.from(sig).map((b) => b.toString(16).padStart(2, "0")).join("");
  const given = header.slice(7);
  if (given.length !== hex.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

async function upsertContact(
  sb: ReturnType<typeof db>, channel: { id: string }, token: string | null,
  igsid: string, username: string | undefined, kind: Kind, points: Record<string, number>,
) {
  const now = new Date().toISOString();
  const opensWindow = kind !== "comment" && kind !== "live_comment";
  const { data: existing } = await sb.from("ss_contacts").select("id, score, username, blocked")
    .eq("channel_id", channel.id).eq("external_id", igsid).maybeSingle();

  if (existing) {
    const patch: Record<string, unknown> = {
      last_interaction_at: now,
      score: (existing.score ?? 0) + (kind === "postback" ? 0 : points[kind] ?? 0),
    };
    if (opensWindow) patch.last_inbound_at = now;
    if (username && !existing.username) patch.username = username;
    await sb.from("ss_contacts").update(patch).eq("id", existing.id);
    return existing.id as string;
  }

  // Contato novo: tenta buscar o perfil (só funciona depois que a pessoa interagiu)
  let profile: Record<string, unknown> = {};
  if (token) {
    try {
      const r = await fetch(`${GRAPH}/${igsid}?fields=name,username,profile_pic,is_user_follow_business&access_token=${token}`);
      if (r.ok) profile = await r.json();
    } catch { /* perfil é opcional */ }
  }
  const { data, error } = await sb.from("ss_contacts").upsert({
    channel_id: channel.id,
    external_id: igsid,
    username: (profile.username as string) ?? username ?? null,
    name: (profile.name as string) ?? null,
    avatar_url: (profile.profile_pic as string) ?? null,
    follows_business: (profile.is_user_follow_business as boolean) ?? null,
    score: points[kind] ?? 0,
    last_interaction_at: now,
    last_inbound_at: opensWindow ? now : null,
  }, { onConflict: "channel_id,external_id" }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

async function storeInboundMessage(
  sb: ReturnType<typeof db>, channelId: string, contactId: string, mid: string,
  content: Record<string, unknown>, preview: string, direction: "in" | "out" = "in",
) {
  const now = new Date().toISOString();
  const { data: conv } = await sb.from("ss_conversations").upsert(
    { channel_id: channelId, contact_id: contactId },
    { onConflict: "channel_id,contact_id", ignoreDuplicates: false },
  ).select("id, unread").single();
  if (!conv) return;
  const { error } = await sb.from("ss_messages").insert({
    conversation_id: conv.id, direction, sent_by: direction === "in" ? "contact" : "human",
    external_id: mid, content,
  });
  if (error) return; // duplicado (eco de mensagem que nós mesmos mandamos) — ignora
  await sb.from("ss_conversations").update({
    last_message_at: now,
    last_message_preview: preview.slice(0, 140),
    unread: direction === "in" ? (conv.unread ?? 0) + 1 : 0,
    status: "open",
  }).eq("id", conv.id);
}

async function process(body: any) {
  const sb = db();
  const { data: settings } = await sb.from("ss_settings").select("score_points").single();
  const points = (settings?.score_points ?? {}) as Record<string, number>;
  const eventIds: string[] = [];

  for (const entry of body.entry ?? []) {
    const { data: channel } = await sb.from("ss_channels").select("id, external_id")
      .eq("kind", "instagram").eq("external_id", String(entry.id)).eq("status", "connected").maybeSingle();
    if (!channel) continue;
    const { data: secret } = await sb.from("ss_channel_secrets").select("access_token").eq("channel_id", channel.id).maybeSingle();
    const token = secret?.access_token ?? null;

    const record = async (kind: Kind, externalId: string, igsid: string, username: string | undefined,
      text: string | null, mediaId: string | null, payload: unknown) => {
      const contactId = await upsertContact(sb, channel, token, igsid, username, kind, points);
      const { data: ev } = await sb.from("ss_events").insert({
        channel_id: channel.id, contact_id: contactId, kind, external_id: externalId,
        media_id: mediaId, text, payload,
      }).select("id").maybeSingle();
      if (ev) eventIds.push(ev.id);
      return contactId;
    };

    // Comentários (feed, reels, live)
    for (const ch of entry.changes ?? []) {
      if (ch.field !== "comments" && ch.field !== "live_comments") continue;
      const v = ch.value ?? {};
      if (!v.from?.id || String(v.from.id) === channel.external_id) continue; // próprio perfil
      await record(ch.field === "comments" ? "comment" : "live_comment", String(v.id), String(v.from.id),
        v.from.username, v.text ?? "", v.media?.id ?? null, v);
    }

    // Mensagens diretas
    for (const m of entry.messaging ?? []) {
      const sender = String(m.sender?.id ?? "");
      if (m.message?.is_echo) {
        // Mensagem enviada pelo app do Instagram (por você, manualmente): entra no histórico
        const recipient = String(m.recipient?.id ?? "");
        const { data: c } = await sb.from("ss_contacts").select("id").eq("channel_id", channel.id).eq("external_id", recipient).maybeSingle();
        if (c && m.message.mid) await storeInboundMessage(sb, channel.id, c.id, m.message.mid, { text: m.message.text ?? "" }, m.message.text ?? "[mídia]", "out");
        continue;
      }
      if (!sender || sender === channel.external_id) continue;

      if (m.postback) {
        const cid = await record("postback", m.postback.mid ?? `${sender}-${m.timestamp}`, sender, undefined,
          m.postback.title ?? null, null, { payload: m.postback.payload });
        await storeInboundMessage(sb, channel.id, cid, m.postback.mid ?? `pb-${sender}-${m.timestamp}`, { text: m.postback.title ?? "" }, m.postback.title ?? "");
        continue;
      }

      const msg = m.message;
      if (!msg?.mid) continue;
      const attachments = msg.attachments ?? [];
      const mention = attachments.find((a: any) => a.type === "story_mention");
      const kind: Kind = mention ? "story_mention" : msg.reply_to?.story ? "story_reply" : "dm";
      const text = msg.text ?? null;
      const cid = await record(kind, msg.mid, sender, undefined, text, msg.reply_to?.story?.id ?? null, {
        quick_reply: msg.quick_reply?.payload ?? null,
        story_url: mention?.payload?.url ?? msg.reply_to?.story?.url ?? null,
        attachments,
      });
      const content = text
        ? { text }
        : attachments[0] ? { attachment: { type: attachments[0].type, url: attachments[0].payload?.url } } : { text: "" };
      const preview = kind === "story_mention" ? "Mencionou você no story" : text ?? "[mídia]";
      await storeInboundMessage(sb, channel.id, cid, msg.mid, content, preview);
    }
  }

  if (eventIds.length) {
    await fetch(`${env("SUPABASE_URL")}/functions/v1/ss-engine`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-ss-secret": env("SS_SECRET") },
      body: JSON.stringify({ action: "events", event_ids: eventIds }),
    }).catch((e) => console.error("engine", e));
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (req.method === "GET") {
    if (url.searchParams.get("hub.mode") === "subscribe" &&
        url.searchParams.get("hub.verify_token") === Deno.env.get("SS_WEBHOOK_VERIFY_TOKEN")) {
      return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
    }
    return new Response("forbidden", { status: 403 });
  }
  if (req.method !== "POST") return new Response("method", { status: 405 });

  const raw = await req.text();
  if (!(await validSignature(raw, req.headers.get("x-hub-signature-256")))) {
    return new Response("assinatura inválida", { status: 401 });
  }
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return new Response("json", { status: 400 }); }

  // Responde rápido para a Meta e processa em segundo plano
  // @ts-ignore EdgeRuntime existe no runtime do Supabase
  EdgeRuntime.waitUntil(process(body).catch((e) => console.error("webhook", e)));
  return new Response("ok", { status: 200 });
});
