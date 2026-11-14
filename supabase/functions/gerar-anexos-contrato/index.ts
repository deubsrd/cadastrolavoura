// supabase/functions/gerar-anexos-contrato/index.ts
// Gera, como documento separado do Contrato, os Anexos I (Mix de
// Produtos/Serviços), II (Fornecedores Homologados) e III (Área Territorial)
// do Contrato de Franquia Lavoura Lavanderia. Anexos I e II usam texto
// padrão remetendo ao manual oficial (igual para todas as unidades); o
// Anexo III varia por unidade (área territorial preferencial).

import {
  Document, Packer, Paragraph, TextRun,
  ShadingType, BorderStyle, AlignmentType,
  Header, Footer, PageNumber,
} from "npm:docx@9";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FONT = "Times New Roman";
const GREEN = "2D4A3E";
const GRAY_BG = "EFEFEF";

function shadedTitle(text: string) {
  return new Paragraph({
    shading: { type: ShadingType.CLEAR, color: "auto", fill: GRAY_BG },
    spacing: { before: 240, after: 200 },
    children: [new TextRun({ text, bold: true, color: GREEN, size: 26, font: FONT })],
  });
}
function body(text: string) {
  return new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({ text, size: 21, font: FONT })],
  });
}

function gerarDocx(d: Record<string, string>): Promise<Uint8Array> {
  const header = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: "LAVOURA LAVANDERIA", bold: true, color: GREEN, size: 22, font: FONT })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA", space: 4 } },
        children: [new TextRun({ text: `ANEXOS DO CONTRATO DE FRANQUIA — ${d.unidade_nome || "UNIDADE"}`, size: 16, font: FONT })],
      }),
    ],
  });

  const footer = new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "Página ", size: 18, font: FONT }),
        new TextRun({ children: [PageNumber.CURRENT], size: 18, font: FONT }),
        new TextRun({ text: " de ", size: 18, font: FONT }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, font: FONT }),
      ],
    })],
  });

  const doc = new Document({
    sections: [{
      properties: {
        page: { size: { width: 11906, height: 16838 }, margin: { top: 1600, bottom: 1300, left: 1100, right: 1100 } },
      },
      headers: { default: header },
      footers: { default: footer },
      children: [
        shadedTitle("ANEXO I — MIX DE PRODUTOS/SERVIÇOS"),
        body(
          d.mix_produtos?.trim() ||
          "Conforme Manual Oficial da Franqueadora, disponibilizado à EMPRESA FRANQUEADA durante o treinamento inicial e atualizado periodicamente por meio de comunicados emitidos pela FRANQUEADORA. A relação completa e sempre atual dos serviços e produtos autorizados integra os manuais operacionais do Sistema de Franquias Lavoura Lavanderia.",
        ),
        new Paragraph({ text: "", spacing: { after: 300 } }),

        shadedTitle("ANEXO II — FORNECEDORES HOMOLOGADOS"),
        body(
          d.fornecedores_homologados?.trim() ||
          "Conforme Manual Oficial da Franqueadora, disponibilizado à EMPRESA FRANQUEADA durante o treinamento inicial e atualizado periodicamente por meio de comunicados emitidos pela FRANQUEADORA, a qualquer tempo e ao critério exclusivo da FRANQUEADORA, sem que tal fato gere direito a indenização para os FRANQUEADOS. A relação completa e sempre atualizada dos fornecedores homologados integra os manuais operacionais do Sistema de Franquias Lavoura Lavanderia.",
        ),
        new Paragraph({ text: "", spacing: { after: 300 } }),

        shadedTitle("ANEXO III — ÁREA TERRITORIAL"),
        body(`Unidade: ${d.unidade_nome || "_________________"}`),
        body(
          d.area_territorial?.trim() ||
          "A ser definida de comum acordo entre as partes, observando os critérios previstos na Cláusula 4 (Território) do Contrato de Franquia.",
        ),
      ],
    }],
  });

  return Packer.toBuffer(doc);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const dados = await req.json();
    const buffer = await gerarDocx(dados);
    const base64 = btoa(String.fromCharCode(...buffer));

    return new Response(JSON.stringify({ ok: true, docx: base64, nome: dados.unidade_nome }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro inesperado." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
