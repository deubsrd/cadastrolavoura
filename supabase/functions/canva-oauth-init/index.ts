// POST /canva-oauth-init
// Chamado pelo frontend (via supabase.functions.invoke, autenticado) quando
// o franqueado clica em "Conectar Canva". Gera o par PKCE, guarda o
// code_verifier atrelado a um `state` de uso único, e devolve a URL de
// autorização do Canva pro frontend redirecionar o navegador.
import { corsHeaders, json } from "../_shared/cors.ts";
import { getSocioIdFromRequest, serviceClient } from "../_shared/canva.ts";

const CANVA_AUTHORIZE_URL = "https://www.canva.com/api/oauth/authorize";
const SCOPES = [
  "design:content:read",
  "design:content:write",
  "design:meta:read",
  "asset:read",
  "asset:write",
].join(" ");

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function randomString(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

async function codeChallengeFor(codeVerifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
  return base64url(new Uint8Array(digest));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const socioId = await getSocioIdFromRequest(req);

    const codeVerifier = randomString(64);
    const codeChallenge = await codeChallengeFor(codeVerifier);
    const state = randomString(24);

    const service = serviceClient();
    const { error: insertError } = await service.from("canva_oauth_state").insert({
      state,
      socio_id: socioId,
      code_verifier: codeVerifier,
    });
    if (insertError) throw insertError;

    const authorizeUrl = new URL(CANVA_AUTHORIZE_URL);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", Deno.env.get("CANVA_CLIENT_ID")!);
    authorizeUrl.searchParams.set("redirect_uri", Deno.env.get("CANVA_REDIRECT_URI")!);
    authorizeUrl.searchParams.set("scope", SCOPES);
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("code_challenge", codeChallenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");

    return json({ authorize_url: authorizeUrl.toString() });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "Erro inesperado." }, 500);
  }
});
