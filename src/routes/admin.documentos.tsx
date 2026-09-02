import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Lock } from "lucide-react";

export const Route = createFileRoute("/admin/documentos")({
  head: () => ({ meta: [{ title: "Documentos — Lavoura" }] }),
  component: AdminDocumentos,
});

type Socio = {
  id: string;
  nome_completo: string;
  cpf: string;
  rg: string;
  rg_orgao: string;
  email: string;
  telefone: string;
  logradouro: string;
  numero_casa: string;
  bairro: string;
  cidade: string;
  uf: string;
  tipo: string;
  unidade_id: string | null;
  numero_unidade: string;
};

// ──────────────────────────────────────────
// Gerador de .docx via Blob (client-side)
// usando a API do Claude para preencher o texto
// e a lib docx via CDN/worker para montar o arquivo
// ──────────────────────────────────────────

const CLÁUSULAS = [
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

async function gerarPreContrato(dados: {
  candidato_nome: string;
  candidato_rg: string;
  candidato_cpf: string;
  candidato_endereco: string;
  data_recebimento_cof: string;
  area_ponto: string;
  modalidade: string;
  dados_bancarios: string;
  outras_condicoes: string;
  data_assinatura_dia: string;
  data_assinatura_mes: string;
  data_assinatura_ano: string;
  testemunha1_nome: string;
  testemunha1_cpf: string;
  testemunha2_nome: string;
  testemunha2_cpf: string;
}) {
  // Usa a API do Claude para revisar/confirmar os dados e gerar o texto final de confirmação
  const prompt = `Você é um assistente jurídico da Lavoura Lavanderia Franchise Ltda. Confirme os dados abaixo que serão usados no Pré-Contrato de Franquia e retorne APENAS um JSON válido com os dados formatados corretamente (nomes em maiúsculas, CPF no formato 000.000.000-00, datas por extenso quando necessário). Não adicione nenhum texto além do JSON.

Dados informados:
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const result = await response.json();
  const text = result.content?.[0]?.text ?? "";
  let dadosFormatados = dados;
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    dadosFormatados = { ...dados, ...JSON.parse(clean) };
  } catch {
    // usa dados originais se falhar o parse
  }

  // Gera o HTML do documento para download como .html (abre no Word/LibreOffice)
  const d = dadosFormatados;
  const endereco = `${d.candidato_endereco}`;
  const dataAssinatura = `Boa Vista, RR, ${d.data_assinatura_dia || "_____"} de ${d.data_assinatura_mes || "_____________________"} de ${d.data_assinatura_ano || "2026"}.`;

  const qrRows = [
    ["Prazo", "210 (duzentos e dez) dias."],
    ["Data em que recebeu a COF e assinou a declaração", d.data_recebimento_cof || "_________________"],
    ["Área pretendida para localização do ponto", d.area_ponto || "_________________"],
    ["Modalidade de Franquia pretendida", d.modalidade || "_________________"],
    ["Taxa Inicial de Franquia", "R$ 25.900,00 (vinte e cinco mil e novecentos reais)"],
    ["Dados Bancários para Pagamento da Taxa de Franquia", d.dados_bancarios || "_________________"],
    ["Atualização monetária", "variação positiva do IGP-M/FGV na menor periodicidade prevista em lei;"],
    ...(d.outras_condicoes?.trim() ? [["Outras Condições", d.outras_condicoes]] : []),
  ];

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Pré-Contrato - ${d.candidato_nome}</title>
<style>
  @page { size: A4; margin: 2.5cm 2cm; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.5; color: #111; }
  .header { text-align: center; border-bottom: 1px solid #aaa; padding-bottom: 8px; margin-bottom: 16px; }
  .header img { height: 36px; }
  .header p { font-size: 8pt; color: #555; margin: 4px 0 0; }
  .title-box { background: #efefef; padding: 8px 12px; font-weight: bold; color: #2d4a3e; font-size: 13pt; margin: 16px 0 12px; }
  .section-title { font-weight: bold; margin: 16px 0 8px; font-size: 11pt; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  td { border: 1px solid #999; padding: 6px 8px; font-size: 10pt; vertical-align: top; }
  td.label { font-weight: bold; width: 38%; }
  .partes-table td { border: 1px solid #ccc; padding: 8px; }
  .clause { margin-bottom: 10px; font-size: 10.5pt; }
  .clause .num { font-weight: bold; }
  .bullet { margin-left: 24px; margin-bottom: 8px; font-size: 10.5pt; }
  .bullet::before { content: "• "; }
  .signature-line { margin-top: 32px; }
  .sig-item { margin-bottom: 20px; }
  .footer { text-align: center; font-size: 8pt; color: #777; border-top: 1px solid #aaa; padding-top: 6px; margin-top: 24px; }
</style>
</head>
<body>
<div class="header">
  <p><strong>LAVOURA LAVANDERIA</strong> · PRÉ-CONTRATO DE FRANQUIA</p>
</div>

<div class="title-box">Anexo V — Minuta do Pré-Contrato de Franquia</div>

<div class="section-title">Das Partes:</div>
<table class="partes-table">
  <tr><td><strong>LAVOURA LAVANDERIA FRANCHISE LTDA.</strong>, pessoa jurídica de direito privado, com sede e foro em Boa Vista/RR, inscrita no CNPJ sob o nº 63.586.665/0001-49, representada conforme seu Contrato Social, doravante simplesmente denominada <em>"FRANQUEADORA"</em>;</td></tr>
  <tr><td><strong>${d.candidato_nome || "XXXXXX"}</strong>, portador da Cédula de Identidade RG nº ${d.candidato_rg || "XXXXX"}, inscrito no CPF/MF sob o nº ${d.candidato_cpf || "XXXXX"}, residente e domiciliado na ${endereco || "XXXXX"}, doravante simplesmente denominado <em>"CANDIDATO"</em>;</td></tr>
</table>

<div class="section-title">Quadro Resumo (QR)</div>
<table>
  ${qrRows.map(([l, v]) => `<tr><td class="label">${l}</td><td>${v}</td></tr>`).join("")}
</table>

<div class="section-title">CONSIDERANDO QUE:</div>
<div class="bullet">O CANDIDATO recebeu, na data indicada no QR, um exemplar da Circular de Oferta de Franquia nos termos especificados pela Lei 13.966/2019 e tem interesse em tornar-se Franqueado da Rede Lavoura Lavanderia;</div>
<div class="bullet">O CANDIDATO tem ciência de que sua admissão no Sistema de Franquias está sujeita ao cumprimento integral dos requisitos dispostos neste pré-contrato;</div>
<div class="bullet">O CANDIDATO concorda em cumprir todas as obrigações previstas neste instrumento e, posteriormente, formalizar com a FRANQUEADORA o Contrato de Franquia, efetivando sua inclusão no Sistema de Franquias.</div>

<p>Têm as partes certo e ajustado as cláusulas e condições a seguir:</p>

${CLÁUSULAS.map(([num, texto]) => `<div class="clause"><span class="num">${num}</span> ${texto}</div>`).join("")}

<p>E por estarem assim justas e contratadas, as partes firmam o presente instrumento em 02 (duas) vias de igual forma e teor, juntamente com duas testemunhas abaixo identificadas.</p>

<p>${dataAssinatura}</p>

<div class="signature-line">
  <div class="sig-item">FRANQUEADORA. Assinatura: ______________________________________</div>
  <div class="sig-item">CANDIDATO(A). Nome: ${d.candidato_nome || "______________________"}  Assinatura: ______________________</div>
  <div class="sig-item">TESTEMUNHAS:<br>
    1. Nome: ${d.testemunha1_nome || "_________________________"}  CPF: ${d.testemunha1_cpf || "_______________"}<br>
    2. Nome: ${d.testemunha2_nome || "_________________________"}  CPF: ${d.testemunha2_cpf || "_______________"}
  </div>
</div>

<div class="footer">Pré-Contrato de Franquia — Lavoura Lavanderia Franchise Ltda. · CNPJ 63.586.665/0001-49</div>
</body>
</html>`;

  return { html, nome: d.candidato_nome };
}

function AdminDocumentos() {
  const [socios, setSocios] = useState<Socio[]>([]);
  const [socioId, setSocioId] = useState("");
  const [socio, setSocio] = useState<Socio | null>(null);
  const [gerando, setGerando] = useState(false);

  const [form, setForm] = useState({
    data_recebimento_cof: "",
    area_ponto: "",
    modalidade: "3 conjuntos de máquinas",
    dados_bancarios: "",
    outras_condicoes: "",
    data_assinatura_dia: String(new Date().getDate()),
    data_assinatura_mes: new Date().toLocaleDateString("pt-BR", { month: "long" }),
    data_assinatura_ano: String(new Date().getFullYear()),
    testemunha1_nome: "",
    testemunha1_cpf: "",
    testemunha2_nome: "",
    testemunha2_cpf: "",
  });

  useEffect(() => {
    supabase.from("socios").select("*").eq("tipo", "administrador").order("nome_completo")
      .then(({ data }) => setSocios((data as Socio[]) ?? []));
  }, []);

  useEffect(() => {
    if (!socioId) { setSocio(null); return; }
    const s = socios.find((s) => s.id === socioId) ?? null;
    setSocio(s);
  }, [socioId, socios]);

  const gerar = async () => {
    if (!socio) return toast.error("Selecione um franqueado.");
    setGerando(true);
    try {
      const dados = {
        candidato_nome: socio.nome_completo,
        candidato_rg: `${socio.rg} ${socio.rg_orgao}`,
        candidato_cpf: socio.cpf,
        candidato_endereco: `${socio.logradouro}, ${socio.numero_casa}, ${socio.bairro}, ${socio.cidade}/${socio.uf}`,
        ...form,
      };
      const { html, nome } = await gerarPreContrato(dados);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Pré-Contrato - ${nome}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Pré-contrato gerado e baixado!");
    } catch (e) {
      toast.error("Falha ao gerar o documento.");
      console.error(e);
    }
    setGerando(false);
  };

  const set = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Documentos</h1>
        <p className="text-sm text-muted-foreground">Gere documentos contratuais com dados do sistema, revisados pelo Claude.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Pré-contrato */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Pré-contrato de franquia</CardTitle>
              </div>
              <Badge variant="default">Disponível</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Anexo V da COF. Dados do candidato carregados automaticamente do sistema.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Seleção do franqueado */}
            <div className="space-y-1.5">
              <Label>Franqueado</Label>
              <Select value={socioId} onValueChange={setSocioId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o candidato..." />
                </SelectTrigger>
                <SelectContent>
                  {socios.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {socio && (
              <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1 text-muted-foreground">
                <p><span className="font-semibold text-foreground">CPF:</span> {socio.cpf}</p>
                <p><span className="font-semibold text-foreground">RG:</span> {socio.rg} {socio.rg_orgao}</p>
                <p><span className="font-semibold text-foreground">Endereço:</span> {socio.logradouro}, {socio.numero_casa}, {socio.bairro}, {socio.cidade}/{socio.uf}</p>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Data de recebimento da COF</Label>
                <Input placeholder="ex: 20/08/2026" value={form.data_recebimento_cof} onChange={(e) => set("data_recebimento_cof", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Área / bairro pretendido</Label>
                <Input placeholder="ex: Caçari, Boa Vista/RR" value={form.area_ponto} onChange={(e) => set("area_ponto", e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Modalidade</Label>
              <Select value={form.modalidade} onValueChange={(v) => set("modalidade", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3 conjuntos de máquinas">3 conjuntos de máquinas</SelectItem>
                  <SelectItem value="5 conjuntos de máquinas">5 conjuntos de máquinas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Dados bancários para pagamento</Label>
              <Input placeholder="Banco, Ag, CC, PIX..." value={form.dados_bancarios} onChange={(e) => set("dados_bancarios", e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Outras condições <span className="text-muted-foreground">(opcional)</span></Label>
              <Input placeholder="Deixe em branco se não houver" value={form.outras_condicoes} onChange={(e) => set("outras_condicoes", e.target.value)} />
            </div>

            <div className="grid gap-3 grid-cols-3">
              <div className="space-y-1.5">
                <Label>Dia</Label>
                <Input placeholder="ex: 15" value={form.data_assinatura_dia} onChange={(e) => set("data_assinatura_dia", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Mês</Label>
                <Input placeholder="ex: setembro" value={form.data_assinatura_mes} onChange={(e) => set("data_assinatura_mes", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Ano</Label>
                <Input placeholder="2026" value={form.data_assinatura_ano} onChange={(e) => set("data_assinatura_ano", e.target.value)} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Testemunha 1 — Nome</Label>
                <Input value={form.testemunha1_nome} onChange={(e) => set("testemunha1_nome", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Testemunha 1 — CPF</Label>
                <Input value={form.testemunha1_cpf} onChange={(e) => set("testemunha1_cpf", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Testemunha 2 — Nome</Label>
                <Input value={form.testemunha2_nome} onChange={(e) => set("testemunha2_nome", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Testemunha 2 — CPF</Label>
                <Input value={form.testemunha2_cpf} onChange={(e) => set("testemunha2_cpf", e.target.value)} />
              </div>
            </div>

            <Button className="w-full" onClick={gerar} disabled={gerando || !socioId}>
              <Download className="mr-2 h-4 w-4" />
              {gerando ? "Gerando com Claude..." : "Gerar pré-contrato"}
            </Button>
          </CardContent>
        </Card>

        {/* Contrato — Em breve */}
        <Card className="border-border/50 opacity-60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base text-muted-foreground">Contrato de franquia</CardTitle>
              </div>
              <Badge variant="outline" className="text-muted-foreground">Em breve</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Contrato definitivo entre CNPJ e CNPJ. Disponível em breve.</p>
          </CardHeader>
          <CardContent>
            <Button className="w-full" disabled>
              <Lock className="mr-2 h-4 w-4" />
              Em breve
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
