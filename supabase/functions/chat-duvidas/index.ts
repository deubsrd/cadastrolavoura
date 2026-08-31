// supabase/functions/chat-duvidas/index.ts
//
// Chat de tira-dúvidas do franqueado. Responde com base no Manual de
// Operações + base de conhecimento aprendida (chat_conhecimento). Quando
// não sabe responder, registra a pergunta em chat_duvidas_pendentes para
// o admin responder depois — a resposta do admin realimenta a base.
//
// Body esperado: { pergunta: string, historico?: { role: "user"|"assistant", content: string }[] }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MANUAL_OPERACOES } from "./manual.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SEM_RESPOSTA_MARCADOR = "[SEM_RESPOSTA]";
const MENSAGEM_SEM_RESPOSTA =
  "Essa eu ainda não sei responder com segurança. Já registrei sua pergunta para a equipe " +
  "da franqueadora responder — assim que alguém confirmar, passo a saber responder isso " +
  "automaticamente da próxima vez.";

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return json(
        { error: "Chat não configurado: falta a chave LOVABLE_API_KEY nas secrets do projeto." },
        500,
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado." }, 401);

    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Sessão inválida." }, 401);

    const { pergunta, historico } = await req.json();
    if (!pergunta || typeof pergunta !== "string" || !pergunta.trim()) {
      return json({ error: "pergunta é obrigatória." }, 400);
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Sócio do usuário logado (via RLS do próprio token) — para logar de qual
    // unidade veio a pergunta, quando não souber responder.
    const { data: socio } = await callerClient
      .from("socios")
      .select("id, unidade_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    const { data: conhecimento } = await adminClient
      .from("chat_conhecimento")
      .select("pergunta, resposta")
      .order("created_at", { ascending: true });

    const baseAprendida =
      conhecimento && conhecimento.length > 0
        ? conhecimento.map((c) => `P: ${c.pergunta}\nR: ${c.resposta}`).join("\n\n")
        : "(nenhuma pergunta ensinada ainda)";

    const systemPrompt = `Você é o assistente de tira-dúvidas da Lavoura, uma rede de lavanderias de \
autosserviço. Você conversa com franqueados (donos de unidade) tirando dúvidas sobre operação \
diária, uso das máquinas, erros no visor, produtos e manutenção.

Responda sempre em português do Brasil, de forma direta e prática — como alguém experiente da \
equipe respondendo rápido no WhatsApp. Use listas curtas quando ajudar. Não invente informação que \
não esteja no manual ou na base abaixo.

Se a pergunta puder ser respondida com o manual ou com a base de conhecimento abaixo, responda \
normalmente. Se a pergunta for sobre operação da Lavoura mas você não tiver essa informação no \
manual nem na base, ou se a pergunta não tiver relação nenhuma com a operação de uma lavanderia \
Lavoura, responda EXATAMENTE começando com o texto ${SEM_RESPOSTA_MARCADOR} (nada antes dele).

=== MANUAL DE OPERAÇÕES ===
${MANUAL_OPERACOES}

=== PERGUNTAS JÁ ENSINADAS PELA EQUIPE (use como fonte confiável, tem prioridade sobre o manual em caso de conflito) ===
${baseAprendida}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(Array.isArray(historico) ? historico.slice(-6) : []),
      { role: "user", content: pergunta.trim() },
    ];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      return json({ error: `Falha ao consultar a IA: ${errText}` }, 502);
    }

    const aiData = await aiResp.json();
    const rawContent: string = aiData?.choices?.[0]?.message?.content ?? "";
    const semResposta = rawContent.trim().startsWith(SEM_RESPOSTA_MARCADOR);

    if (semResposta) {
      await adminClient.from("chat_duvidas_pendentes").insert({
        pergunta: pergunta.trim(),
        socio_id: socio?.id ?? null,
        unidade_id: socio?.unidade_id ?? null,
      });
      return json({ resposta: MENSAGEM_SEM_RESPOSTA, sem_resposta: true });
    }

    return json({ resposta: rawContent.trim(), sem_resposta: false });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erro inesperado." }, 500);
  }
});
