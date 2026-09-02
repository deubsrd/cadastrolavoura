// supabase/functions/gerar-precontrato/index.ts
// Recebe os dados do pré-contrato, chama a API do Claude para revisar/formatar,
// e retorna os dados formatados.

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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_KEY) return json({ error: "ANTHROPIC_API_KEY não configurada." }, 500);

    const dados = await req.json();

    const prompt = `Você é um assistente jurídico da Lavoura Lavanderia Franchise Ltda. Formate os dados abaixo que serão usados no Pré-Contrato de Franquia e retorne APENAS um JSON válido com os dados formatados (nomes em maiúsculas, CPF no formato 000.000.000-00). Não adicione nenhum texto além do JSON.

Dados:
- Nome do candidato: ${dados.candidato_nome}
- RG: ${dados.candidato_rg}
- CPF: ${dados.candidato_cpf}
- Endereço: ${dados.candidato_endereco}
- Data recebimento COF: ${dados.data_recebimento_cof}
- Área pretendida: ${dados.area_ponto}
- Modalidade: ${dados.modalidade}
- Dados bancários: ${dados.dados_bancarios}
- Outras condições: ${dados.outras_condicoes}
- Data de assinatura: ${dados.data_assinatura_dia} de ${dados.data_assinatura_mes} de ${dados.data_assinatura_ano}
- Testemunha 1: ${dados.testemunha1_nome} - CPF: ${dados.testemunha1_cpf}
- Testemunha 2: ${dados.testemunha2_nome} - CPF: ${dados.testemunha2_cpf}

Retorne exatamente este JSON com os valores corrigidos/formatados:
{
  "candidato_nome": "",
  "candidato_rg": "",
  "candidato_cpf": "",
  "candidato_endereco": "",
  "data_recebimento_cof": "",
  "area_ponto": "",
  "modalidade": "",
  "dados_bancarios": "",
  "outras_condicoes": "",
  "data_assinatura_dia": "",
  "data_assinatura_mes": "",
  "data_assinatura_ano": "",
  "testemunha1_nome": "",
  "testemunha1_cpf": "",
  "testemunha2_nome": "",
  "testemunha2_cpf": ""
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const result = await response.json();
    const text = result.content?.[0]?.text ?? "";

    try {
      const clean = text.replace(/```json|```/g, "").trim();
      const formatted = JSON.parse(clean);
      return json({ ok: true, dados: { ...dados, ...formatted } });
    } catch {
      // Se falhar o parse, retorna os dados originais
      return json({ ok: true, dados });
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erro inesperado." }, 500);
  }
});
