// Motor do SDR IA no WhatsApp (/admin/sdr) — Estratégia Agrotóxicos.
//   { action: "run_agent", lead_id, message_id }  (interno: header x-ss-secret, chamado pelo wa-webhook)
//   { action: "send", lead_id, text }              (admin: mensagem manual; pausa a IA nesse lead)
//   { action: "set_ai", lead_id, ativa }           (admin: assumir / devolver à IA)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ss-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const env = (k: string) => {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`Variável ${k} não configurada.`);
  return v;
};
const service = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
type SB = ReturnType<typeof service>;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function requireAdmin(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) throw new Error("Não autenticado.");
  const user = createClient(env("SUPABASE_URL"), Deno.env.get("SUPABASE_ANON_KEY") ?? env("SUPABASE_PUBLISHABLE_KEY"), {
    global: { headers: { Authorization: auth } },
  });
  const { data, error } = await user.auth.getUser();
  if (error || !data.user) throw new Error("Sessão inválida.");
  const { data: ok } = await service().rpc("has_role", { _user_id: data.user.id, _role: "admin" });
  if (!ok) throw new Error("Acesso restrito à franqueadora.");
}

// ------------------------------------------------------------------ WhatsApp
const graph = () =>
  `https://graph.facebook.com/${Deno.env.get("WA_GRAPH_VERSION") ?? "v24.0"}/${env("WA_PHONE_NUMBER_ID")}/messages`;

// A Meta entrega celulares do Brasil sem o nono dígito (55 + DDD + 8 dígitos), mas a lista de
// destinatários de teste e a rede aceitam o formato com o 9. Insere o 9 só ao enviar; o wa_id do
// lead continua como a Meta mandou.
function toE164Br(to: string) {
  const d = to.replace(/\D/g, "");
  return /^55\d{2}[6-9]\d{7}$/.test(d) ? `${d.slice(0, 4)}9${d.slice(4)}` : d;
}

async function waPost(body: Record<string, unknown>) {
  if (typeof body.to === "string") body = { ...body, to: toE164Br(body.to) };
  const r = await fetch(graph(), {
    method: "POST",
    headers: { Authorization: `Bearer ${env("WA_TOKEN")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
    signal: AbortSignal.timeout(20_000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = j?.error ?? {};
    if (e.code === 131047) throw new Error("Mais de 24h desde a última mensagem do lead: só dá para enviar template.");
    if (e.code === 131030) throw new Error("Número fora da lista de teste da Meta (adicione o telefone no painel do app).");
    throw new Error(`${e.message ?? `HTTP ${r.status}`}${e.code ? ` (código ${e.code})` : ""}`);
  }
  return (j.messages?.[0]?.id as string) ?? null;
}

async function sendText(sb: SB, leadId: string, to: string, text: string, sentBy: "ia" | "humano" | "sistema") {
  let waId: string | null = null;
  let error: string | null = null;
  try {
    waId = await waPost({ recipient_type: "individual", to, type: "text", text: { body: text, preview_url: true } });
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  const now = new Date().toISOString();
  await sb.from("sdr_messages").insert({
    lead_id: leadId, direction: "out", sent_by: sentBy, type: "text", body: text,
    wa_message_id: waId, status: waId ? "sent" : "failed", error,
  });
  await sb.from("sdr_leads").update({
    last_message_at: now, last_message_preview: text.slice(0, 140),
  }).eq("id", leadId);
  if (error) throw new Error(error);
}

async function markReadTyping(messageWaId: string) {
  try {
    await waPost({ status: "read", message_id: messageWaId, typing_indicator: { type: "text" } });
  } catch { /* opcional */ }
}

// ------------------------------------------------------------------ filtro (Estratégia Agrotóxicos)
const CRITERIOS = ["orcamento", "urgencia", "decisor", "praca", "ponto"] as const;
type Criterio = typeof CRITERIOS[number];

function faixaDe(nota: number): "A" | "B" | "C" {
  return nota >= 8 ? "A" : nota >= 5 ? "B" : "C";
}

function systemPrompt(cfg: Record<string, any>, lead: Record<string, any>, primeira: boolean) {
  const nome = lead.nome ?? lead.nome_perfil ?? "";
  const abertura = String(cfg.mensagem_abertura ?? "").replaceAll("{nome}", nome || "tudo bem").trim();
  const respondidas = Object.entries(lead.respostas ?? {})
    .map(([k, v]: [string, any]) => `- ${k}: "${v?.resposta}" (${v?.pontos} pts)`).join("\n") || "- nenhuma ainda";

  return `Você é o SDR (pré-vendas) da Lavoura, rede de franquias de lavanderia de autosserviço aberta 24h, nascida em Boa Vista (RR).
Você conversa pelo WhatsApp com pessoas interessadas em abrir uma franquia. Seu trabalho: responder rápido, fazer o filtro de 5 perguntas e passar o lead para o consultor de expansão.

REGRAS
- Português do Brasil, tom simpático e direto, mensagens curtas de WhatsApp (1 a 3 frases). Sem markdown, sem listas longas, no máximo 1 emoji.
- Nunca escreva "self service"; use sempre "autosserviço".
- Faça UMA pergunta por mensagem. Se o lead já respondeu algo espontaneamente, registre e não pergunte de novo.
- Números de investimento, taxa, royalties e prazos: só os que estão na base de conhecimento abaixo. NUNCA prometa faturamento, lucro, retorno ou payback. Se perguntarem, diga que esses números são apresentados com detalhe na reunião e na COF.
- Se a pessoa pedir para falar com uma pessoa, ficar irritada, fizer algo fora do roteiro que você não sabe responder, ou for fornecedor/cliente da lavanderia (não candidato a franqueado), use a ferramenta chamar_humano.
- Se a pessoa disser que não tem interesse, use encerrar_contato.
- Você é um assistente virtual da Lavoura; se perguntarem, não finja ser humano.

FILTRO (5 critérios; registre cada resposta com registrar_resposta, com a nota de 0 a 2)
1. orcamento — "Quanto você tem disponível para investir, somando capital próprio e financiamento?"
   2 = R$ 171 mil ou mais · 1 = R$ 100 a 170 mil, buscando crédito · 0 = menos de R$ 100 mil
2. urgencia — "Em quanto tempo quer estar com a unidade aberta?"
   2 = até 3 meses · 1 = 3 a 6 meses · 0 = sem prazo / mais de 6 meses
3. decisor — "Vai investir sozinho ou com sócio/cônjuge?"
   2 = decide sozinho ou o sócio vai à reunião · 1 = sócio decide depois · 0 = não é quem decide
4. praca — "Em qual cidade e bairro pensa em abrir?"
   2 = cidade do plano de expansão (${cfg.cidades_plano}) · 1 = outra cidade com 100 mil+ habitantes · 0 = cidade pequena fora do plano
   (salve a cidade e o bairro com atualizar_dados)
5. ponto — "Já tem um ponto em vista?"
   2 = tem ponto de 15 a 60 m² · 1 = está procurando · 0 = não pensou nisso
Quando os 5 estiverem registrados, chame concluir_filtro e siga o que ela devolver.

${primeira ? `ESTA É A PRIMEIRA RESPOSTA PARA ESTE LEAD. Comece com esta abertura (pode adaptar levemente se ele já fez uma pergunta, respondendo-a primeiro em uma frase):
"${abertura}"` : ""}

ESTADO DO LEAD
- Nome: ${nome || "não informado"}
- Etapa: ${lead.etapa} · Nota: ${lead.nota ?? "—"} · Faixa: ${lead.faixa ?? "—"}
- Respostas registradas:
${respondidas}

BASE DE CONHECIMENTO
${cfg.base_conhecimento || "Investimento total estimado (COF): R$ 171.292,36 (modelo 3 conjuntos de máquinas) ou R$ 231.092,36 (modelo 5 conjuntos). Taxa inicial de franquia: R$ 25.900,00. Royalties: 6% do faturamento bruto mensal. Isenção de fundo de propaganda, com investimento mínimo de R$ 1.800/mês em marketing local."}

${cfg.instrucoes ? `INSTRUÇÕES EXTRAS DA FRANQUEADORA\n${cfg.instrucoes}` : ""}`.trim();
}

const TOOLS = [
  {
    name: "registrar_resposta",
    description: "Registra a resposta do lead a um dos 5 critérios do filtro, com a nota de 0 a 2 conforme a tabela.",
    input_schema: {
      type: "object",
      properties: {
        criterio: { type: "string", enum: [...CRITERIOS] },
        resposta: { type: "string", description: "Resumo curto do que o lead respondeu" },
        pontos: { type: "integer", minimum: 0, maximum: 2 },
      },
      required: ["criterio", "resposta", "pontos"],
    },
  },
  {
    name: "atualizar_dados",
    description: "Salva nome, cidade ou bairro do lead quando ele informar.",
    input_schema: {
      type: "object",
      properties: { nome: { type: "string" }, cidade: { type: "string" }, bairro: { type: "string" } },
    },
  },
  {
    name: "concluir_filtro",
    description: "Calcula a nota final (0 a 10) quando os 5 critérios já foram registrados e diz o próximo passo.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "chamar_humano",
    description: "Passa a conversa para uma pessoa do time e pausa a IA neste lead.",
    input_schema: {
      type: "object",
      properties: { motivo: { type: "string" } },
      required: ["motivo"],
    },
  },
  {
    name: "encerrar_contato",
    description: "O lead disse que não tem interesse. Marca como perdido e pausa a IA.",
    input_schema: {
      type: "object",
      properties: { motivo: { type: "string" } },
      required: ["motivo"],
    },
  },
];

async function runTool(sb: SB, lead: Record<string, any>, name: string, input: any): Promise<string> {
  const now = new Date().toISOString();
  switch (name) {
    case "registrar_resposta": {
      if (!CRITERIOS.includes(input.criterio)) return "critério inválido";
      const pontos = Math.max(0, Math.min(2, Math.round(Number(input.pontos) || 0)));
      lead.respostas = { ...(lead.respostas ?? {}), [input.criterio as Criterio]: { resposta: String(input.resposta ?? ""), pontos } };
      await sb.from("sdr_leads").update({ respostas: lead.respostas }).eq("id", lead.id);
      const faltam = CRITERIOS.filter((c) => !lead.respostas[c]);
      return faltam.length ? `ok. Faltam: ${faltam.join(", ")}` : "ok. Os 5 critérios estão registrados: chame concluir_filtro.";
    }
    case "atualizar_dados": {
      const patch: Record<string, string> = {};
      for (const k of ["nome", "cidade", "bairro"]) if (input[k]) patch[k] = String(input[k]).slice(0, 120);
      if (Object.keys(patch).length) {
        Object.assign(lead, patch);
        await sb.from("sdr_leads").update(patch).eq("id", lead.id);
      }
      return "ok";
    }
    case "concluir_filtro": {
      const faltam = CRITERIOS.filter((c) => !lead.respostas?.[c]);
      if (faltam.length) return `Ainda faltam: ${faltam.join(", ")}. Pergunte antes de concluir.`;
      const nota = CRITERIOS.reduce((s, c) => s + (lead.respostas[c].pontos ?? 0), 0);
      const faixa = faixaDe(nota);
      const patch: Record<string, unknown> = { nota, faixa, qualificado_em: now };
      if (faixa === "C") {
        patch.etapa = "nutricao";
      } else {
        patch.etapa = "qualificado";
        patch.precisa_humano = true;
        patch.motivo_humano = faixa === "A"
          ? "Lead A: ligar em até 5 minutos e marcar a reunião com o closer"
          : "Lead B: ligar para entender o que falta (crédito ou sócio) e decidir se agenda";
      }
      Object.assign(lead, patch);
      await sb.from("sdr_leads").update(patch).eq("id", lead.id);
      if (faixa === "A") {
        return `Nota ${nota} (lead A). Diga que o perfil encaixa no que a Lavoura busca e que o consultor de expansão vai chamar em instantes para marcar a apresentação por vídeo (45 min). Pergunte qual o melhor período para ele (manhã ou tarde). Continue respondendo dúvidas.`;
      }
      if (faixa === "B") {
        return `Nota ${nota} (lead B). Agradeça, diga que um consultor da Lavoura vai falar com ele para entender melhor o momento e os próximos passos. Não ofereça horário.`;
      }
      return `Nota ${nota} (lead C). Agradeça com gentileza, diga que vai mandar conteúdos sobre o modelo de negócio para ele conhecer melhor a Lavoura e que pode chamar quando estiver pronto. Não ofereça reunião.`;
    }
    case "chamar_humano": {
      const patch = { precisa_humano: true, ia_ativa: false, motivo_humano: String(input.motivo ?? "").slice(0, 300) };
      Object.assign(lead, patch);
      await sb.from("sdr_leads").update(patch).eq("id", lead.id);
      return "IA pausada. Diga ao lead, em uma frase, que uma pessoa do time vai continuar o atendimento por aqui.";
    }
    case "encerrar_contato": {
      const patch = { etapa: "perdido", motivo_perda: String(input.motivo ?? "sem interesse").slice(0, 300), ia_ativa: false };
      Object.assign(lead, patch);
      await sb.from("sdr_leads").update(patch).eq("id", lead.id);
      return "Marcado como perdido. Agradeça e se despeça em uma frase.";
    }
    default:
      return "ferramenta desconhecida";
  }
}

async function claude(system: string, messages: any[]) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": env("ANTHROPIC_API_KEY"), "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("SDR_AI_MODEL") ?? Deno.env.get("SS_AI_MODEL") ?? "claude-sonnet-5",
      max_tokens: 1024, system, tools: TOOLS, messages,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  return await res.json();
}

const OPT_OUT = /^\s*(parar|pare|sair|stop|cancelar|descadastrar)\s*[.!]*\s*$/i;

async function runAgent(leadId: string, messageId: string) {
  const sb = service();

  // Espera alguns segundos: se o lead mandar várias mensagens seguidas, responde uma vez só, na última.
  await sleep(5000);
  const { data: last } = await sb.from("sdr_messages").select("id, wa_message_id, body")
    .eq("lead_id", leadId).eq("direction", "in").order("created_at", { ascending: false }).limit(1).single();
  if (!last || last.id !== messageId) return;

  const [{ data: cfg }, { data: lead }] = await Promise.all([
    sb.from("sdr_config").select("*").eq("id", true).single(),
    sb.from("sdr_leads").select("*").eq("id", leadId).single(),
  ]);
  if (!cfg || !lead || lead.opt_out) return;

  if (OPT_OUT.test(last.body ?? "")) {
    await sb.from("sdr_leads").update({ opt_out: true, ia_ativa: false }).eq("id", leadId);
    await sendText(sb, leadId, lead.wa_id, "Tudo certo, não vou mais te enviar mensagens. Se mudar de ideia, é só chamar aqui. 🙂", "sistema");
    return;
  }
  if (!cfg.ia_ligada || !lead.ia_ativa) return;

  if (last.wa_message_id) await markReadTyping(last.wa_message_id);

  const { data: hist } = await sb.from("sdr_messages").select("direction, sent_by, body, created_at")
    .eq("lead_id", leadId).order("created_at", { ascending: false }).limit(40);
  const history = (hist ?? []).reverse();
  const primeira = !history.some((m) => m.direction === "out");

  // histórico em turnos alternados (user = lead, assistant = Lavoura)
  const messages: { role: "user" | "assistant"; content: any }[] = [];
  for (const m of history) {
    const role = m.direction === "in" ? "user" : "assistant";
    const text = (m.sent_by === "humano" ? "[atendente da Lavoura] " : "") + (m.body ?? "");
    if (!text.trim()) continue;
    const prev = messages[messages.length - 1];
    if (prev && prev.role === role) prev.content += `\n${text}`;
    else messages.push({ role, content: text });
  }
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== "user") return;

  let reply = "";
  for (let i = 0; i < 6; i++) {
    const r = await claude(systemPrompt(cfg, lead, primeira), messages);
    const blocks = r.content ?? [];
    const uses = blocks.filter((b: any) => b.type === "tool_use");
    const text = blocks.filter((b: any) => b.type === "text").map((b: any) => b.text).join("").trim();
    if (!uses.length || r.stop_reason !== "tool_use") { reply = text; break; }
    messages.push({ role: "assistant", content: blocks });
    const results = [];
    for (const u of uses) {
      results.push({ type: "tool_result", tool_use_id: u.id, content: await runTool(sb, lead, u.name, u.input ?? {}) });
    }
    messages.push({ role: "user", content: results });
  }
  if (!reply) return;

  // Até 3 balões, separados por linha em branco
  const parts = reply.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const balloons = parts.length > 3 ? [...parts.slice(0, 2), parts.slice(2).join("\n\n")] : parts;
  for (let i = 0; i < balloons.length; i++) {
    if (i > 0) await sleep(1200);
    await sendText(sb, leadId, lead.wa_id, balloons[i], "ia");
  }

  if (!lead.primeiro_contato_em) {
    const patch: Record<string, unknown> = { primeiro_contato_em: new Date().toISOString() };
    if (lead.etapa === "novo") patch.etapa = "contato";
    await sb.from("sdr_leads").update(patch).eq("id", leadId);
  }
}

// ------------------------------------------------------------------ HTTP
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json();
    const internal = !!Deno.env.get("SS_SECRET") && req.headers.get("x-ss-secret") === Deno.env.get("SS_SECRET");

    if (body.action === "run_agent") {
      if (!internal) return json({ error: "não autorizado" }, 401);
      const work = runAgent(body.lead_id, body.message_id).catch((e) => console.error("agente", e));
      // @ts-ignore EdgeRuntime existe no runtime do Supabase
      if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(work); else await work;
      return json({ ok: true });
    }

    if (body.action === "wa_subscribe") {
      if (!internal) await requireAdmin(req);
      const url = "https://graph.facebook.com/v25.0/1395102652444717/subscribed_apps";
      const h = { Authorization: `Bearer ${env("WA_TOKEN")}` };
      const g = await fetch(url, { headers: h });
      const listaResp = await g.json().catch(() => null);
      const lista = { status: g.status, body: listaResp };
      const apps: any[] = listaResp?.data ?? [];
      const ja = apps.some((a) => (a?.whatsapp_business_api_data?.id ?? a?.id) === "1635531744975132");
      let inscricao: unknown = ja ? "app já inscrito; POST não executado" : null;
      if (!ja && g.ok) {
        const p = await fetch(url, { method: "POST", headers: h });
        inscricao = { status: p.status, body: await p.json().catch(() => null) };
      } else if (!g.ok) inscricao = "GET falhou; POST não executado";
      return json({ lista, inscricao });
    }

    await requireAdmin(req);
    const sb = service();
    const { data: lead } = await sb.from("sdr_leads").select("id, wa_id, last_inbound_at").eq("id", body.lead_id).single();
    if (!lead) return json({ error: "Lead não encontrado." }, 404);

    if (body.action === "send") {
      const text = String(body.text ?? "").trim();
      if (!text) return json({ error: "Mensagem vazia." }, 400);
      const aberta = lead.last_inbound_at && Date.now() - new Date(lead.last_inbound_at).getTime() < 24 * 3600 * 1000;
      if (!aberta) return json({ error: "Mais de 24h desde a última mensagem do lead: só dá para enviar template." }, 400);
      await sb.from("sdr_leads").update({ ia_ativa: false, unread: 0 }).eq("id", lead.id); // humano assumiu
      await sendText(sb, lead.id, lead.wa_id, text, "humano");
      return json({ ok: true });
    }

    if (body.action === "set_ai") {
      const ativa = !!body.ativa;
      await sb.from("sdr_leads").update(
        ativa ? { ia_ativa: true, precisa_humano: false, motivo_humano: null } : { ia_ativa: false },
      ).eq("id", lead.id);
      return json({ ok: true });
    }

    return json({ error: "Ação desconhecida." }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 400);
  }
});
