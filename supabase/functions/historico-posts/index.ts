// POST /historico-posts
// body: {} (nenhum parâmetro necessário — usa o sócio do token)
// Lista os posts já gerados pelo sócio autenticado, com signed URLs novas
// (as salvas em generated_posts expiram em 7 dias — aqui sempre regeneramos
// a partir do caminho bruto salvo em image_path/final_image_path).
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

const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 dias, igual renderizar-arte/canva-export

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const socioId = await getSocioIdFromRequest(req);
    const service = serviceClient();

    const { data: posts, error } = await service
      .from("generated_posts")
      .select(
        "id, pillar, headline, caption, status, image_path, final_image_path, canva_edit_url, created_at",
      )
      .eq("socio_id", socioId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;

    const withFreshUrls = await Promise.all(
      (posts ?? []).map(async (post) => {
        const [imageUrl, finalImageUrl] = await Promise.all([
          post.image_path
            ? service.storage
                .from("marketing-posts")
                .createSignedUrl(post.image_path, SIGNED_URL_TTL)
                .then((r) => r.data?.signedUrl ?? null)
            : null,
          post.final_image_path
            ? service.storage
                .from("marketing-posts")
                .createSignedUrl(post.final_image_path, SIGNED_URL_TTL)
                .then((r) => r.data?.signedUrl ?? null)
            : null,
        ]);

        return {
          id: post.id,
          pillar: post.pillar,
          headline: post.headline,
          caption: post.caption,
          status: post.status,
          canva_edit_url: post.canva_edit_url,
          created_at: post.created_at,
          image_url: imageUrl,
          final_image_url: finalImageUrl,
        };
      }),
    );

    return json({ posts: withFreshUrls });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "Erro inesperado." }, 500);
  }
});
