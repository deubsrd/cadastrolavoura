// POST /renderizar-arte
// body: { post_id: string }
// Monta o template do pilar (Satori -> SVG), converte pra PNG (resvg) e
// sobe pro bucket marketing-posts. Templates simples e legíveis — ajuste
// livremente o layout depois de ver o primeiro resultado real.
//
// Sem imports de ../_shared — cada function é autocontida.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import satori from "npm:satori@0.10.13";
import { render as renderSvgToPng } from "https://deno.land/x/resvg_wasm/mod.ts";

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

const WIDTH = 1080;
const HEIGHT = 1350;

const BRAND = { green: "#394f3e", orange: "#e17c4c", cream: "#fdfdfd" };

const PILLAR_LABEL: Record<string, string> = {
  conhecer: "CONHECER",
  gostar: "GOSTAR",
  confiar: "CONFIAR",
  comprar: "COMPRAR",
};

async function loadFont(url: string) {
  const res = await fetch(url);
  return await res.arrayBuffer();
}

function buildTemplate(opts: { pillar: string; headline: string; photoDataUrl: string | null }) {
  const badgeColor = opts.pillar === "comprar" ? BRAND.orange : BRAND.green;

  return {
    type: "div",
    props: {
      style: {
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        flexDirection: "column",
        backgroundColor: BRAND.cream,
        fontFamily: "DM Sans",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flex: 1,
              backgroundImage: opts.photoDataUrl ? `url(${opts.photoDataUrl})` : undefined,
              backgroundColor: opts.photoDataUrl ? undefined : BRAND.green,
              backgroundSize: "cover",
              backgroundPosition: "center",
            },
          },
        },
        {
          type: "div",
          props: {
            style: { display: "flex", alignItems: "flex-start", padding: "20px 60px" },
            children: {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  backgroundColor: badgeColor,
                  color: BRAND.cream,
                  padding: "10px 24px",
                  borderRadius: 999,
                  fontSize: 28,
                  fontWeight: 700,
                  letterSpacing: 2,
                },
                children: PILLAR_LABEL[opts.pillar] ?? opts.pillar.toUpperCase(),
              },
            },
          },
        },
        {
          type: "div",
          props: {
            style: { display: "flex", padding: "0 60px 70px 60px", backgroundColor: BRAND.cream },
            children: {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  color: BRAND.green,
                  fontSize: 58,
                  fontWeight: 700,
                  fontFamily: "Playfair Display",
                  lineHeight: 1.15,
                },
                children: opts.headline,
              },
            },
          },
        },
      ],
    },
  };
}

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
      .select("id, pillar, headline, socio_id, post_briefings(photo_url)")
      .eq("id", post_id)
      .single();
    if (postError || !post) return json({ error: "post não encontrado" }, 404);
    if (post.socio_id !== socioId) return json({ error: "post não encontrado" }, 404);

    await service.from("generated_posts").update({ status: "rendering" }).eq("id", post_id);

    let photoDataUrl: string | null = null;
    const photoUrl = (post as { post_briefings?: { photo_url?: string } }).post_briefings?.photo_url;
    if (photoUrl) {
      const photoRes = await fetch(photoUrl);
      const photoBuf = await photoRes.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(photoBuf)));
      const contentType = photoRes.headers.get("content-type") ?? "image/jpeg";
      photoDataUrl = `data:${contentType};base64,${base64}`;
    }

    const [dmSans, playfair] = await Promise.all([
      loadFont(
        "https://raw.githubusercontent.com/google/fonts/main/ofl/dmsans/DMSans%5Bopsz%2Cwght%5D.ttf",
      ),
      loadFont(
        "https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf",
      ),
    ]);

    const svg = await satori(
      buildTemplate({ pillar: post.pillar ?? "conhecer", headline: post.headline ?? "", photoDataUrl }),
      {
        width: WIDTH,
        height: HEIGHT,
        fonts: [
          { name: "DM Sans", data: dmSans, weight: 400, style: "normal" },
          { name: "Playfair Display", data: playfair, weight: 700, style: "normal" },
        ],
      },
    );

    const pngBuffer = await renderSvgToPng(svg);

    const path = `${socioId}/${post_id}.png`;
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
      .update({ image_url: signedUrlData.signedUrl, status: "draft" })
      .eq("id", post_id);

    return json({ post_id, image_url: signedUrlData.signedUrl });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "Erro inesperado." }, 500);
  }
});
