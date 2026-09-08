// POST /canva-import
// body: { post_id: string }
// Usa o Create URL import job do Canva Connect API (POST /v1/url-imports)
// pra transformar o PNG já hospedado no Storage em um design editável no
// Canva, e devolve o link de edição pro franqueado.
import { corsHeaders, json } from "../_shared/cors.ts";
import { canvaFetch, getSocioIdFromRequest, getValidAccessToken, serviceClient } from "../_shared/canva.ts";

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
