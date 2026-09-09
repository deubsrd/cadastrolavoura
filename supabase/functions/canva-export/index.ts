// POST /canva-export
// body: { post_id: string }
// Chamado quando o franqueado clica em "Aprovar e baixar PNG" depois de
// ajustar o design no Canva. Exporta o design como PNG (Create design
// export job), baixa o resultado e salva no bucket marketing-posts.
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

  let post_id: string | undefined;
  try {
    const socioId = await getSocioIdFromRequest(req);
    ({ post_id } = await req.json());
    if (!post_id) return json({ error: "post_id é obrigatório" }, 400);

    const service = serviceClient();

    const { data: post, error: postError } = await service
      .from("generated_posts")
      .select("id, canva_design_id, socio_id")
      .eq("id", post_id)
      .single();
    if (postError || !post) return json({ error: "post não encontrado" }, 404);
    if (post.socio_id !== socioId) return json({ error: "post não encontrado" }, 404);
    if (!post.canva_design_id) return json({ error: "post ainda não foi importado pro Canva" }, 400);

    await service.from("generated_posts").update({ status: "exporting" }).eq("id", post_id);

    const accessToken = await getValidAccessToken(socioId);

    const createRes = await canvaFetch("/exports", accessToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        design_id: post.canva_design_id,
        format: { type: "png", lossless: true },
      }),
    });
    if (!createRes.ok) {
      throw new Error(`Falha ao criar export job: ${createRes.status} ${await createRes.text()}`);
    }
    let job = (await createRes.json()).job;

    for (let i = 0; i < MAX_POLLS && job.status === "in_progress"; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const pollRes = await canvaFetch(`/exports/${job.id}`, accessToken);
      if (!pollRes.ok) break;
      job = (await pollRes.json()).job;
    }

    if (job.status !== "success" || !job.urls?.length) {
      return json({ post_id, job_id: job.id, status: job.status }, 202);
    }

    const downloadRes = await fetch(job.urls[0]);
    const pngBuffer = new Uint8Array(await downloadRes.arrayBuffer());

    const path = `${socioId}/${post_id}-final.png`;
    const { error: uploadError } = await service.storage
      .from("marketing-posts")
      .upload(path, pngBuffer, { contentType: "image/png", upsert: true });
    if (uploadError) throw uploadError;

    const { data: signedUrlData, error: signedUrlError } = await service.storage
      .from("marketing-posts")
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    if (signedUrlError) throw signedUrlError;

    await service
      .from("generated_posts")
      .update({ final_image_url: signedUrlData.signedUrl, final_image_path: path, status: "approved" })
      .eq("id", post_id);

    return json({ post_id, final_image_url: signedUrlData.signedUrl });
  } catch (err) {
    console.error(err);
    if (post_id) {
      try {
        await serviceClient().from("generated_posts").update({ status: "error" }).eq("id", post_id);
      } catch (updateErr) {
        console.error("Falha ao marcar post como error:", updateErr);
      }
    }
    return json({ error: err instanceof Error ? err.message : "Erro inesperado." }, 500);
  }
});
