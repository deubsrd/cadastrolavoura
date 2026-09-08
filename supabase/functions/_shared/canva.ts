// Helpers para falar com o Canva Connect API e resolver o sócio autenticado.
// CANVA_CLIENT_ID e CANVA_CLIENT_SECRET vêm de `supabase secrets set` —
// nunca hardcode esses valores em código.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const CANVA_TOKEN_URL = "https://api.canva.com/rest/v1/oauth/token";
export const CANVA_API_BASE = "https://api.canva.com/rest/v1";

export function basicAuthHeader() {
  const id = Deno.env.get("CANVA_CLIENT_ID")!;
  const secret = Deno.env.get("CANVA_CLIENT_SECRET")!;
  return "Basic " + btoa(`${id}:${secret}`);
}

export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/**
 * Autentica o request pelo Authorization header (JWT do usuário) e retorna
 * o id da linha em `socios` correspondente. Lança erro se não autenticado
 * ou se o usuário não tiver um sócio vinculado.
 */
export async function getSocioIdFromRequest(req: Request): Promise<string> {
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

/**
 * Retorna um access_token válido pro sócio, renovando via refresh_token
 * quando estiver perto de expirar.
 */
export async function getValidAccessToken(socioId: string): Promise<string> {
  const service = serviceClient();

  const { data: conn, error } = await service
    .from("canva_connections")
    .select("access_token, refresh_token, expires_at")
    .eq("socio_id", socioId)
    .single();

  if (error || !conn) {
    throw new Error("Sócio ainda não conectou a conta do Canva.");
  }

  const expiresAt = new Date(conn.expires_at).getTime();
  const stillValid = expiresAt - Date.now() > 60_000; // margem de 60s
  if (stillValid) return conn.access_token;

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
  if (!res.ok) {
    throw new Error(`Falha ao renovar token do Canva: ${res.status} ${await res.text()}`);
  }
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

export async function canvaFetch(path: string, accessToken: string, init: RequestInit = {}) {
  return await fetch(`${CANVA_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers ?? {}),
    },
  });
}
