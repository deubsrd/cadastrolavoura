// POST /finalizar-arte
// body: { post_id: string, image_path: string }
// A arte agora é renderizada no navegador (AnuncioTemplate + html-to-image)
// e o franqueado já fez o upload do PNG pro Storage antes de chamar isso —
// esta function só confere posse, gera a signed URL (7 dias, mesmo padrão
// de sempre) e grava em generated_posts. Substitui a antiga renderizar-arte
// (Satori + resvg no servidor), que foi removida: Edge Functions não têm
// como rodar um navegador de verdade, e o motor server-side vinha sendo
// fonte de falhas difíceis de depurar (fontes externas lentas, biblioteca
// nativa incompatível com o runtime).
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

async function getIdentityFromRequest(req: Request): Promise<{ socioId: string; userId: string }> {
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

  return { socioId: socio.id as string, userId: userData.user.id };
}

const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 dias

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let post_id: string | undefined;
  try {
    const { socioId, userId } = await getIdentityFromRequest(req);
    let image_path: string;
    ({ post_id, image_path } = await req.json());
    if (!post_id || !image_path) {
      return json({ error: "post_id e image_path são obrigatórios" }, 400);
    }

    const service = serviceClient();

    const { data: post, error: postError } = await service
      .from("generated_posts")
      .select("id, socio_id")
      .eq("id", post_id)
      .single();
    if (postError || !post) return json({ error: "post não encontrado" }, 404);
    if (post.socio_id !== socioId) return json({ error: "post não encontrado" }, 404);

    // Confirma que o caminho realmente está na pasta do próprio usuário
    // (a mesma regra que a policy de Storage já aplica, checada de novo
    // aqui por clareza — não é a única linha de defesa). O prefixo é o
    // auth.uid(), não o socio_id — é o que a policy de storage.objects
    // usada pelo upload de foto já espera.
    if (!image_path.startsWith(`${userId}/`)) {
      return json({ error: "image_path inválido" }, 400);
    }

    const { data: signedUrlData, error: signedUrlError } = await service.storage
      .from("marketing-posts")
      .createSignedUrl(image_path, SIGNED_URL_TTL);
    if (signedUrlError) throw signedUrlError;

    await service
      .from("generated_posts")
      .update({ image_url: signedUrlData.signedUrl, image_path, status: "draft" })
      .eq("id", post_id);

    return json({ post_id, image_url: signedUrlData.signedUrl });
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
