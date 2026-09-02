// supabase/functions/gerar-precontrato/index.ts
// Recebe os dados do pré-contrato, chama o Claude para formatar,
// gera o .docx via docx (npm) e retorna o arquivo como base64.

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, AlignmentType,
  Header, Footer, PageNumber, VerticalAlign,
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
    children: [new TextRun({ text, bold: true, color: GREEN, size: 28, font: FONT })],
  });
}
function sectionTitle(text: string) {
  return new Paragraph({
    spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, bold: true, size: 22, font: FONT })],
  });
}
function body(text: string) {
  return new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({ text, size: 21, font: FONT })],
  });
}
function clause(num: string, text: string) {
  return new Paragraph({
    spacing: { after: 140 },
    children: [
      new TextRun({ text: num + " ", bold: true, size: 21, font: FONT }),
      new TextRun({ text, size: 21, font: FONT }),
    ],
  });
}
function bullet(text: string) {
  return new Paragraph({
    spacing: { after: 100 },
    indent: { left: 400 },
    bullet: { level: 0 },
    children: [new TextRun({ text, size: 21, font: FONT })],
  });
}

const noBorder = {
  top: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
  left: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
  right: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
};

function cellText(text: string, opts: Record<string, unknown> = {}) {
  return new Paragraph({ children: [new TextRun({ text, size: 20, font: FONT, ...opts })] });
}
function labelCell(text: string, width: number) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA }, borders: noBorder,
    verticalAlign: VerticalAlign.CENTER, margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [cellText(text, { bold: true })],
  });
}
function valueCell(text: string, width: number) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA }, borders: noBorder,
    verticalAlign: VerticalAlign.CENTER, margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [cellText(text)],
  });
}

const CLAUSULAS: [string, string][] = [
  ["1.", "A Franqueadora assegura ao Candidato o direito de tornar-se Franqueado da marca, sendo-lhe autorizada a procura de um ponto comercial localizado na área descrita no QR, a fim de ali instalar uma unidade franqueada Lavoura Lavanderia, de acordo com os critérios descritos no presente instrumento contratual."],
  ["1.1.", "Através do presente pré-contrato as partes acordam as condições aqui estabelecidas, que são indispensáveis para a formalização, em caráter definitivo, de uma franquia integrante do Sistema de Franquias."],
  ["2.", "O Candidato declara que possui conhecimento e aceita todas as previsões contidas na minuta do contrato de franquia (Anexo VI), recebida em conjunto com a COF."],
  ["3.", "O Candidato concorda que a futura unidade franqueada deverá ser administrada estritamente segundo os parâmetros e diretrizes estabelecidos pela Franqueadora, sendo essencial para a natureza da franquia o cumprimento rigoroso dessas normas e padrões."],
  ["4.", "Durante o período de 150 (cento e cinquenta) dias, a área indicada no QR ficará reservada para o Candidato. Entretanto, caso o ponto não seja aprovado nesse intervalo, a área poderá ser disponibilizada para negociação com terceiros interessados."],
  ["5.", "O Candidato deverá fornecer todos os documentos solicitados pela Franqueadora e prestar as informações necessárias para que esta possa comprovar sua idoneidade. Caso sejam identificadas restrições ou impedimentos relacionados ao nome do Candidato, sua aprovação como franqueado será inviabilizada e dará causa à rescisão do presente contrato, sem direito a qualquer reembolso."],
  ["6.", "Após a assinatura deste instrumento, o Candidato deverá iniciar a busca por um ponto comercial para a instalação da unidade franqueada, localizado na área geográfica indicada no respectivo item do QR."],
  ["7.", "A busca poderá ser realizada com o suporte da Franqueadora ou de terceiros por ela indicados. Contudo, a avaliação e decisão sobre a viabilidade econômica do ponto comercial caberão exclusivamente ao Candidato."],
  ["7.1.", "Para análise e aprovação do ponto comercial, o Candidato deverá apresentar os dados necessários sobre diferentes locais na região designada, respeitando o prazo máximo de 150 (cento e cinquenta) dias para a conclusão desse processo."],
  ["7.2.", "Caso o ponto sugerido seja rejeitado pela Franqueadora por não atender aos critérios de representatividade da marca, o Candidato deverá apresentar novas opções dentro do prazo estabelecido na cláusula imediatamente acima."],
  ["8.", "Após a aprovação do ponto, o Candidato deverá firmar imediatamente o contrato de locação compatível com o prazo de vigência do Contrato de Franquia, conforme instruções da Franqueadora e previsões da COF e da minuta do contrato de franquia já analisados."],
  ["8.1.", "Encontrado e aprovado o ponto, o Candidato deverá iniciar as obras de instalação da unidade, observando as diretrizes do projeto arquitetônico e após a autorização formal da Franqueadora."],
  ["8.2.", "Após receber o projeto arquitetônico, o Candidato deverá apresentar o cronograma e orçamento detalhado das obras, conforme orientações da Franqueadora, para análise, aprovação e acompanhamento desta."],
  ["8.2.1.", "Após a aprovação do cronograma, será definida, de comum acordo, a data prevista para a inauguração da unidade."],
  ["8.3.", "O Candidato está ciente e assume a total responsabilidade pela gestão e fiscalização das obras realizadas no ponto escolhido, garantindo que todas as etapas sejam concluídas em conformidade com os projetos e prazos previamente estabelecidos com a Franqueadora e eventuais terceiros envolvidos."],
  ["8.3.1.", "O Candidato obriga-se, exclusivamente às suas custas, a conseguir as licenças e alvarás necessários para inaugurar a operação, bem como a realizar a instalação dos pontos de saída elétrica, de água e de esgoto, a instalar linha telefônica, internet, equipamentos de hardware e implementar os softwares especificados pela Franqueadora e indispensáveis para a gestão do negócio, conforme as especificações contidas no projeto arquitetônico aprovado pela Franqueadora."],
  ["8.3.2.", "O Candidato está ciente de que precisará ter todas as instalações e estruturas indicadas na cláusula imediatamente acima, para poder inaugurar a operação."],
  ["8.3.3.", "A inauguração da unidade somente será autorizada após a aprovação formal da Franqueadora."],
  ["8.3.4.", "Caso o Candidato não cumpra com o cronograma e prazo ora ajustados, deverá arcar com uma multa no valor de R$ 10.000,00 (dez mil reais). Caso o atraso seja superior a 45 (quarenta e cinco) dias, dará causa à rescisão contratual e o Candidato deverá arcar com as penalidades previstas no presente instrumento."],
  ["9.", "Na data de assinatura deste instrumento, o Candidato deverá efetuar o pagamento da Taxa Inicial de Franquia, conforme indicado no QR."],
  ["10.", "O processo de implantação será iniciado somente após o pagamento da Taxa Inicial de Franquia e após a aprovação do ponto pela Franqueadora."],
  ["11.", "Havendo a celebração do Contrato de Franquia, a Taxa Inicial de Franquia não será cobrada novamente."],
  ["12.", "O presente instrumento terá o prazo de vigência estabelecido no QR. Após o cumprimento de todas as obrigações aqui estipuladas, as partes deverão formalizar o Contrato de Franquia, que regerá a relação jurídica entre elas."],
  ["12.1.", "Caso o Candidato cumpra com todas as suas obrigações, a assinatura do Contrato de Franquia poderá ser adiantada, com o término do presente pré-contrato e inauguração da operação."],
  ["13.", "É de responsabilidade do Candidato, durante a vigência deste pré-contrato, encontrar o ponto comercial, montar a unidade e constituir pessoa jurídica em que será sócio majoritário, ou possuir poderes de administração e gerência."],
  ["13.1.", "O Candidato deverá fornecer à Franqueadora todos os documentos solicitados a fim de comprovar o cumprimento desta obrigação."],
  ["14.", "O Contrato de Franquia será firmado entre a Franqueadora e uma pessoa jurídica a ser constituída pelo Candidato, exclusivamente para operar a Unidade Franqueada. O Candidato figurará no contrato de franquia como garantidor solidário da empresa que será constituída."],
  ["14.1.", "Com a assinatura do presente pré-contrato de franquia, o Candidato declara expressamente estar de acordo com todas as previsões constantes na minuta contratual recebida junto com a COF, declarando, portanto, que não há qualquer item a ser alterado nas cláusulas do contrato de franquia a ser celebrado."],
  ["15.", "Durante o período de vigência deste pré-contrato, o Candidato será convocado pela Franqueadora a participar do treinamento inicial no local a ser indicado pela Franqueadora, sendo que todos os custos relacionados à estadia, transporte e alimentação serão arcados exclusivamente pelo Candidato."],
  ["16.", "Se, por desídia do Candidato, não for possível encontrar um ponto comercial com as características exigidas pela Franqueadora dentro do prazo de 150 (cento e cinquenta) dias, o presente instrumento será rescindido automaticamente, sem direito a reembolso dos valores pagos, havendo a retenção integral pela Franqueadora do valor já pago."],
  ["16.1.", "Se o Candidato for ativo e indicar ao menos 5 (cinco) pontos — contendo as informações necessárias e indicadas pela Franqueadora — mas ainda assim não encontrar um ponto dentro do prazo, terá direito ao reembolso de 50% (cinquenta por cento) da Taxa de Franquia paga, sendo que o saldo remanescente será retido para cobrir todos os custos administrativos, operacionais e de impostos arcados pela Franqueadora."],
  ["17.", "O presente instrumento poderá ser imediatamente rescindido, por quaisquer das partes, na ocorrência dos seguintes eventos: a) a impossibilidade de escolha do ponto comercial devido à desídia do Candidato no prazo de 150 (cento e cinquenta) dias; b) a reprovação do Candidato no treinamento inicial; c) a constatação de que o Candidato forneceu informações falsas ou omitiu informações relevantes durante o processo de seleção, bem como a existência de restrições em crédito em seu nome; d) o término da vigência deste pré-contrato sem a inauguração da unidade franqueada; e) a desistência na continuidade do presente contrato sem autorização formal da Franqueadora; f) qualquer outra hipótese de rescisão prevista neste pré-contrato."],
  ["18.", "No caso de rescisão do presente instrumento com base em qualquer das hipóteses previstas na cláusula anterior, o Candidato não terá direito a qualquer reembolso, seja integral ou parcial, de valores pagos à Franqueadora, bem como não fará jus a qualquer tipo de indenização da Franqueadora."],
  ["18.1.", "O Candidato concorda expressamente com a previsão da cláusula imediatamente acima, de que não terá direito a qualquer reembolso se desistir de tornar-se Franqueado ou se der causa à rescisão, haja vista que a Franqueadora investiu tempo e tecnologia na assessoria do Candidato, bem como pelo fato de ter reservado o território ao Candidato."],
  ["19.", "Ocorrendo a rescisão do presente pré-contrato, independentemente do motivo, o Candidato se compromete a devolver imediatamente à Franqueadora todo e qualquer material fornecido durante a vigência deste instrumento, bem como não poderá divulgar quaisquer informações que tenha recebido sobre a operação da Marca, mantendo o sigilo e a confidencialidade sobre as informações recebidas. O descumprimento dessas obrigações sujeitará o Candidato ao pagamento de multa no valor fixo de R$ 120.000,00 (cento e vinte mil reais)."],
  ["20.", "O Candidato reconhece que não recebeu qualquer garantia de sucesso ou retorno financeiro garantido, bem como reconhece que a atividade de franquia, como qualquer outro negócio, envolve riscos."],
  ["21.", "As partes confirmam expressamente a concordância com todos os termos e condições estabelecidos neste instrumento, reconhecendo a validade e eficácia do documento em sua totalidade."],
  ["22.", "A tolerância ao eventual descumprimento de obrigações, seja quanto a atraso, inobservância das cláusulas deste instrumento, ou a não aplicação, na ocasião oportuna, das cominações dele decorrentes, não acarretará o cancelamento das respectivas penalidades, que poderão ser aplicadas e exercidas a qualquer tempo, caso permaneçam as causas."],
  ["23.", "Com renúncia a quaisquer outros, por mais privilegiados que sejam, fica eleito o Foro da Comarca de Boa Vista/RR, para dirimir quaisquer dúvidas ou controvérsias oriundas deste instrumento contratual."],
  ["24.", "As Partes reconhecem expressamente a veracidade, autenticidade, integridade, validade e eficácia deste instrumento formado em meio digital, e concordam em utilizar e reconhecer como manifestação válida de suas anuências as assinaturas em formato digital, por meio de certificado digital, regulamentado na Medida Provisória 2.200-2/2001 (que institui a Infraestrutura de Chaves Públicas Brasileira — ICP-Brasil) ou, ainda, por meio de plataformas de assinaturas eletrônicas, tais como D4Sign (www.d4sign.com.br)."],
];

function gerarDocx(d: Record<string, string>): Promise<Uint8Array> {
  const W1 = 3300, W2 = 6050;

  const qrRows = [
    ["Prazo", "210 (duzentos e dez) dias."],
    ["Data em que recebeu a COF e assinou a declaração", d.data_recebimento_cof || "_________________"],
    ["Área pretendida para localização do ponto", d.area_ponto || "_________________"],
    ["Modalidade de Franquia pretendida", d.modalidade || "_________________"],
    ["Taxa Inicial de Franquia", "R$ 25.900,00 (vinte e cinco mil e novecentos reais)"],
    ["Dados Bancários para Pagamento da Taxa de Franquia", d.dados_bancarios || "_________________"],
    ["Atualização monetária", "variação positiva do IGP-M/FGV na menor periodicidade prevista em lei;"],
    ...(d.outras_condicoes?.trim() ? [["Outras Condições", d.outras_condicoes]] : []),
  ].map(([l, v]) => new TableRow({ children: [labelCell(l, W1), valueCell(v, W2)] }));

  const partesRows = [
    new TableRow({ children: [new TableCell({
      width: { size: W1 + W2, type: WidthType.DXA }, borders: noBorder,
      margins: { top: 120, bottom: 120, left: 120, right: 120 },
      children: [new Paragraph({ children: [
        new TextRun({ text: "LAVOURA LAVANDERIA FRANCHISE LTDA.", bold: true, size: 20, font: FONT }),
        new TextRun({ text: ", pessoa jurídica de direito privado, com sede e foro em Boa Vista/RR, inscrita no CNPJ sob o nº 63.586.665/0001-49, representada conforme seu Contrato Social, doravante simplesmente denominada "FRANQUEADORA";", size: 20, font: FONT }),
      ]})],
    })]}),
    new TableRow({ children: [new TableCell({
      width: { size: W1 + W2, type: WidthType.DXA }, borders: noBorder,
      margins: { top: 120, bottom: 120, left: 120, right: 120 },
      children: [new Paragraph({ children: [
        new TextRun({ text: d.candidato_nome || "XXXXXX", bold: true, size: 20, font: FONT }),
        new TextRun({ text: `, portador da Cédula de Identidade RG nº ${d.candidato_rg || "XXXXX"}, inscrito no CPF/MF sob o nº ${d.candidato_cpf || "XXXXX"}, residente e domiciliado na ${d.candidato_endereco || "XXXXX"}, doravante simplesmente denominado "CANDIDATO";`, size: 20, font: FONT }),
      ]})],
    })]},)
  ];

  const dataAssinatura = `Boa Vista, RR, ${d.data_assinatura_dia || "_____"} de ${d.data_assinatura_mes || "_____________________"} de ${d.data_assinatura_ano || "2026"}.`;

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
        children: [new TextRun({ text: "PRÉ-CONTRATO DE FRANQUIA LAVOURA LAVANDERIA", size: 16, font: FONT })],
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
        shadedTitle("Anexo V — Minuta do Pré-Contrato de Franquia"),
        sectionTitle("Das Partes:"),
        new Table({ width: { size: W1 + W2, type: WidthType.DXA }, columnWidths: [W1 + W2], rows: partesRows }),
        new Paragraph({ text: "", spacing: { after: 200 } }),
        sectionTitle("Quadro Resumo (QR)"),
        new Table({ width: { size: W1 + W2, type: WidthType.DXA }, columnWidths: [W1, W2], rows: qrRows }),
        new Paragraph({ text: "", spacing: { after: 200 } }),
        body("CONSIDERANDO QUE:"),
        bullet("O CANDIDATO recebeu, na data indicada no QR, um exemplar da Circular de Oferta de Franquia nos termos especificados pela Lei 13.966/2019 e tem interesse em tornar-se Franqueado da Rede Lavoura Lavanderia;"),
        bullet("O CANDIDATO tem ciência de que sua admissão no Sistema de Franquias está sujeita ao cumprimento integral dos requisitos dispostos neste pré-contrato;"),
        bullet("O CANDIDATO concorda em cumprir todas as obrigações previstas neste instrumento e, posteriormente, formalizar com a FRANQUEADORA o Contrato de Franquia, efetivando sua inclusão no Sistema de Franquias."),
        body("Têm as partes certo e ajustado as cláusulas e condições a seguir:"),
        ...CLAUSULAS.map(([num, texto]) => clause(num, texto)),
        new Paragraph({ text: "", spacing: { after: 100 } }),
        body("E por estarem assim justas e contratadas, as partes firmam o presente instrumento em 02 (duas) vias de igual forma e teor, juntamente com duas testemunhas abaixo identificadas."),
        body(dataAssinatura),
        new Paragraph({ text: "", spacing: { after: 200 } }),
        body("FRANQUEADORA. Assinatura: ______________________________________"),
        new Paragraph({ text: "", spacing: { after: 200 } }),
        body(`CANDIDATO(A). Nome: ${d.candidato_nome || "______________________"}   Assinatura: ______________________`),
        new Paragraph({ text: "", spacing: { after: 200 } }),
        body(`TESTEMUNHAS:\n1. Nome: ${d.testemunha1_nome || "____________________"}  CPF: ${d.testemunha1_cpf || "____________________"}\n2. Nome: ${d.testemunha2_nome || "____________________"}  CPF: ${d.testemunha2_cpf || "____________________"}`),
      ],
    }],
  });

  return Packer.toBuffer(doc);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const dados = await req.json();

    // Formata dados com Claude (se key disponível)
    let dadosFormatados = dados;
    if (ANTHROPIC_KEY) {
      const prompt = `Formate os dados abaixo para um Pré-Contrato de Franquia. Retorne APENAS JSON válido, sem texto adicional.
Nome: ${dados.candidato_nome} → coloque em maiúsculas
CPF: ${dados.candidato_cpf} → formato 000.000.000-00
Outros campos: mantenha como estão.

JSON de saída:
{"candidato_nome":"","candidato_rg":"","candidato_cpf":"","candidato_endereco":"","data_recebimento_cof":"","area_ponto":"","modalidade":"","dados_bancarios":"","outras_condicoes":"","data_assinatura_dia":"","data_assinatura_mes":"","data_assinatura_ano":"","testemunha1_nome":"","testemunha1_cpf":"","testemunha2_nome":"","testemunha2_cpf":""}

Dados de entrada: ${JSON.stringify(dados)}`;

      try {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
        });
        const res = await r.json();
        const text = res.content?.[0]?.text ?? "";
        const clean = text.replace(/```json|```/g, "").trim();
        dadosFormatados = { ...dados, ...JSON.parse(clean) };
      } catch { /* usa dados originais */ }
    }

    // Gera o .docx
    const buffer = await gerarDocx(dadosFormatados);
    const base64 = btoa(String.fromCharCode(...buffer));

    return new Response(JSON.stringify({ ok: true, docx: base64, nome: dadosFormatados.candidato_nome }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro inesperado." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
