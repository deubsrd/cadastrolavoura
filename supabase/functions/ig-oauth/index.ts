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

// Login unificado (Facebook Login for Business) — config_id define as permissões.
const GRAPH_VERSION = "v26.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
const PREFERRED_IG = "lavanderialavourabr";
const WEBHOOK_FIELDS = "messages,messaging_postbacks,feed";

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

    // 1) code -> token curto de usuário
    const q1 = new URLSearchParams({
      client_id: env("IG_APP_ID"), client_secret: env("IG_APP_SECRET"),
      redirect_uri: redirectUri(), code: code.replace(/#_$/, ""),
    });
    const short = await igJson(await fetch(`${GRAPH}/oauth/access_token?${q1}`));

    // 2) token curto -> token longo de usuário
    const q2 = new URLSearchParams({
      grant_type: "fb_exchange_token", client_id: env("IG_APP_ID"),
      client_secret: env("IG_APP_SECRET"), fb_exchange_token: short.access_token,
    });
    const long = await igJson(await fetch(`${GRAPH}/oauth/access_token?${q2}`));

    // 3) Páginas + conta IG profissional vinculada
    const accounts = await igJson(await fetch(
      `${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&limit=100&access_token=${long.access_token}`,
    ));
    const pages: any[] = accounts.data ?? [];
    const withIg = pages.filter((p) => p.instagram_business_account?.id);
    const page = withIg.find((p) => p.instagram_business_account.username === PREFERRED_IG) ?? withIg[0];
    if (!page) throw new Error("Nenhuma Página com Instagram profissional vinculado foi autorizada.");
    const ig = page.instagram_business_account;
    const pageToken: string = page.access_token;

    // 4) salva (page token derivado de token longo não expira)
    const db = service();
    const { data: ch, error } = await db.from("ss_channels").upsert({
      kind: "instagram",
      external_id: String(ig.id),
      username: ig.username,
      name: page.name,
      token_expires_at: null,
      status: "connected",
    }, { onConflict: "kind,external_id" }).select("id").single();
    if (error) throw error;
    const { error: e2 } = await db.from("ss_channel_secrets").upsert({
      channel_id: ch.id, access_token: pageToken, page_id: String(page.id),
      ig_user_id: String(ig.id), ig_username: ig.username, updated_at: new Date().toISOString(),
    });
    if (e2) throw e2;

    // 5) assina webhooks da Página (falha só é registrada, não quebra a conexão)
    try {
      await igJson(await fetch(
        `${GRAPH}/${page.id}/subscribed_apps?subscribed_fields=${WEBHOOK_FIELDS}&access_token=${pageToken}`,
        { method: "POST" },
      ));
    } catch (e) {
      console.error("ig-oauth subscribed_apps falhou (provável falta de pages_manage_metadata):", e instanceof Error ? e.message : e);
    }

    return back("ig=ok");
  } catch (e) {
    console.error("ig-oauth callback", e);
    return back(`ig=erro&msg=${encodeURIComponent(e instanceof Error ? e.message : "erro")}`);
  }
}

// Page token derivado de token longo não expira: só checa via debug_token e registra.
async function refreshTokens() {
  const db = service();
  const appToken = `${env("IG_APP_ID")}|${env("IG_APP_SECRET")}`;
  const { data: chans } = await db.from("ss_channels").select("id").eq("kind", "instagram").eq("status", "connected");
  let ok = 0;
  for (const c of chans ?? []) {
    const { data: s } = await db.from("ss_channel_secrets").select("access_token").eq("channel_id", c.id).maybeSingle();
    if (!s) continue;
    try {
      const r = await igJson(await fetch(
        `${GRAPH}/debug_token?input_token=${encodeURIComponent(s.access_token)}&access_token=${encodeURIComponent(appToken)}`,
      ));
      const d = r.data ?? {};
      console.log("ig-oauth debug_token", c.id, JSON.stringify({
        is_valid: d.is_valid, type: d.type, expires_at: d.expires_at,
        data_access_expires_at: d.data_access_expires_at, scopes: d.scopes,
      }));
      if (d.is_valid) ok++;
    } catch (e) {
      console.error("ig-oauth debug_token erro", c.id, e instanceof Error ? e.message : e);
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
      const auth = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
      auth.searchParams.set("client_id", env("IG_APP_ID"));
      auth.searchParams.set("redirect_uri", redirectUri());
      auth.searchParams.set("config_id", env("FB_LOGIN_CONFIG_ID"));
      auth.searchParams.set("response_type", "code");
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
