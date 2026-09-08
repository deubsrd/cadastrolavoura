// GET /canva-oauth-callback?code=...&state=...
// URL configurada como Redirect URI no app "Lavoura Marketing" do Canva.
// Sem verify_jwt (ver supabase/config.toml) — quem chama é o navegador do
// franqueado sendo redirecionado pelo Canva, não um request autenticado
// do nosso frontend.
import { basicAuthHeader, CANVA_TOKEN_URL, serviceClient } from "../_shared/canva.ts";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const errorParam = url.searchParams.get("error");

    const frontendBase = Deno.env.get("FRONTEND_URL") ?? "https://app.lavoura.com.br";

    if (errorParam) {
      return Response.redirect(
        `${frontendBase}/app/marketing?canva=erro&motivo=${encodeURIComponent(errorParam)}`,
        302,
      );
    }
    if (!code || !state) {
      return new Response("Faltando code ou state", { status: 400 });
    }

    const service = serviceClient();

    const { data: stateRow, error: stateError } = await service
      .from("canva_oauth_state")
      .select("socio_id, code_verifier")
      .eq("state", state)
      .single();
    if (stateError || !stateRow) {
      return new Response("state inválido ou expirado", { status: 400 });
    }
    await service.from("canva_oauth_state").delete().eq("state", state);

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: stateRow.code_verifier,
      redirect_uri: Deno.env.get("CANVA_REDIRECT_URI")!,
    });

    const tokenRes = await fetch(CANVA_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!tokenRes.ok) {
      console.error("Canva token exchange falhou:", await tokenRes.text());
      return Response.redirect(`${frontendBase}/app/marketing?canva=erro&motivo=token_exchange`, 302);
    }

    const tokenJson = await tokenRes.json();
    const expiresAt = new Date(Date.now() + tokenJson.expires_in * 1000).toISOString();

    await service.from("canva_connections").upsert({
      socio_id: stateRow.socio_id,
      access_token: tokenJson.access_token,
      refresh_token: tokenJson.refresh_token,
      expires_at: expiresAt,
      scope: tokenJson.scope ?? null,
    });

    return Response.redirect(`${frontendBase}/app/marketing?canva=conectado`, 302);
  } catch (err) {
    console.error(err);
    return new Response(err instanceof Error ? err.message : "Erro inesperado.", { status: 500 });
  }
});
