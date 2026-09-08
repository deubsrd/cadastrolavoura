// POST /canva-import
// body: { post_id: string }
// Usa o Create URL import job do Canva Connect API (POST /v1/url-imports)
// pra transformar o PNG já hospedado no Storage em um design editável no
// Canva, e devolve o link de edição pro franqueado.
//
// Sem imports de ../_shared — cada function é autocontida.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function getSocioIdFromRequest(req: Request): Promise<string> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Não autenticado.");

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) throw new Error("Sessão inválida.");

  const service = serviceClient();
  const { data: socio, error: socioError } = await service
    .from("socios")
    .select("id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (socioError || !socio) throw new Error("Usuário sem sócio vinculado.");

  return socio.id as string;
}

const CANVA_TOKEN_URL = "https://api.canva.com/rest/v1/oauth/token";
const CANVA_API_BASE = "https://api.canva.com/rest/v1";

function basicAuthHeader() {
  const id = Deno.env.get("CANVA_CLIENT_ID")!;
  const secret = Deno.env.get("CANVA_CLIENT_SECRET")!;
  return "Basic " + btoa(`${id}:${secret}`);
}

async function getValidAccessToken(socioId: string): Promise<string> {
  const service = serviceClient();

  const { data: conn, error } = await service
    .from("canva_connections")
    .select("access_token, refresh_token, expires_at")
    .eq("socio_id", socioId)
    .single();
  if (error || !conn) throw new Error("Sócio ainda não conectou a conta do Canva.");

  const expiresAt = new Date(conn.expires_at).getTime();
  if (expiresAt - Date.now() > 60_000) return conn.access_token;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: conn.refresh_token,
  });
  const res = await fetch(CANVA_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) throw new Error(`Falha ao renovar token do Canva: ${res.status} ${await res.text()}`);
  const tokenJson = await res.json();
  const newExpiresAt = new Date(Date.now() + tokenJson.expires_in * 1000).toISOString();

  await service
    .from("canva_connections")
    .update({
      access_token: tokenJson.access_token,
      refresh_token: tokenJson.refresh_token ?? conn.refresh_token,
      expires_at: newExpiresAt,
    })
    .eq("socio_id", socioId);

  return tokenJson.access_token;
}

async function canvaFetch(path: string, accessToken: string, init: RequestInit = {}) {
  return await fetch(`${CANVA_API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, ...(init.headers ?? {}) },
  });
}

const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 20; // ~30s

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const socioId = await getSocioIdFromRequest(req);
    const { post_id } = await req.json();
    if (!post_id) return json({ error: "post_id é obrigatório" }, 400);

    const service = serviceClient();

    const { data: post, error: postError } = await service
      .from("generated_posts")
      .select("id, image_url, socio_id, headline")
      .eq("id", post_id)
      .single();
    if (postError || !post) return json({ error: "post não encontrado" }, 404);
    if (post.socio_id !== socioId) return json({ error: "post não encontrado" }, 404);
    if (!post.image_url) return json({ error: "post ainda não tem imagem renderizada" }, 400);

    const accessToken = await getValidAccessToken(socioId);

    const createRes = await canvaFetch("/url-imports", accessToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: (post.headline ?? "Post Lavoura").slice(0, 50),
        url: post.image_url,
        mime_type: "image/png",
      }),
    });
    if (!createRes.ok) {
      throw new Error(`Falha ao criar import job: ${createRes.status} ${await createRes.text()}`);
    }
    const createJson = await createRes.json();
    const jobId = createJson.job.id as string;

    await service
      .from("generated_posts")
      .update({ canva_import_job_id: jobId, status: "imported_to_canva" })
      .eq("id", post_id);

    let job = createJson.job;
    for (let i = 0; i < MAX_POLLS && job.status === "in_progress"; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const pollRes = await canvaFetch(`/url-imports/${jobId}`, accessToken);
      if (!pollRes.ok) break;
      job = (await pollRes.json()).job;
    }

    if (job.status !== "success") {
      return json({ post_id, job_id: jobId, status: job.status }, 202);
    }

    const design = job.result?.design;
    await service
      .from("generated_posts")
      .update({
        canva_design_id: design?.id ?? null,
        canva_edit_url: design?.urls?.edit_url ?? null,
        canva_view_url: design?.urls?.view_url ?? null,
        status: "editing",
      })
      .eq("id", post_id);

    return json({
      post_id,
      design_id: design?.id,
      edit_url: design?.urls?.edit_url,
      view_url: design?.urls?.view_url,
    });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "Erro inesperado." }, 500);
  }
});
