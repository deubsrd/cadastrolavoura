// supabase/functions/convidar-socio/index.ts
//
// Cria (ou reenvia) o convite de acesso ao Sistema Lavoura para um sócio
// do tipo "administrador". Só pode ser chamada por um usuário com role 'admin'.
//
// Body esperado: { "socio_id": "uuid" }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado." }, 401);

    // Cliente "do chamador": usado só para validar quem está chamando
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Sessão inválida." }, 401);

    // Cliente com service role: usado para checagens e operações privilegiadas
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: isAdmin, error: roleErr } = await adminClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (roleErr || !isAdmin) return json({ error: "Acesso restrito ao administrador." }, 403);

    const { socio_id } = await req.json();
    if (!socio_id) return json({ error: "socio_id é obrigatório." }, 400);

    const { data: socio, error: socioErr } = await adminClient
      .from("socios")
      .select("id, nome_completo, email, tipo, unidade_id, user_id")
      .eq("id", socio_id)
      .single();

    if (socioErr || !socio) return json({ error: "Sócio não encontrado." }, 404);
    if (!socio.unidade_id) return json({ error: "Sócio sem unidade vinculada." }, 400);
    if (socio.tipo !== "administrador") {
      return json({ error: "Apenas sócios do tipo 'administrador' podem receber acesso." }, 400);
    }

    const redirectTo = Deno.env.get("APP_REDIRECT_URL") ?? `${SUPABASE_URL.replace(".supabase.co", "")}.lovable.app/app`;

    let authUserId = socio.user_id as string | null;

    if (!authUserId) {
      // Tenta convidar (cria o usuário e envia o e-mail de definição de senha)
      const { data: invited, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
        socio.email,
        { redirectTo, data: { nome: socio.nome_completo } }
      );

      if (inviteErr) {
        // Usuário já existe (ex.: já tinha conta de outro contexto) -> apenas vincula
        if (inviteErr.message?.toLowerCase().includes("already registered") || inviteErr.code === "email_exists") {
          const { data: existingUsers, error: listErr } = await adminClient.auth.admin.listUsers();
          if (listErr) return json({ error: `Falha ao localizar usuário existente: ${listErr.message}` }, 500);
          const match = existingUsers.users.find((u) => u.email?.toLowerCase() === socio.email.toLowerCase());
          if (!match) return json({ error: `Falha ao convidar: ${inviteErr.message}` }, 500);
          authUserId = match.id;
        } else {
          return json({ error: `Falha ao convidar: ${inviteErr.message}` }, 500);
        }
      } else {
        authUserId = invited.user.id;
      }
    } else {
      // Já tem conta: reenvia o link de convite/recuperação de senha
      const { error: resendErr } = await adminClient.auth.admin.inviteUserByEmail(socio.email, { redirectTo });
      if (resendErr && !resendErr.message?.toLowerCase().includes("already registered")) {
        return json({ error: `Falha ao reenviar convite: ${resendErr.message}` }, 500);
      }
    }

    // Vincula o usuário ao sócio
    const { error: updateErr } = await adminClient
      .from("socios")
      .update({ user_id: authUserId })
      .eq("id", socio_id);
    if (updateErr) return json({ error: `Falha ao vincular usuário: ${updateErr.message}` }, 500);

    // Garante a role 'franqueado'
    const { error: roleInsertErr } = await adminClient
      .from("user_roles")
      .upsert({ user_id: authUserId, role: "franqueado" }, { onConflict: "user_id,role" });
    if (roleInsertErr) return json({ error: `Falha ao atribuir papel: ${roleInsertErr.message}` }, 500);

    return json({ ok: true, user_id: authUserId });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erro inesperado." }, 500);
  }
});
