// POST /gerar-legenda
// body: { briefing_text: string, photo_url?: string, pillar?: string, briefing_id?: string, post_id?: string }
// Cria (ou atualiza) o briefing, chama a Claude API com o prompt de marca
// fixo, grava o post gerado e uma nova versão de legenda (permite
// "Refinar legenda" mantendo histórico).
//
// Sem imports de ../_shared — cada function é autocontida (mesmo padrão de
// chat-duvidas/gerar-precontrato/convidar-socio já usado neste repo).
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

const BRAND_SYSTEM_PROMPT = `Você escreve legendas de Instagram para a Lavoura,
uma rede de franquias de lavanderia autosserviço no Brasil. Nunca use o termo
"self service" — use sempre "autosserviço".

Tom de voz: próximo, caloroso, direto, sem jargão corporativo. Fala com quem
mora perto de uma unidade Lavoura e com quem está avaliando ser franqueado.

Existem 4 pilares de conteúdo, e cada post pertence a exatamente um:
- conhecer: apresentar a marca, o modelo de negócio ou uma unidade nova
- gostar: aproximação, bastidores, prova social, comunidade
- confiar: autoridade, resultados, depoimentos, números
- comprar: chamada direta para usar o serviço ou virar franqueado

Devolva SOMENTE um JSON válido, sem markdown, sem comentários, no formato:
{
  "pillar": "conhecer" | "gostar" | "confiar" | "comprar",
  "headline": "frase curta de destaque para a arte, até 8 palavras",
  "caption": "legenda completa para o Instagram, 2 a 4 parágrafos curtos",
  "hashtags": ["#lavoura", "#..."]
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const socioId = await getSocioIdFromRequest(req);
    const { briefing_text, photo_url, pillar, briefing_id, post_id } = await req.json();
    if (!briefing_text) return json({ error: "briefing_text é obrigatório" }, 400);

    const service = serviceClient();

    let currentBriefingId = briefing_id as string | undefined;
    if (!currentBriefingId) {
      const { data: briefing, error: briefingError } = await service
        .from("post_briefings")
        .insert({
          socio_id: socioId,
          briefing_text,
          photo_url: photo_url ?? null,
          pillar: pillar ?? null,
          status: "processing",
        })
        .select("id")
        .single();
      if (briefingError) throw briefingError;
      currentBriefingId = briefing.id;
    }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1024,
        system: BRAND_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: pillar
              ? `Pilar solicitado: ${pillar}\nBriefing do franqueado: ${briefing_text}`
              : `Briefing do franqueado: ${briefing_text}`,
          },
        ],
      }),
    });
    if (!anthropicRes.ok) {
      throw new Error(`Claude API falhou: ${anthropicRes.status} ${await anthropicRes.text()}`);
    }

    const anthropicJson = await anthropicRes.json();
    const rawText = anthropicJson.content
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n")
      .replace(/```json|```/g, "")
      .trim();

    const parsed = JSON.parse(rawText) as {
      pillar: string;
      headline: string;
      caption: string;
      hashtags: string[];
    };

    let currentPostId = post_id as string | undefined;
    if (currentPostId) {
      const { data: existing, error: existingError } = await service
        .from("generated_posts")
        .select("socio_id")
        .eq("id", currentPostId)
        .single();
      if (existingError || !existing || existing.socio_id !== socioId) {
        return json({ error: "post não encontrado" }, 404);
      }
      const { error: updateError } = await service
        .from("generated_posts")
        .update({
          pillar: parsed.pillar,
          headline: parsed.headline,
          caption: parsed.caption,
          hashtags: parsed.hashtags,
        })
        .eq("id", currentPostId);
      if (updateError) throw updateError;
    } else {
      const { data: post, error: postError } = await service
        .from("generated_posts")
        .insert({
          briefing_id: currentBriefingId,
          socio_id: socioId,
          pillar: parsed.pillar,
          headline: parsed.headline,
          caption: parsed.caption,
          hashtags: parsed.hashtags,
          status: "draft",
        })
        .select("id")
        .single();
      if (postError) throw postError;
      currentPostId = post.id;
    }

    const { count } = await service
      .from("post_caption_versions")
      .select("id", { count: "exact", head: true })
      .eq("post_id", currentPostId);

    await service.from("post_caption_versions").insert({
      post_id: currentPostId,
      version: (count ?? 0) + 1,
      caption: parsed.caption,
      hashtags: parsed.hashtags,
      headline: parsed.headline,
    });

    await service
      .from("post_briefings")
      .update({ status: "done", pillar: parsed.pillar })
      .eq("id", currentBriefingId);

    return json({ briefing_id: currentBriefingId, post_id: currentPostId, ...parsed });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "Erro inesperado." }, 500);
  }
});
