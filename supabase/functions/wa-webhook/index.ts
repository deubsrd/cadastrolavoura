// Webhook do WhatsApp Cloud API (produto WhatsApp do app "Lavoura Social Selling").
// GET  -> verificação (hub.challenge) com WA_WEBHOOK_VERIFY_TOKEN
// POST -> valida X-Hub-Signature-256, grava o lead e a mensagem (ou o status de
//         entrega) e pede ao sdr-engine para o agente de IA responder.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const env = (k: string) => {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`Variável ${k} não configurada.`);
  return v;
};
const db = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

// A assinatura do webhook usa a chave secreta do app da Meta. Como o WhatsApp
// está no mesmo app do social selling, cai no IG_APP_SECRET se não houver uma própria.
const appSecret = () => Deno.env.get("WA_APP_SECRET") ?? env("IG_APP_SECRET");

async function validSignature(raw: string, header: string | null) {
  if (!header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(appSecret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
  const hex = Array.from(sig).map((b) => b.toString(16).padStart(2, "0")).join("");
  const given = header.slice(7);
  if (given.length !== hex.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

const MEDIA_LABEL: Record<string, string> = {
  image: "[imagem]", audio: "[áudio]", video: "[vídeo]", document: "[documento]",
  sticker: "[figurinha]", location: "[localização]", contacts: "[contato]", reaction: "[reação]",
};

// deno-lint-ignore no-explicit-any
function readMessage(m: any): { type: string; body: string } {
  switch (m.type) {
    case "text": return { type: "text", body: m.text?.body ?? "" };
    case "button": return { type: "button", body: m.button?.text ?? "" };
    case "interactive":
      return {
        type: "interactive",
        body: m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? "",
      };
    case "reaction": return { type: "reaction", body: `[reação ${m.reaction?.emoji ?? ""}]` };
    default: {
      const caption = m[m.type]?.caption as string | undefined;
      const label = MEDIA_LABEL[m.type] ?? `[${m.type}]`;
      return { type: m.type, body: caption ? `${label} ${caption}` : label };
    }
  }
}

// deno-lint-ignore no-explicit-any
async function handleMessage(sb: ReturnType<typeof db>, m: any, profileName: string | undefined) {
  const waId = String(m.from);
  const now = new Date().toISOString();
  const { type, body } = readMessage(m);
  const referral = m.referral ?? null; // presente quando a conversa começa por anúncio Click-to-WhatsApp

  const { data: existing } = await sb.from("sdr_leads")
    .select("id, unread, nome_perfil, anuncio").eq("wa_id", waId).maybeSingle();

  let leadId: string;
  if (existing) {
    leadId = existing.id;
    const patch: Record<string, unknown> = {
      last_inbound_at: now,
      last_message_at: now,
      last_message_preview: body.slice(0, 140),
      unread: (existing.unread ?? 0) + 1,
    };
    if (profileName && !existing.nome_perfil) patch.nome_perfil = profileName;
    if (referral && !existing.anuncio) patch.anuncio = referral;
    await sb.from("sdr_leads").update(patch).eq("id", leadId);
  } else {
    const { data, error } = await sb.from("sdr_leads").upsert({
      wa_id: waId,
      nome_perfil: profileName ?? null,
      origem: referral ? "anuncio" : "whatsapp",
      anuncio: referral,
      last_inbound_at: now,
      last_message_at: now,
      last_message_preview: body.slice(0, 140),
      unread: 1,
    }, { onConflict: "wa_id" }).select("id").single();
    if (error) throw error;
    leadId = data.id;
  }

  const { data: msg, error } = await sb.from("sdr_messages").insert({
    lead_id: leadId, direction: "in", sent_by: "lead", type, body,
    payload: m, wa_message_id: m.id,
  }).select("id").single();
  if (error) return null; // reenvio da Meta (wa_message_id duplicado): já processado
  return { leadId, messageId: msg.id as string };
}

// deno-lint-ignore no-explicit-any
async function handleStatus(sb: ReturnType<typeof db>, s: any) {
  const order = ["sent", "delivered", "read"];
  const { data: msg } = await sb.from("sdr_messages").select("id, status").eq("wa_message_id", s.id).maybeSingle();
  if (!msg) return;
  if (s.status === "failed") {
    const e = s.errors?.[0];
    await sb.from("sdr_messages").update({
      status: "failed",
      error: e ? `${e.title ?? e.message ?? "erro"}${e.code ? ` (código ${e.code})` : ""}` : "falhou",
    }).eq("id", msg.id);
    return;
  }
  // não volta status (a Meta pode entregar fora de ordem)
  if (order.indexOf(s.status) > order.indexOf(msg.status ?? "")) {
    await sb.from("sdr_messages").update({ status: s.status }).eq("id", msg.id);
  }
}

async function wakeAgent(leadId: string, messageId: string) {
  try {
    await fetch(`${env("SUPABASE_URL")}/functions/v1/sdr-engine`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-ss-secret": env("SS_SECRET") },
      body: JSON.stringify({ action: "run_agent", lead_id: leadId, message_id: messageId }),
    });
  } catch (e) {
    console.error("sdr-engine não respondeu", e);
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const ok = url.searchParams.get("hub.mode") === "subscribe" &&
      url.searchParams.get("hub.verify_token") === Deno.env.get("WA_WEBHOOK_VERIFY_TOKEN");
    return ok
      ? new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 })
      : new Response("forbidden", { status: 403 });
  }
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const raw = await req.text();
  if (!(await validSignature(raw, req.headers.get("x-hub-signature-256")))) {
    return new Response("assinatura inválida", { status: 401 });
  }

  // deno-lint-ignore no-explicit-any
  let body: any;
  try { body = JSON.parse(raw); } catch { return new Response("ok"); }
  if (body.object !== "whatsapp_business_account") return new Response("ok");

  const sb = db();
  const phoneId = Deno.env.get("WA_PHONE_NUMBER_ID");
  const wake: Promise<void>[] = [];

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      const v = change.value ?? {};
      if (phoneId && v.metadata?.phone_number_id && v.metadata.phone_number_id !== phoneId) continue;

      for (const s of v.statuses ?? []) {
        try { await handleStatus(sb, s); } catch (e) { console.error("status", e); }
      }
      for (const m of v.messages ?? []) {
        try {
          // deno-lint-ignore no-explicit-any
          const contact = (v.contacts ?? []).find((c: any) => c.wa_id === m.from);
          const r = await handleMessage(sb, m, contact?.profile?.name);
          if (r) wake.push(wakeAgent(r.leadId, r.messageId));
        } catch (e) {
          console.error("mensagem", e);
        }
      }
    }
  }

  await Promise.all(wake); // o sdr-engine responde na hora e trabalha em segundo plano
  return new Response("ok");
});
