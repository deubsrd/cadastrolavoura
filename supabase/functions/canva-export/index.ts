// POST /canva-export
// body: { post_id: string }
// Chamado quando o franqueado clica em "Aprovar e baixar PNG" depois de
// ajustar o design no Canva. Exporta o design como PNG (Create design
// export job), baixa o resultado e salva no bucket marketing-posts.
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

    const { data: signed, error: signedError } = await service.storage
      .from("marketing-posts")
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    if (signedError || !signed) throw signedError ?? new Error("Falha ao assinar a URL do PNG final.");

    await service
      .from("generated_posts")
      .update({ final_image_url: signed.signedUrl, status: "approved" })
      .eq("id", post_id);

    return json({ post_id, final_image_url: signed.signedUrl });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "Erro inesperado." }, 500);
  }
});
