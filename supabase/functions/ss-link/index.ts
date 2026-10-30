// Link rastreado dos botões das automações: registra o clique e redireciona.
// GET /ss-link?c=<code>
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const code = new URL(req.url).searchParams.get("c") ?? "";
  if (!/^[a-f0-9]{6,32}$/.test(code)) return new Response("Link inválido", { status: 404 });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: link } = await sb.from("ss_links").select("id, url").eq("code", code).maybeSingle();
  if (!link || !/^https?:\/\//i.test(link.url)) return new Response("Link não encontrado", { status: 404 });
  await sb.from("ss_link_clicks").insert({ link_id: link.id });
  return Response.redirect(link.url, 302);
});
