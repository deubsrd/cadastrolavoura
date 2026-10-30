// Conexão do Instagram profissional da Lavoura (Instagram API com Instagram Login).
//
// POST { action: "start" }        (JWT admin)  -> { url } para abrir o login do Instagram
// GET  ?code=...&state=...        (callback)   -> troca o code por token longo, salva o canal,
//                                                 assina os webhooks e volta pro painel
// POST { action: "disconnect", channel_id }  (JWT admin)
// POST { action: "refresh" }      (header x-ss-secret, chamado pelo cron) -> renova tokens
//
// Autocontida, sem ../_shared, no mesmo padrão das outras functions do repo.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GRAPH = `https://graph.instagram.com/${Deno.env.get("IG_GRAPH_VERSION") ?? "v24.0"}`;
const SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
].join(",");
const WEBHOOK_FIELDS = "comments,live_comments,messages,messaging_postbacks";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ss-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const env = (k: string) => {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`Variável ${k} não configurada.`);
  return v;
};
const service = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
const redirectUri = () => `${env("SUPABASE_URL")}/functions/v1/ig-oauth`;

async function hmac(data: string) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(env("SS_SECRET")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

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

async function igJson(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) throw new Error(body.error?.message ?? body.error_message ?? `Instagram ${res.status}`);
  return body;
}

async function handleCallback(url: URL) {
  const appUrl = env("SS_APP_URL").replace(/\/$/, "");
  const back = (q: string) => Response.redirect(`${appUrl}/admin/social/config?${q}`, 302);
  try {
    if (url.searchParams.get("error")) return back("ig=cancelado");
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state") ?? "";
    const [nonce, sig] = state.split(".");
    const [, ts] = (nonce ?? "").split("-");
    if (!code || !nonce || sig !== (await hmac(nonce))) throw new Error("state inválido");
    if (Date.now() - Number(ts) > 15 * 60_000) throw new Error("login expirou, tente de novo");

    // 1) code -> token curto
    const form = new FormData();
    form.set("client_id", env("IG_APP_ID"));
    form.set("client_secret", env("IG_APP_SECRET"));
    form.set("grant_type", "authorization_code");
    form.set("redirect_uri", redirectUri());
    form.set("code", code.replace(/#_$/, ""));
    const short = await igJson(await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body: form }));

    // 2) token curto -> token longo (60 dias)
    const long = await igJson(await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${env("IG_APP_SECRET")}&access_token=${short.access_token}`,
    ));
    const token: string = long.access_token;
    const expiresAt = new Date(Date.now() + (long.expires_in ?? 5_184_000) * 1000).toISOString();

    // 3) quem é
    const me = await igJson(await fetch(`${GRAPH}/me?fields=user_id,username,name,profile_picture_url&access_token=${token}`));

    // 4) salva
    const db = service();
    const { data: ch, error } = await db.from("ss_channels").upsert({
      kind: "instagram",
      external_id: String(me.user_id ?? me.id),
      username: me.username,
      name: me.name,
      avatar_url: me.profile_picture_url,
      token_expires_at: expiresAt,
      status: "connected",
    }, { onConflict: "kind,external_id" }).select("id").single();
    if (error) throw error;
    const { error: e2 } = await db.from("ss_channel_secrets").upsert({
      channel_id: ch.id, access_token: token, updated_at: new Date().toISOString(),
    });
    if (e2) throw e2;

    // 5) assina webhooks desta conta no app
    await igJson(await fetch(`${GRAPH}/me/subscribed_apps?subscribed_fields=${WEBHOOK_FIELDS}&access_token=${token}`, { method: "POST" }));

    return back("ig=ok");
  } catch (e) {
    console.error("ig-oauth callback", e);
    return back(`ig=erro&msg=${encodeURIComponent(e instanceof Error ? e.message : "erro")}`);
  }
}

async function refreshTokens() {
  const db = service();
  const soon = new Date(Date.now() + 15 * 86_400_000).toISOString();
  const { data: chans } = await db.from("ss_channels").select("id").eq("kind", "instagram")
    .eq("status", "connected").lt("token_expires_at", soon);
  let ok = 0;
  for (const c of chans ?? []) {
    const { data: s } = await db.from("ss_channel_secrets").select("access_token").eq("channel_id", c.id).single();
    if (!s) continue;
    try {
      const r = await igJson(await fetch(
        `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${s.access_token}`,
      ));
      await db.from("ss_channel_secrets").update({ access_token: r.access_token, updated_at: new Date().toISOString() }).eq("channel_id", c.id);
      await db.from("ss_channels").update({
        token_expires_at: new Date(Date.now() + (r.expires_in ?? 5_184_000) * 1000).toISOString(),
      }).eq("id", c.id);
      ok++;
    } catch (e) {
      console.error("refresh", c.id, e);
      await db.from("ss_channels").update({ status: "expired" }).eq("id", c.id);
    }
  }
  return ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  if (req.method === "GET") return handleCallback(url);

  try {
    const body = await req.json().catch(() => ({}));
    if (body.action === "refresh") {
      if (req.headers.get("x-ss-secret") !== env("SS_SECRET")) return json({ error: "proibido" }, 403);
      return json({ refreshed: await refreshTokens() });
    }

    await requireAdmin(req);

    if (body.action === "start") {
      const nonce = `${crypto.randomUUID()}-${Date.now()}`;
      const state = `${nonce}.${await hmac(nonce)}`;
      const auth = new URL("https://www.instagram.com/oauth/authorize");
      auth.searchParams.set("enable_fb_login", "0");
      auth.searchParams.set("force_authentication", "1");
      auth.searchParams.set("client_id", env("IG_APP_ID"));
      auth.searchParams.set("redirect_uri", redirectUri());
      auth.searchParams.set("response_type", "code");
      auth.searchParams.set("scope", SCOPES);
      auth.searchParams.set("state", state);
      return json({ url: auth.toString() });
    }

    if (body.action === "disconnect") {
      if (typeof body.channel_id !== "string") return json({ error: "channel_id obrigatório" }, 400);
      const db = service();
      await db.from("ss_channel_secrets").delete().eq("channel_id", body.channel_id);
      await db.from("ss_channels").update({ status: "disconnected" }).eq("id", body.channel_id);
      return json({ ok: true });
    }

    return json({ error: "ação desconhecida" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erro inesperado." }, 400);
  }
});
