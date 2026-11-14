// supabase/functions/gerar-contrato/index.ts
// Gera o Contrato de Franquia Empresarial Lavoura Lavanderia (.docx), com
// base no modelo oficial. Mesma arquitetura do gerar-precontrato: recebe os
// dados já resolvidos pelo frontend, opcionalmente formata com Claude, monta
// o .docx via docx (npm) e retorna como base64.

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
function titleLine(text: string, opts: Record<string, unknown> = {}) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [new TextRun({ text, bold: true, size: 24, font: FONT, ...opts })],
  });
}
function sectionTitle(text: string) {
  return new Paragraph({
    spacing: { before: 220, after: 120 },
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

// ---------------------------------------------------------------------------
// Cláusulas fixas (1 a 20), extraídas do modelo oficial. d.taxaBloco e
// d.clausula104 variam conforme o franqueado estar na 1ª unidade ou numa
// unidade adicional (ver gerarDocx).
// ---------------------------------------------------------------------------
type Entry = { kind: "title"; text: string } | { kind: "clause"; num: string; text: string };

function buildEntries(d: Record<string, string>): Entry[] {
  const t = (text: string): Entry => ({ kind: "title", text });
  const c = (num: string, text: string): Entry => ({ kind: "clause", num, text });

  return [
    t("1. OBJETO"),
    c("1.1.", `A FRANQUEADORA cede à EMPRESA FRANQUEADA, pelo período de vigência deste contrato, o direito exclusivo e precário de estabelecer, gerir e operar uma unidade franqueada da marca "Lavoura Lavanderia" durante o prazo contratual, utilizando a metodologia desenvolvida pela FRANQUEADORA para a implantação, gestão e administração do "Sistema de Franquia Empresarial Lavoura Lavanderia". Trata-se de uma unidade franqueada, na modalidade especificada no QR, voltada ao setor de lavanderia de autosserviço, com operação independente e individualizada para prestação de serviços de lavagem e secagem de roupas e edredons, oferecendo também coworking, cafeteria e demais serviços correlatos, atendendo consumidores finais e empresas, sempre aplicando o método e os processos estabelecidos pela FRANQUEADORA.`),
    c("1.2.", "A cessão descrita na cláusula imediatamente acima se dá para a operação de uma unidade localizada no endereço constante no QR, que deverá comercializar tão somente os serviços e produtos constantes no mix definido pela Franqueadora."),
    c("1.3.", "A concessão da unidade franqueada, objeto deste contrato, não confere exclusividade ao FRANQUEADO, permitindo à FRANQUEADORA a possibilidade de conceder novas unidades franqueadas a terceiros que atendam aos critérios exigidos e possuam o perfil adequado ao negócio."),
    c("1.3.1.", "O FRANQUEADO compromete-se a utilizar os direitos conferidos por este instrumento estritamente para a instalação, operação e administração da unidade franqueada, abstendo-se de qualquer uso diverso ou que não esteja previsto neste contrato."),
    c("1.4.", "Este contrato não será interpretado como uma associação, parceria, vínculo societário, relação de representação comercial, joint venture, contrato de fornecimento ou de distribuição entre as partes. É expressamente vedada a realização de vendas não autorizadas, incluindo vendas por atacado, canais virtuais ou outras modalidades fora do escopo autorizado para a EMPRESA FRANQUEADA."),

    t("2. VIGÊNCIA CONTRATUAL E RENOVAÇÃO"),
    c("2.1.", "O prazo de vigência do presente Contrato está previsto no QR, começando a vigorar na data da assinatura do presente, devendo o FRANQUEADO cumprir integralmente o prazo estipulado com apreço e dedicação à marca."),
    c("2.2.", "A EMPRESA FRANQUEADA deverá dar início às operações da unidade franqueada no prazo descrito no QR. Esse prazo poderá ser prorrogado por até 30 (trinta) dias adicionais, desde que devidamente justificado e mediante a celebração de um Aditivo Contratual."),
    c("2.3.", "O presente Contrato terá vigência conforme o período estabelecido no QR, sendo possível sua renovação por prazo equivalente ou inferior, desde que formalizado por meio de renovação contratual."),
    c("2.3.1.", "Caso o Franqueado não queira renovar, deverá manifestar sua posição e deverá cumprir com as obrigações contratuais até o término de vigência contratual, bem como deverá cumprir com todas as cláusulas pós-contratuais após o término de vigência do contrato."),
    c("2.3.2.", "Caso o Franqueado queira renovar o contrato, deverá notificar a Franqueadora, por escrito, sobre a intenção de renovar o contrato, com antecedência mínima de 150 (cento e cinquenta) dias em relação ao término do prazo contratual, sendo que a Franqueadora manifestará o seu interesse ou desinteresse na renovação contratual no prazo de até 45 (quarenta e cinco) dias após o recebimento da notificação do Franqueado."),
    c("2.4.", "Havendo o interesse de ambas as partes em renovar o contrato, o Franqueado deverá realizar a atualização do layout da unidade, deverá renovar o contrato de locação pelo prazo de vigência da renovação, assim como deverá assinar o contrato de franquia vigente à época da renovação e realizar o pagamento da taxa de renovação previsto no QR."),
    c("2.5.", "A EMPRESA FRANQUEADA declara, de forma expressa, que não recebeu qualquer garantia da FRANQUEADORA quanto à renovação deste instrumento, reconhecendo que tal renovação não será compulsória e dependerá do cumprimento integral das condições previstas."),

    t("3. MARCA"),
    c("3.1.", "A FRANQUEADORA concede à EMPRESA FRANQUEADA, durante a vigência deste contrato, o direito de uso da marca, em caráter não exclusivo e precário, exclusivamente para a operação da unidade e em locais, materiais ou produtos previamente aprovados por escrito pela FRANQUEADORA."),
    c("3.1.1.", "É expressamente vedado o uso da marca pela EMPRESA FRANQUEADA em associação a outras marcas, seja na unidade, em produtos ou em ações de publicidade e marketing, salvo autorização expressa da FRANQUEADORA."),
    c("3.1.2.", "A autorização concedida para o uso da marca não confere ao FRANQUEADO qualquer direito de propriedade sobre ela, independentemente do tempo de utilização. Fica expressamente vedada qualquer modificação no padrão visual, no logotipo ou sua utilização na razão social ou nome empresarial da EMPRESA FRANQUEADA. Além disso, não será permitido o registro da marca em qualquer órgão governamental, nacional ou internacional."),
    c("3.1.3.", "O uso da marca deverá estar em total conformidade com os termos deste contrato, bem como com as orientações estabelecidas em comunicados, manuais ou quaisquer outras diretrizes emitidas pela FRANQUEADORA."),
    c("3.1.4.", "A FRANQUEADORA possui o pedido de depósito da marca. Observa-se, por cautela, que eventual não confirmação e, ou, concessão de registro de tal marca poderá ensejar pontuais modificações, por razões alheias à vontade da FRANQUEADORA, fato que, por si só, não poderá ensejar a rescisão do presente Contrato de Franquia e obrigará o FRANQUEADO a seguir os padrões de uso da marca e imagem estabelecidos pela FRANQUEADORA, às suas expensas."),
    c("3.2.", "Em caso de término ou rescisão deste contrato, a EMPRESA FRANQUEADA deverá, no prazo de 10 (dez) dias corridos, cessar toda e qualquer utilização da marca, incluindo materiais de comunicação visual, rótulos e demais elementos relacionados, sob pena de sanções legais."),

    t("4. TERRITÓRIO"),
    c("4.1.", "Durante a vigência deste contrato, a EMPRESA FRANQUEADA deverá estabelecer sua unidade franqueada no local de sua escolha, respeitando integralmente o território de atuação definido no QR. O imóvel destinado à operação deverá estar alinhado à modalidade de franquia escolhida e atender às diretrizes estabelecidas pela FRANQUEADORA, garantindo a adequação do ponto comercial às necessidades operacionais do negócio."),
    c("4.2.", "A EMPRESA FRANQUEADA compromete-se a realizar a comercialização dos produtos, divulgação local e a prestação dos serviços exclusivamente na referida unidade franqueada."),
    c("4.3.", "Para lojas de rua, será concedida à EMPRESA FRANQUEADA uma área preferencial (detalhada no Anexo III — Área Territorial do presente contrato), respeitando as condições especificadas nas cláusulas abaixo."),
    c("4.4.", "Para unidades localizadas em shoppings, centros comerciais, galerias, aeroportos e afins, o território preferencial será restrito ao espaço físico do próprio local onde a unidade está implantada."),
    c("4.5.", "Caso, no território preferencial de uma loja de rua, existam shoppings, centros comerciais, galerias, aeroportos, centros de convenções e afins, tais locais serão, desde já, excluídos do território preferencial e poderão ser explorados diretamente pela FRANQUEADORA ou por terceiros indicados."),
    c("4.6.", "Havendo identificação pela FRANQUEADORA de potencial de mercado adicional no território preferencial da EMPRESA FRANQUEADA, esta terá direito de preferência para adquirir a nova unidade, devendo exercer o seu direito de preferência em até 10 (dez) dias úteis, após o recebimento da notificação a ser enviada pela FRANQUEADORA."),
    c("4.6.1.", "Caso o direito de preferência não seja exercido pela EMPRESA FRANQUEADA, o território preferencial poderá ser recalculado pela FRANQUEADORA, sem que isso gere qualquer direito de indenização à EMPRESA FRANQUEADA, que desde já concorda com tal possibilidade."),
    c("4.7.", "A EMPRESA FRANQUEADA deverá operar respeitando todas as diretrizes passadas pela FRANQUEADORA, devendo atender rigorosamente às normas operacionais, o que inclui horário de funcionamento, fixado em 24 horas por dia."),

    t("5. DOS MANUAIS"),
    c("5.1.", "As informações técnicas e operacionais serão descritas nos manuais, os quais serão disponibilizados à EMPRESA FRANQUEADA durante o treinamento inicial do FRANQUEADO, em regime de comodato e enquanto vigorar este contrato."),
    c("5.2.", "Os manuais integram este contrato e suas disposições constituem obrigações da EMPRESA FRANQUEADA. O descumprimento de qualquer diretriz pode ensejar a rescisão contratual por justa causa. Atualizações e complementos aos manuais, realizados por meio de comunicados emitidos pela FRANQUEADORA, passam a integrar automaticamente o conjunto de obrigações pactuadas entre as partes."),
    c("5.2.1.", "A EMPRESA FRANQUEADA deverá seguir rigorosamente os padrões e diretrizes estabelecidas nos manuais, bem como quaisquer novas instruções que venham a ser emitidas. Tais diretrizes podem complementar, modificar ou substituir as já existentes, sempre com o objetivo de preservar a reputação e a excelência do Sistema de Franquia."),
    c("5.3.", "Os manuais são cedidos à EMPRESA FRANQUEADA em regime de comodato e permanecem como propriedade exclusiva da FRANQUEADORA para todos os efeitos."),
    c("5.4.", "O conteúdo dos manuais é estritamente confidencial e o FRANQUEADO compreende que deve envidar seus melhores esforços para manter a confidencialidade de tais documentos, sob pena de arcar com a penalidade ajustada neste instrumento no caso da quebra da confidencialidade."),

    t("6. INAUGURAÇÃO E TREINAMENTO"),
    c("6.1.", "A EMPRESA FRANQUEADA deverá, às suas expensas, contratar arquiteto homologado pela FRANQUEADORA para desenvolver os projetos arquitetônico, de layout, comunicação visual e mobiliário, observando rigorosamente os padrões da FRANQUEADORA."),
    c("6.2.", "Antes de assinar o contrato de locação do ponto comercial, a EMPRESA FRANQUEADA deverá solicitar a expressa aprovação pela FRANQUEADORA."),
    c("6.2.1.", "Somente poderá ser realizada a inauguração da unidade franqueada, após aprovação final e expressa da FRANQUEADORA."),
    c("6.3.", "Antes de inaugurar efetivamente a unidade franqueada, a EMPRESA FRANQUEADA deverá obter e manter todas as autorizações necessárias (alvarás, licenças etc.) pelas suas próprias expensas, bem como deverá ter constituído pessoa jurídica com as especificidades necessárias à operação franqueada."),
    c("6.4.", "O treinamento inicial será realizado na modalidade de ensino à distância e terá duração prevista de 6 (seis) dias para o treinamento como um todo, abrangendo aspectos operacionais, institucionais, marketing, gestão e implantação. Todos os eventuais custos relacionados a transporte, estadia e alimentação serão arcados exclusivamente pela EMPRESA FRANQUEADA."),
    c("6.4.1.", "Encerrado o treinamento inicial, o FRANQUEADO passará a ser responsável pela multiplicação das orientações e treinamentos a seus funcionários e/ou prestadores de serviços, que posteriormente vierem a integrar seus quadros."),
    c("6.5.", "A instalação da unidade franqueada será realizada em imóvel cuja titularidade ou direito de uso seja comprovado pela EMPRESA FRANQUEADA."),
    c("6.5.1.", "A EMPRESA FRANQUEADA se compromete, em caso de término deste contrato, a dar preferência à FRANQUEADORA ou a terceiros indicados por ela para locação do espaço, desde que a FRANQUEADORA manifeste interesse formal em até 30 (trinta) dias úteis antes do encerramento do contrato ou no momento do descredenciamento da unidade."),

    t("7. OBRIGAÇÕES OPERACIONAIS E DE SISTEMA/SOFTWARE"),
    c("7.1.", "A EMPRESA FRANQUEADA se obriga a utilizar exclusivamente os softwares e sistemas indicados pela FRANQUEADORA para a gestão da unidade franqueada, devendo manter os registros de vendas sempre atualizados, bem como a EMPRESA FRANQUEADA deverá permitir livre acesso da FRANQUEADORA às informações relativas ao desempenho da unidade via sistema."),
    c("7.1.1.", "A inveracidade das informações sobre quantidades de vendas realizadas poderá acarretar a rescisão contratual por culpa exclusiva da EMPRESA FRANQUEADA."),
    c("7.1.2.", "A EMPRESA FRANQUEADA deve acessar diariamente o sistema oficial da FRANQUEADORA, assegurando-se de manter-se atualizada sobre as informações divulgadas e informando sua equipe acerca do conteúdo relevante."),
    c("7.2.", "A EMPRESA FRANQUEADA será responsável por adquirir as licenças de uso dos softwares e sistemas indicados, assim como arcar com todos os custos relacionados à sua aquisição, treinamento, instalação e manutenção."),
    c("7.2.1.", "A EMPRESA FRANQUEADA deverá adquirir e manter, às suas expensas, os equipamentos de hardware e uma conexão de internet, condizentes com a operação do negócio."),
    c("7.3.", "A EMPRESA FRANQUEADA deverá comercializar exclusivamente os serviços autorizados pela FRANQUEADORA, conforme lista passada pela FRANQUEADORA. A inclusão ou exclusão de itens poderá ser determinada pela FRANQUEADORA a qualquer tempo, sendo a EMPRESA FRANQUEADA obrigada a implementar tais alterações."),
    c("7.4.", "A operação da EMPRESA FRANQUEADA deverá ser conduzida com integral e estrita observância às diretrizes do Sistema de Franquias, cujos padrões e instruções poderão ser modificados a qualquer tempo exclusivamente pela FRANQUEADORA, visando melhorias à Rede."),
    c("7.4.1.", "A EMPRESA FRANQUEADA se compromete a manter todas as instalações, equipamentos e materiais de sua unidade franqueada sempre em perfeito estado de conservação e manutenção, zelando por sua higiene e organização, realizando periodicamente a manutenção e reparos necessários."),
    c("7.5.", "A FRANQUEADORA poderá, a qualquer momento, determinar a substituição de equipamentos, itens de comunicação visual e uniformes da unidade franqueada, devendo a EMPRESA FRANQUEADA implementar as mudanças dentro dos prazos estipulados às suas próprias expensas."),

    t("8. OBRIGAÇÕES DA FRANQUEADORA"),
    c("8.1.", `Além das demais obrigações previstas no presente contrato, constituem obrigações da Franqueadora, a qual compromete-se a: a) Promover a capacitação inicial do Franqueado, de acordo com um programa definido pela Franqueadora, realizado em local por ela indicado. b) Zelar pela marca e o Sistema de Franquias. c) Apoiar a seleção do local para instalação da Unidade Franqueada, sem que essa indicação seja interpretada como garantia de sucesso ou viabilidade do ponto comercial. d) Prestar suporte ao Franqueado, de forma virtual, durante o horário comercial, sempre que solicitado, prestando as orientações necessárias para a gestão da unidade franqueada. e) Apoiar a operação da unidade franqueada, prestando suporte e orientando o FRANQUEADO para o cumprimento deste contrato. f) Garantir, diretamente ou por meio de Fornecedores Homologados, a entrega dos produtos, materiais e insumos necessários para as atividades da unidade franqueada. g) Estabelecer e atualizar periodicamente a lista de serviços e produtos obrigatórios a serem ofertados pelas unidades franqueadas, assim como a política de preços. h) Coordenar campanhas de marketing e propaganda institucional, incentivando as atividades da rede como um todo.`),

    t("9. OBRIGAÇÕES DO FRANQUEADO"),
    c("9.1.", `Por outro lado, além das demais obrigações previstas no presente contrato, constituem obrigações do FRANQUEADO: a) Cumprir integralmente as leis, regulamentos, portarias e normas estabelecidas por órgãos competentes em âmbito municipal, estadual e federal, incluindo, mas não se limitando, ao Código de Defesa do Consumidor e às normas de Vigilância Sanitária, garantindo a regularidade do funcionamento da unidade franqueada. b) Manter os padrões de qualidade e manter a unidade franqueada em plena atividade de acordo com os procedimentos passados pela FRANQUEADORA. c) Atender os clientes conforme os padrões determinados pela Franqueadora, seguindo rigorosamente as diretrizes dos Manuais e instruções fornecidas. d) Pagar pontualmente todas as taxas previstas no Contrato de Franquia e assumir integralmente as responsabilidades do seu negócio, sem envolver ou comprometer a Franqueadora em obrigações financeiras, operacionais ou de qualquer natureza. e) Contratar diretamente os colaboradores necessários, responsabilizando-se pela seleção, gestão e demissão, assegurando a contratação de profissionais capacitados e idôneos. f) Adquirir, produzir e/ou comercializar apenas os serviços e produtos autorizados pela Franqueadora, implementando ou retirando itens do mix conforme orientações da mesma ou de seus Fornecedores Homologados. g) Permitir auditorias técnicas e comerciais realizadas pela Franqueadora sempre que necessário, fornecendo informações de vendas e demais documentos a serem exigidos pela Franqueadora. h) Fornecer à Franqueadora relatórios e informações exigidas, conforme prazos e formatos definidos nos Manuais ou comunicados, especialmente por meio do software indicado. i) Preservar o padrão visual da unidade, não realizando modificações sem a prévia e expressa autorização da FRANQUEADORA. j) Garantir que sua equipe utilize uniformes conforme os padrões estabelecidos pela FRANQUEADORA, assegurando um atendimento ao público de excelência e alinhado às diretrizes da marca. k) Contratar seguro para a Unidade Franqueada e enviar cópia da apólice à Franqueadora em até 10 (dez) dias após a contratação. l) Informar imediatamente à Franqueadora qualquer evento que possa colocar em risco o negócio ou afetar a Marca e o Sistema. m) Respeitar os limites do seu Território, não realizando publicidade ou comercialização de produtos fora dele ou em territórios de outras unidades franqueadas. n) Submeter previamente à aprovação da Franqueadora qualquer tipo de publicidade ou comunicação que pretenda utilizar. o) Participar e garantir a participação de seus colaboradores em eventuais treinamentos de reciclagem e atualização, bem como em convenções eventualmente organizadas, promovidas ou recomendadas pela FRANQUEADORA. p) Garantir que a Unidade Franqueada esteja constantemente higienizada, organizada e segura, em conformidade com os padrões estabelecidos nos Manuais e em plena adequação à legislação e regulamentos aplicáveis. q) Respeitar as políticas de preços estabelecidas pela Franqueadora, conforme sua região de atuação. r) Investir mensalmente em marketing local, no valor mínimo previsto no QR; s) Participar das campanhas sazonais definidas pela Franqueadora, e sujeitar-se às penalidades em caso de descumprimento. t) Retirar de circulação quaisquer produtos com prazo de validade inferior a 7 (sete) dias antes do vencimento. u) Garantir não apenas o capital necessário para a abertura da Unidade Franqueada, mas também o capital de giro para a manutenção do negócio e novos investimentos que se fizerem necessários.`),
    c("9.2.", "A FRANQUEADORA poderá fiscalizar a unidade franqueada sem aviso prévio, garantindo o cumprimento das obrigações contratuais e padrões operacionais, devendo o FRANQUEADO sempre permitir livre acesso para vistorias e auditorias pela FRANQUEADORA, sendo que a recusa pelo FRANQUEADO ensejará a imediata rescisão do presente contrato."),
    c("9.2.1.", "A FRANQUEADORA poderá solicitar dados operacionais e financeiros, realizar inspeções, registrar imagens, coletar amostras e entrevistar funcionários."),
    c("9.2.2.", "Irregularidades constatadas em relatórios feitos pela FRANQUEADORA deverão ser corrigidas no prazo estipulado, sob pena de rescisão contratual."),

    t("10. DAS TAXAS CONTRATUAIS"),
    c("10.1.", "A partir da inauguração da unidade e ao longo da vigência deste contrato, a EMPRESA FRANQUEADA deverá pagar à FRANQUEADORA uma taxa mensal de franquia (Royalties), descrita no QR, tendo em vista que os Royalties são devidos pelo uso do negócio franqueado, da Marca e acesso continuado ao know-how da FRANQUEADORA."),
    c("10.1.1.", "A taxa de Royalties contará com vencimento no dia 05 (cinco) do mês subsequente ao mês de referência. O pagamento deverá ser efetuado por meio de boleto bancário ou outra forma que venha a ser indicada pela FRANQUEADORA."),
    c("10.2.", "Para fins de aplicação da porcentagem de royalties, considera-se faturamento bruto o total das vendas efetuadas a cada mês."),
    c("10.2.1.", "Caso a EMPRESA FRANQUEADA sonegue o faturamento, ensejará a rescisão contratual imediata deste contrato por sua culpa exclusiva, devendo arcar com a penalidade prevista neste instrumento."),
    c("10.3.", "Caso a EMPRESA FRANQUEADA fique inadimplente no pagamento da Taxa elencada acima, os valores serão atualizados conforme os itens de reajustes e penalidades constantes no QR."),
    c("10.4.", d.clausula104),
    c("10.4.1.", "A referida Taxa de Franquia é irrevogável e não reembolsável."),

    t("11. PUBLICIDADE, PROPAGANDA E MARKETING"),
    c("11.1.", "Compete tão somente à FRANQUEADORA a criação, coordenação e execução de políticas de Marketing Institucional ou Nacional, incluindo promoções, estratégias de divulgação e orientações para ações de marketing."),
    c("11.2.", "Todas as despesas destinadas ao marketing local deverão ser integralmente suportadas pelo FRANQUEADO, podendo ainda participar de rateios com outros franqueados beneficiados pela mesma campanha."),
    c("11.2.1.", "A EMPRESA FRANQUEADA deverá investir comprovadamente em marketing local, no valor mínimo mensal previsto no QR, devendo enviar a comprovação deste ponto sempre que for solicitado pela FRANQUEADORA."),
    c("11.3.", "Qualquer material publicitário a ser utilizado pelo FRANQUEADO na unidade ou em ações de divulgação deverá obter aprovação prévia da FRANQUEADORA."),
    c("11.3.1.", "A FRANQUEADORA reserva-se o direito de, em situações especiais de mercado, coordenar propagandas estratégicas. Em tais casos, serão apresentados aos Franqueados os custos extraordinários envolvidos, sendo que os Franqueados deverão arcar com a sua cota parte."),
    c("11.4.", "A FRANQUEADORA poderá autorizar, a seu exclusivo critério, o uso de mídias sociais pela EMPRESA FRANQUEADA. No entanto, poderá determinar a interrupção ou suspensão de qualquer atividade nessas plataformas, caso julgue necessário."),
    c("11.4.1.", "Todas as contas de mídias sociais relacionadas à unidade franqueada serão criadas exclusivamente pela FRANQUEADORA, que deterá pleno controle sobre as contas, incluindo logins e senhas. As postagens serão feitas pelo FRANQUEADO. Em caso de término ou rescisão deste contrato, por qualquer motivo, as contas de mídias sociais deverão ser transferidas para a FRANQUEADORA imediatamente e sem restrições, sob pena de multa e aplicação das sanções previstas na cláusula de não concorrência, considerando que toda a clientela e os esforços de comunicação pertencem exclusivamente à marca da FRANQUEADORA."),
    c("11.4.2.", "A EMPRESA FRANQUEADA não poderá possuir site próprio, devendo utilizar exclusivamente o site do Sistema de Franquias."),

    t("12. AQUISIÇÃO DE PRODUTOS, SERVIÇOS E INSUMOS"),
    c("12.1.", "O FRANQUEADO obriga-se a adquirir, de forma contínua e exclusiva, todos os produtos, serviços, insumos e demais itens padronizados necessários à operação da unidade franqueada diretamente da FRANQUEADORA e/ou de fornecedores por ela previamente homologados, de acordo com as orientações passadas pela FRANQUEADORA."),
    c("12.1.1.", "A relação de fornecedores homologados encontra-se detalhada no Anexo II — Fornecedores Homologados deste contrato, sendo passível de atualizações por meio de comunicados emitidos pela FRANQUEADORA, a qualquer tempo e ao critério exclusivo da FRANQUEADORA, sem que tal fato gere direito a indenização para os FRANQUEADOS."),
    c("12.1.2.", "A negociação das condições de pagamento caberá exclusivamente ao FRANQUEADO junto aos fornecedores indicados."),
    c("12.1.2.1.", "O inadimplemento do FRANQUEADO em relação a qualquer pagamento devido à FRANQUEADORA ou aos fornecedores homologados poderá resultar na interrupção do fornecimento, sem prejuízo das penalidades previstas neste contrato."),
    c("12.2.", "A EMPRESA FRANQUEADA somente poderá comercializar ou oferecer na unidade franqueada os produtos e serviços expressamente autorizados pela FRANQUEADORA, sob pena de rescisão contratual por culpa exclusiva da EMPRESA FRANQUEADA."),
    c("12.2.1.", "O mix de produtos e serviços é estabelecido exclusivamente pela FRANQUEADORA (Anexo I — Mix de Produtos/Serviços) e deve ser integralmente disponibilizado ao consumidor final pela EMPRESA FRANQUEADA."),
    c("12.2.2.", "A EMPRESA FRANQUEADA deverá manter um estoque mínimo de produtos e insumos conforme as orientações da FRANQUEADORA, garantindo o adequado atendimento à demanda da unidade."),
    c("12.3.", "Caso a EMPRESA FRANQUEADA, por qualquer motivo, fique impossibilitada de adquirir os produtos dos fornecedores homologados, comprometendo o abastecimento e funcionamento de sua unidade franqueada, este contrato poderá ser imediatamente rescindido pela FRANQUEADORA, por culpa exclusiva da EMPRESA FRANQUEADA."),
    c("12.4.", "O faturamento e a entrega dos produtos serão de responsabilidade exclusiva dos fornecedores homologados, seguindo os procedimentos de compra definidos nos manuais ou comunicados emitidos pela FRANQUEADORA. Desse modo, todos os custos e despesas decorrentes da aquisição, transporte, seguro e tributos incidentes sobre os produtos adquiridos serão integralmente e exclusivamente arcados pela EMPRESA FRANQUEADA, que deverá honrar com suas obrigações."),
    c("12.4.1.", "A FRANQUEADORA não será responsável por qualquer problema relacionado aos produtos fornecidos pelos fornecedores homologados, incluindo defeitos, qualidade, quantidade, prazo ou condições de entrega. A EMPRESA FRANQUEADA, ao aceitar essas condições, declara estar ciente e de acordo."),
    c("12.4.2.", "A EMPRESA FRANQUEADA tem a obrigação de verificar a qualidade e a quantidade dos produtos no ato do recebimento, ficando vedada a apresentação de reclamações posteriores."),
    c("12.4.3.", "Os fornecimentos estarão sujeitos à disponibilidade dos produtos no momento da solicitação, bem como ao cumprimento dos procedimentos previstos nos manuais, especialmente no que diz respeito a prazos e quantidades mínimas ou máximas."),
    c("12.4.4.", "A FRANQUEADORA não poderá ser responsabilizada por variações nos preços praticados pelos fornecedores homologados ou por suas políticas comerciais."),
    c("12.4.5.", "O atraso em quaisquer pagamentos devidos pela EMPRESA FRANQUEADA em virtude dos fornecimentos poderá resultar em mudanças nas condições de pagamento de futuros pedidos, suspensão temporária ou até definitiva dos fornecimentos, até que todas as pendências sejam regularizadas."),
    c("12.5.", "A EMPRESA FRANQUEADA declara estar ciente de que os produtos — ou parte deles — podem ser produzidos por fabricantes terceiros. Nesse contexto, a FRANQUEADORA e/ou seus fornecedores estão sujeitos a eventos de caso fortuito ou força maior, falta de matéria-prima, greves, entre outras situações que possam gerar interrupções no fornecimento."),
    c("12.5.1.", "Na ocorrência de situações que resultem na indisponibilidade temporária de um ou mais produtos, a EMPRESA FRANQUEADA não poderá alegar tais fatos para fins de rescisão contratual, nem exigir a aplicação de multas ou pleitear qualquer tipo de indenização. Ambas as partes reconhecem que tais situações fazem parte das intercorrências naturais do negócio e, ao assinarem este contrato, aceitam-nas plenamente."),
    c("12.6.", "A FRANQUEADORA, seus fornecedores homologados e empresas pertencentes ao mesmo grupo econômico não possuem a obrigação de direcionar à rede de franqueados todos os produtos ou linhas de produtos que venham a desenvolver, estando ciente o FRANQUEADO deste fato e nada tendo a reclamar."),

    t("13. CESSÃO E TRANSFERÊNCIA"),
    c("13.1.", "O FRANQUEADO não poderá ceder ou transferir este Contrato, no todo ou em parte, sem a autorização prévia e expressa da FRANQUEADORA, por escrito."),
    c("13.2.", "Também não será permitida qualquer alteração na composição societária da EMPRESA FRANQUEADA sem o consentimento formal e prévio da FRANQUEADORA, sob pena de rescisão imediata deste instrumento por justa causa."),
    c("13.3.", `A FRANQUEADORA terá, a seu exclusivo critério, o direito de optar pela aquisição da unidade franqueada pelo prazo 40 (quarenta) dias após a comunicação pelo FRANQUEADO, seja diretamente ou por intermédio de terceiros indicados, incluindo o ponto comercial, mobiliário, equipamentos, instalações e/ou estoque de produtos, observando os seguintes critérios: a) Os móveis, equipamentos e instalações serão avaliados com base em uma depreciação anual de 20% (vinte por cento), considerando o valor constante na nota fiscal de compra pelo FRANQUEADO. O pagamento poderá ser feito em até 12 (doze) parcelas mensais de valores iguais e consecutivos; b) O estoque de produtos, desde que em perfeitas condições de uso e comercialização, será adquirido com um abatimento de 10% (dez por cento) sobre o valor indicado na nota fiscal de compra pelo FRANQUEADO; c) Quanto ao ponto comercial, caso tenha havido o pagamento de luvas ou cessão de direitos pelo FRANQUEADO, o valor máximo a ser pago pela FRANQUEADORA corresponderá ao montante originalmente desembolsado pelo FRANQUEADO, atualizado anualmente pelo IGP-M/FGV. Esse pagamento poderá ser parcelado em até 12 (doze) prestações mensais de valores iguais. Caso o FRANQUEADO não tenha pagado luvas ou cessão de direitos pelo ponto comercial, ficará impedido de cobrar qualquer valor a esse título.`),
    c("13.4.", "Para garantir à FRANQUEADORA o direito de exercer sua opção de compra, conforme previsto na cláusula anterior, o FRANQUEADO se compromete a comunicar formalmente à FRANQUEADORA, por escrito, sua intenção de transferir os direitos e obrigações deste contrato ou de rescindi-lo. A FRANQUEADORA terá um prazo de 45 (quarenta e cinco) dias para manifestar seu interesse em exercer ou não a opção de compra, seja diretamente ou por meio de terceiros por ela indicados."),
    c("13.4.1.", "Caso a FRANQUEADORA não exerça sua opção de compra, o FRANQUEADO poderá negociar a unidade com terceiros, desde que o comprador seja previamente aprovado pela FRANQUEADORA e a venda só poderá ser concretizada mediante autorização escrita da FRANQUEADORA."),
    c("13.4.2.", "O novo franqueado deverá obrigatoriamente passar pelo processo seletivo da FRANQUEADORA e, se aprovado, firmar um novo contrato de franquia, seguindo os padrões e regras vigentes no Sistema de Franquia à época. Além disso, será necessário o pagamento de uma taxa de transferência, conforme previsto no QR."),
    c("13.5.", "Em nenhuma circunstância o FRANQUEADO poderá vender ou transferir o ponto comercial onde opera a Unidade Franqueada para concorrentes da FRANQUEADORA, sob pena de arcar com o pagamento da multa prevista no caso de descumprimento da cláusula de não concorrência."),
    c("13.6.", "Em caso de falecimento, incapacidade ou interdição de um dos sócios do FRANQUEADO, seus herdeiros ou sucessores deverão manifestar, dentro do prazo de 30 (trinta) dias, seu interesse em dar continuidade à operação da franquia."),
    c("13.6.1.", "Caso os sucessores não desejem prosseguir com a franquia, deverão oferecer à FRANQUEADORA a possibilidade de adquirir a unidade, conforme previsto no presente instrumento. Entretanto, a FRANQUEADORA poderá, a seu critério, rescindir o contrato."),
    c("13.6.2.", "Se houver interesse dos sucessores em assumir a operação da unidade, eles deverão obrigatoriamente participar do treinamento e do processo seletivo da FRANQUEADORA. Caso sejam aprovados, deverão formalizar sua continuidade por meio da assinatura de um Termo de Aditamento ao contrato, sem necessidade de pagamento de taxa adicional. Caso não sejam aprovados, o contrato será rescindido sem aplicação de multa contratual, respeitando as disposições anteriores."),

    t("14. RESCISÃO"),
    c("14.1.", `O presente Contrato poderá ser rescindido por justa causa, de forma imediata e automática, por meio de notificação formal enviada pela parte não infratora, sem necessidade de ação judicial declaratória e sem prejuízo da aplicação de eventuais penalidades previstas neste instrumento. A rescisão poderá ocorrer, entre outras hipóteses previstas neste Contrato, nas seguintes situações: a) Comercialização de serviços não homologados pela FRANQUEADORA ou adquiridos de fornecedores não autorizados pela FRANQUEADORA; b) Violação de princípios éticos, descumprimento das diretrizes do Sistema de Franquia, das normas da FRANQUEADORA, das cláusulas contratuais ou das obrigações fiscais, trabalhistas e previdenciárias; c) Modificação da composição societária ou do controle acionário da EMPRESA FRANQUEADA sem a devida aprovação prévia e por escrito da FRANQUEADORA; d) Encerramento das atividades da Unidade Franqueada sem a autorização expressa e formal da FRANQUEADORA; e) Inadimplemento de qualquer obrigação financeira da EMPRESA FRANQUEADA, incluindo, mas não se limitando a atraso no pagamento das taxas do Sistema de Franquia — taxa de franquia e royalties, débitos com fornecedores homologados e despesas referentes ao aluguel do ponto comercial; f) Perda do direito de uso do imóvel onde opera a Unidade Franqueada, em razão de conduta negligente ou inadimplência por parte do FRANQUEADO; g) Subfaturamento, sonegação ou omissão de informações financeiras à FRANQUEADORA, especialmente no que se refere à omissão de faturamento; h) Ausência do FRANQUEADO na gestão e administração da Unidade Franqueada por um período superior a 30 (trinta) dias, sem a devida autorização prévia e por escrito da FRANQUEADORA; i) Falência, pedido de recuperação judicial ou extrajudicial, declaração de insolvência de qualquer das partes ou de seus sócios, bem como a existência de ações judiciais que possam comprometer sua capacidade financeira e solvência; j) Não regularização de falhas apontadas pela FRANQUEADORA ou não pagamento de multa aplicada nos termos do presente contrato; k) Incapacidade técnica ou operacional do FRANQUEADO para administrar a unidade ou descumprimento das normas contratuais, do manual ou dos padrões do Sistema de Franquias; l) Demais hipóteses previstas neste Contrato.`),

    t("15. MULTAS"),
    c("15.1.", "Na hipótese de rescisão contratual por justa causa, conforme previsão da cláusula 14.1 e suas alíneas, a parte culpada estará obrigada ao pagamento de uma multa rescisória contratual, cujo valor está indicado no QR. Tal multa possui natureza compensatória e não indenizatória."),
    c("15.1.1.", "Caso os prejuízos sofridos pela parte inocente ultrapassem o valor estipulado na cláusula anterior, será possível a adoção de medidas legais para reivindicar a diferença correspondente aos danos efetivamente suportados."),
    c("15.2.", "O descumprimento por parte do FRANQUEADO, de qualquer obrigação prevista neste contrato, em especial na cláusula 9 e seguintes, permitirá que a FRANQUEADORA, a seu exclusivo critério, envie notificação formal estabelecendo um prazo para a regularização da pendência. Caso a irregularidade não seja sanada dentro do prazo estipulado, a FRANQUEADORA poderá aplicar multa de R$ 2.500,00 (dois mil e quinhentos reais) por cada item descumprido, concedendo um novo prazo para a regularização da falha como medida alternativa à rescisão imediata do presente contrato."),
    c("15.2.1.", "Caso a multa aplicada, descrita na cláusula imediatamente acima, não seja paga e/ou a irregularidade não seja sanada no prazo de 72 (setenta e duas) horas após o vencimento do prazo adicional concedido, a FRANQUEADORA poderá optar pela rescisão imediata do contrato."),
    c("15.2.2.", "Na hipótese de reincidência, a FRANQUEADORA poderá, a seu exclusivo critério, optar por rescindir imediatamente o contrato de franquia; ou aplicar uma multa no valor de R$ 7.500,00 (sete mil e quinhentos reais) para cada item descumprido de forma reincidente."),

    t("16. EFEITOS DA RESCISÃO CONTRATUAL"),
    c("16.1.", `Ocorrendo a rescisão contratual, independentemente do motivo e da responsabilidade de cada Parte, deverão ser observadas as seguintes determinações: a) Todas as obrigações financeiras do FRANQUEADO para com a FRANQUEADORA e seus fornecedores homologados serão imediatamente antecipadas para vencimento imediato e deverão ser pagas pelo FRANQUEADO; b) O FRANQUEADO perderá, de forma imediata, qualquer direito decorrente deste Contrato, devendo cessar o uso da marca, de quaisquer sinais distintivos e interromper a comercialização dos serviços e produtos; c) No prazo máximo de 5 (cinco) dias, o FRANQUEADO deverá devolver à FRANQUEADORA todos os documentos, materiais e credenciais de acesso aos Manuais fornecidos durante a vigência contratual, ficando responsável por manter sigilo absoluto sobre qualquer informação ou particularidade do Sistema de Franquias; d) Deverá ser providenciada, às custas do FRANQUEADO e no prazo impreterível de 5 (cinco) dias, a descaracterização total da unidade franqueada, removendo qualquer elemento visual ou estrutural que a vincule à marca franqueada. O não cumprimento desta obrigação sujeitará o FRANQUEADO ao pagamento de multa diária de R$ 1.000,00 (mil reais) por dia de atraso; e) O FRANQUEADO deverá conceder à FRANQUEADORA o direito de preferência na aquisição da Unidade Franqueada, incluindo o ponto comercial, equipamentos e estoque, conforme os termos estabelecidos neste Contrato; f) A FRANQUEADORA ficará imediatamente autorizada a conceder novas franquias dentro do território a outros interessados, sem qualquer restrição. g) O FRANQUEADO deverá devolver à FRANQUEADORA todos os logins e senhas das mídias sociais utilizadas ao longo da performance contratual, bem como a lista de clientes e demais informações pertinentes da operação, sob pena de incorrer no pagamento da multa constante na cláusula 17.3.`),

    t("17. CONFIDENCIALIDADE E NÃO CONCORRÊNCIA"),
    c("17.1.", "Todas as informações, documentos, dados e materiais fornecidos por qualquer das partes em decorrência deste instrumento serão considerados estritamente confidenciais. Nenhuma das partes poderá divulgar, utilizar ou repassar, total ou parcialmente, essas informações a terceiros sem o prévio e expresso consentimento da outra parte, exceto quando exigido por lei ou ordem judicial. O descumprimento desta obrigação acarretará a responsabilização da parte infratora por eventuais danos e prejuízos causados, além da aplicação da multa prevista na cláusula abaixo, sendo esta obrigação aplicável durante a vigência do contrato e pelo período de 24 (vinte e quatro) meses após sua rescisão ou término, independente do motivo."),
    c("17.2.", "O FRANQUEADO compromete-se, por si, seus sócios, cônjuge, familiares ascendentes, descendentes e colaterais, representantes e colaboradores, tanto durante a vigência deste Contrato quanto após sua rescisão ou término, a preservar absoluta confidencialidade sobre o conteúdo dos Manuais, bem como sobre qualquer informação ou orientação recebida em decorrência da relação de franquia, por se tratar de segredo comercial da FRANQUEADORA. O descumprimento dessa obrigação poderá resultar na rescisão imediata do presente Contrato por justa causa, além da aplicação de multa no valor de R$ 150.000,00 (cento e cinquenta mil reais), devidamente corrigida desde a assinatura do Contrato até a data do pagamento, conforme a variação positiva do IGP-M/FGV. Essa penalidade não exclui a possibilidade de a parte lesada buscar, por meio judicial, a reparação de eventuais danos que superem o montante da multa estipulada."),
    c("17.3.", "O FRANQUEADO obriga-se a não atuar, direta ou indiretamente, em negócios concorrentes à atividade desenvolvida pela FRANQUEADORA, seja por meio próprio, de seus sócios, cônjuge, familiares diretos — ascendentes, descendentes e colaterais, prepostos ou administradores. Essa restrição se aplica tanto durante a vigência deste Contrato quanto pelo período de 24 (vinte e quatro) meses após sua rescisão ou término, independente do motivo, no estado onde atuava e em um raio de 150 (cento e cinquenta) quilômetros da unidade franqueada. O descumprimento dessa cláusula sujeitará o infrator ao pagamento de uma multa equivalente a R$ 300.000,00 (trezentos mil reais), devidamente corrigida desde a assinatura do Contrato até a data do pagamento, conforme a variação positiva do IGP-M/FGV, sem prejuízo de a parte prejudicada adotar as medidas legais cabíveis para reparação de eventuais prejuízos adicionais."),
    c("17.3.1.", "Para fins da cláusula imediatamente acima, considera-se concorrente qualquer atividade comercial que envolva a produção e comercialização de todos os produtos e serviços relacionados ao segmento em que a FRANQUEADORA e as unidades franqueadas atuam."),
    c("17.3.2.", "Para fins da aplicação da cláusula de não concorrência, o know-how da FRANQUEADORA está constante em todos os instrumentos jurídicos celebrados, treinamentos concedidos ao FRANQUEADO, manuais, comunicados e demais documentos concedidos ao FRANQUEADO, estando nesse conjunto de informações todo o segredo do negócio da FRANQUEADORA, o qual é protegido pela referida cláusula de não concorrência."),
    c("17.3.3.", "Caso o FRANQUEADO descumpra a cláusula de não concorrência, desde já o FRANQUEADO concorda que tal prática será uma concorrência desleal e aceita que será aplicada multa diária de pelo menos R$ 5.000,00 (cinco mil reais) por dia — a ser cobrada extrajudicialmente ou judicialmente (tutela inaudita altera pars), cuja multa não se confunde com o pagamento da multa descrita na cláusula 17.3."),

    t("18. SEGURO"),
    c("18.1.", "A EMPRESA FRANQUEADA se compromete a contratar e manter vigente, durante toda a vigência deste contrato, seguro adequado à unidade franqueada, cobrindo riscos de roubo, furto, incêndio, raio, explosão, danos elétricos, entre outros, bem como responsabilidade civil por danos materiais e morais causados a terceiros. O seguro deverá também cobrir o estoque a preço de custo, a estrutura física da loja, e as obrigações relativas ao imóvel locado, incluindo eventuais exigências do locador, proprietário, comodante e da própria FRANQUEADORA."),

    t("19. PROTEÇÃO DE DADOS PESSOAIS"),
    c("19.1.", "As partes declaram, por este instrumento, que envidam seus melhores esforços no cumprimento da legislação aplicável sobre privacidade e proteção de dados, incluindo, mas não se limitando, à Constituição Federal, ao Código de Defesa do Consumidor, ao Código Civil, às Leis e Regulamentos Europeus de Proteção de Dados, sempre que aplicáveis, ao Marco Civil da Internet (Lei Federal n.º 12.965/14) e seu decreto regulamentador (Decreto n.º 8.771/16), à Lei Geral de Proteção de Dados (Lei n.º 13.709/18), Lei anticorrupção e às demais normas setoriais ou regras sobre o assunto, assegurando a observância do disposto no conjunto normativo aplicável por seus colaboradores e prestadores de serviços que venham a ter acesso aos dados pessoais relacionados a este Contrato."),
    c("19.2.", "Caso ocorra qualquer incidente que resulte em perda, exclusão, divulgação indevida ou acesso não autorizado às informações tratadas no âmbito deste Contrato de Franquia, o FRANQUEADO deverá notificar a FRANQUEADORA de forma imediata, fornecendo detalhes completos sobre o ocorrido. A comunicação deve incluir: (i) descrição do incidente, especificando data, horário e local; (ii) identificação dos dados comprometidos e sua respectiva quantidade; e (iii) relação dos titulares afetados pelo incidente."),
    c("19.3.", "As Partes deverão manter um programa de governança e segurança de Dados Pessoais, abrangendo medidas técnicas e administrativas para garantir a integridade, confidencialidade e disponibilidade dos Dados Pessoais, além de assegurar conformidade com a LGPD e normas relacionadas."),
    c("19.4.", "As Partes atuarão como processadoras de Dados Pessoais exclusivamente conforme as instruções documentadas da controladora, previstas neste Contrato e em seus anexos, sendo vedadas alterações ou complementações sem o consentimento por escrito de ambas as Partes."),
    c("19.5.", "É vedado a qualquer Parte, sem aprovação prévia e por escrito da outra: Licenciar, autorizar, transferir, compartilhar, ceder, vender ou contratar terceiros para tratar Dados Pessoais relacionados a este Contrato de Franquia."),

    t("20. DISPOSIÇÕES FINAIS"),
    c("20.1.", "Caso sejam ajuizados procedimentos judiciais contra a EMPRESA FRANQUEADA por terceiros, esta se compromete a notificar a FRANQUEADORA de forma imediata, informando todos os detalhes do processo."),
    c("20.2.", "Na hipótese de a FRANQUEADORA ser diretamente acionada por terceiros em decorrência de ato ou fato praticado pela EMPRESA FRANQUEADA, a EMPRESA FRANQUEADA se compromete, desde já, a intervir no processo, assumindo integralmente o litígio, mediante notificação da FRANQUEADORA por qualquer meio, isentando a FRANQUEADORA de qualquer responsabilidade. Caso a FRANQUEADORA venha a ser condenada, a EMPRESA FRANQUEADA deverá ressarci-la integralmente no prazo máximo de 02 (dois) dias úteis a contar do desembolso."),
    c("20.3.", "A relação entre FRANQUEADORA e FRANQUEADO é estritamente comercial e contratual, não existindo qualquer vínculo empregatício entre a FRANQUEADORA e o FRANQUEADO, seus sócios, prepostos ou colaboradores. Cada parte é independente e integralmente responsável pelos encargos e obrigações decorrentes da gestão do seu próprio negócio, incluindo eventuais prejuízos ou danos causados por seus funcionários durante a execução de suas atividades, bem como por quaisquer demandas judiciais decorrentes da administração da unidade franqueada."),
    c("20.3.1.", "A EMPRESA FRANQUEADA será responsável pela contratação direta de toda a mão de obra necessária ao desempenho de suas atividades, comprometendo-se a selecionar apenas profissionais de idoneidade comprovada e com qualificação adequada, conforme as orientações estabelecidas nos manuais."),
    c("20.3.2.", "A EMPRESA FRANQUEADA assumirá integralmente a responsabilidade pela gestão de seus funcionários, abrangendo a admissão, controle e desligamento, em estrita observância às disposições legais aplicáveis, o que inclui o respeito aos pisos salariais das categorias profissionais."),
    c("20.3.3.", "A EMPRESA FRANQUEADA será responsável direta pelo treinamento, gestão, supervisão e controle de seus funcionários, tomando as medidas necessárias, como advertências ou substituições, para manter a qualidade e eficiência das operações, bem como para que seus funcionários atuem seguindo os padrões passados nos treinamentos e manuais."),
    c("20.4.", "É vedada a troca de produtos entre diferentes unidades da Rede de Franquias sem a autorização expressa da FRANQUEADORA."),
    c("20.5.", "A FRANQUEADORA terá exclusividade na exploração de sistemas de entregas (delivery), vendas pela internet (marketplace e e-commerce) e vendas corporativas."),
    c("20.6.", "Este Contrato somente poderá ser alterado mediante termo aditivo, devidamente assinado por ambas as partes. Eventuais liberalidades concedidas pela FRANQUEADORA à FRANQUEADA não caracterizarão novação ou alteração contratual."),
    c("20.6.1.", "Cada disposição deste Contrato será considerada como um acordo independente entre as partes. Caso qualquer disposição venha a ser declarada inválida, as demais cláusulas permanecerão em pleno vigor e efeito."),
    c("20.6.2.", "Os termos e condições deste Contrato são irrevogáveis e irretratáveis, vinculando as partes, seus representantes legais, sucessores, herdeiros e cessionários."),
    c("20.7.", "Todas as notificações e comunicações previstas neste Contrato deverão ser realizadas por escrito e serão consideradas válidas quando enviadas por carta registrada ou telegrama com aviso de recebimento."),
    c("20.8.", "Este Contrato constitui o acordo completo e integral entre as partes, substituindo quaisquer entendimentos ou negociações anteriores, sejam elas verbais ou escritas."),
    c("20.8.1.", "As partes reconhecem como manifestamente proporcionais as prestações a serem assumidas pelas partes durante a vigência do presente Contrato de Franquia e concordam com os termos deste Contrato."),
    c("20.9.", "O FRANQUEADO declara, de forma expressa, que não recebeu qualquer promessa ou garantia, seja explícita ou implícita, da FRANQUEADORA, seus administradores, diretores, acionistas, colaboradores ou representantes, em relação a faturamento, rentabilidade ou êxito do negócio, assumindo integralmente os riscos inerentes à operação da franquia."),
    c("20.9.1.", "O FRANQUEADO atesta que recebeu, analisou e concordou com a Circular de Oferta de Franquia disponibilizada pela FRANQUEADORA."),
    c("20.10.", "Eventuais anexos constituem parte vinculante do presente Contrato de Franquia. A FRANQUEADORA poderá alterá-los livremente, desde que notifique previamente a EMPRESA FRANQUEADA por escrito."),
    c("20.11.", "A EMPRESA FRANQUEADA, por si e seus sócios, compromete-se a arcar integralmente com todos os tributos de sua responsabilidade que incidam ou venham a incidir sobre as atividades realizadas no âmbito deste contrato, incluindo tributos de natureza federal, estadual e municipal."),
    c("20.12.", "A FRANQUEADORA poderá ceder sua posição contratual ou alterar seu quadro societário a qualquer tempo, sem a necessidade de aprovação do FRANQUEADO e sem gerar qualquer tipo de indenização ao FRANQUEADO."),
    c("20.12.1.", "Caso a FRANQUEADORA ceda a sua posição contratual, o FRANQUEADO deverá celebrar aditivo contratual para tanto, sendo que a sua recusa ensejará a rescisão contratual por sua culpa exclusiva, o que enseja a aplicação das penalidades previstas neste Contrato, bem como as obrigações pós-contratuais."),
    c("20.13.", "As Partes reconhecem expressamente a veracidade, autenticidade, integridade, validade e eficácia deste instrumento formado em meio digital, e concordam em utilizar e reconhecer como manifestação válida de suas anuências as assinaturas em formato digital, por meio do certificado digital, regulamentado na Medida Provisória 2.200-2/2001 (que institui a Infraestrutura de Chaves Públicas Brasileira — ICP — Brasil) ou, ainda, por meio de plataformas de assinaturas eletrônicas, tais como D4Sign (www.d4sign.com.br) e GOV.BR."),
    c("20.14.", "As Partes elegem, de comum acordo, o foro da Comarca de Boa Vista/RR, como o único competente para dirimir qualquer dúvida ou demanda judicial a respeito do Contrato, com expressa renúncia a qualquer outro, por mais privilegiado que seja."),
  ];
}

function gerarDocx(d: Record<string, string>): Promise<Uint8Array> {
  const W1 = 3300, W2 = 6050;

  const primeiraUnidade = d.primeira_unidade !== "false";

  const taxaBloco = primeiraUnidade
    ? `${d.taxa_franquia || "R$ 25.900,00 (vinte e cinco mil e novecentos reais)"}, de acordo com o modelo de franquia contratado, quitada no ato da assinatura do pré-contrato de franquia.`
    : `${d.taxa_franquia || "R$ 25.900,00 (vinte e cinco mil e novecentos reais)"}, de acordo com o modelo de franquia contratado, a ser quitada no ato da assinatura deste Contrato de Franquia.`;

  const clausula104 = primeiraUnidade
    ? "A EMPRESA FRANQUEADA realizou o pagamento da Taxa Inicial de Franquia, conforme descrito no QR, por meio de transferência bancária ou outro meio formalmente indicado pela FRANQUEADORA. A referida taxa é paga como remuneração por conta de todas as concessões feitas pela FRANQUEADORA e descritas ao longo do presente Contrato de Franquia, bem como pelo acesso aos manuais, oferecimento dos serviços e produtos da FRANQUEADORA."
    : "A EMPRESA FRANQUEADA deverá realizar o pagamento da Taxa Inicial de Franquia, conforme descrito no QR, no ato da assinatura deste Contrato de Franquia, por meio de transferência bancária ou outro meio formalmente indicado pela FRANQUEADORA, tendo em vista se tratar de unidade adicional do mesmo FRANQUEADO, sem pré-contrato de franquia precedente. A referida taxa é paga como remuneração por conta de todas as concessões feitas pela FRANQUEADORA e descritas ao longo do presente Contrato de Franquia, bem como pelo acesso aos manuais, oferecimento dos serviços e produtos da FRANQUEADORA.";

  const entries = buildEntries({ ...d, clausula104 });

  const qrRows = [
    ["Endereço da Unidade Franqueada", d.empresa_endereco || "_________________"],
    ["Vigência Contratual", "O presente Contrato terá vigência de 5 (cinco) anos, contados a partir da data de sua assinatura."],
    ["Data da inauguração", d.data_inauguracao || "_________________"],
    ["Data de Assinatura da COF", d.data_assinatura_cof || "_________________"],
    ["Modalidade da Franquia", d.modalidade || "_________________"],
    ["Taxa Inicial de Franquia", taxaBloco],
    ["Taxa Mensal", "Não é o caso."],
    ["Royalties", "6% (seis por cento) sobre o faturamento bruto mensal da unidade franqueada."],
    ["Investimento mínimo em marketing local", "R$ 1.800,00 (mil e oitocentos reais) mensais, comprovados por meio de notas fiscais."],
    ["Reajuste", "Qualquer quantia devida em decorrência deste Contrato deverá ser corrigida monetariamente de acordo com a variação positiva do índice IGP-M, publicado pela Fundação Getúlio Vargas, ou de outro índice que venha a substituí-lo, na menor periodicidade permitida em lei."],
    ["Taxa de Transferência", "R$ 25.000,00 (vinte e cinco mil reais)."],
    ["Taxa de Renovação", "Equivalente ao valor da Taxa Inicial de Franquia vigente no momento da renovação."],
    ["Penalidades no caso de atraso", "Juros de mora de 1% (um por cento) ao mês; multa moratória convencional de 10% (dez por cento) sobre o valor devido; honorários advocatícios de 20% (vinte por cento) sobre o valor atualizado, se for necessário contratar advogado para cobrá-lo."],
    ["Multa Rescisória", "R$ 60.000,00 (sessenta mil reais)."],
    ["Outras Condições", d.outras_condicoes?.trim() || "Não é o caso."],
  ].map(([l, v]) => new TableRow({ children: [labelCell(l, W1), valueCell(v, W2)] }));

  const partesRows = [
    new TableRow({ children: [new TableCell({
      width: { size: W1 + W2, type: WidthType.DXA }, borders: noBorder,
      margins: { top: 120, bottom: 120, left: 120, right: 120 },
      children: [new Paragraph({ children: [
        new TextRun({ text: "LAVOURA LAVANDERIA FRANCHISE LTDA.", bold: true, size: 20, font: FONT }),
        new TextRun({ text: `, pessoa jurídica de direito privado e de natureza limitada, com sede na Av. Mario Homem de Melo, nº 3143, Anexo 2, Liberdade, Boa Vista/RR, CEP 69.309-010, inscrita no CNPJ sob o nº 63.586.665/0001-49, representada conforme seu Contrato Social, doravante simplesmente denominada "FRANQUEADORA";`, size: 20, font: FONT }),
      ]})],
    })]}),
    new TableRow({ children: [new TableCell({
      width: { size: W1 + W2, type: WidthType.DXA }, borders: noBorder,
      margins: { top: 120, bottom: 120, left: 120, right: 120 },
      children: [new Paragraph({ children: [
        new TextRun({ text: "EMPRESA FRANQUEADA: ", bold: true, size: 20, font: FONT }),
        new TextRun({ text: d.empresa_razao_social || "XXXXXX", bold: true, size: 20, font: FONT }),
        new TextRun({ text: `, inscrita no CNPJ sob o nº ${d.empresa_cnpj || "XXXXX"}, com sede em ${d.empresa_endereco || "XXXXX"}, doravante simplesmente denominada "EMPRESA FRANQUEADA";`, size: 20, font: FONT }),
      ]})],
    })]}),
    new TableRow({ children: [new TableCell({
      width: { size: W1 + W2, type: WidthType.DXA }, borders: noBorder,
      margins: { top: 120, bottom: 120, left: 120, right: 120 },
      children: [new Paragraph({ children: [
        new TextRun({ text: "FRANQUEADO: ", bold: true, size: 20, font: FONT }),
        new TextRun({ text: d.franqueado_nome || "XXXXXX", bold: true, size: 20, font: FONT }),
        new TextRun({ text: `, ${d.franqueado_nacionalidade || "brasileiro(a)"}, ${d.franqueado_estado_civil || "XXXXX"}, ${d.franqueado_profissao || "XXXXX"}, portador(a) da Cédula de Identidade RG nº ${d.franqueado_rg || "XXXXX"}, inscrito(a) no CPF/MF sob o nº ${d.franqueado_cpf || "XXXXX"}, residente e domiciliado(a) em ${d.franqueado_endereco || "XXXXX"}, doravante simplesmente denominado(a) "FRANQUEADO";`, size: 20, font: FONT }),
      ]})],
    })]}),
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
        children: [new TextRun({ text: "CONTRATO DE FRANQUIA EMPRESARIAL LAVOURA LAVANDERIA", size: 16, font: FONT })],
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
        titleLine("CONTRATO DE FRANQUIA EMPRESARIAL — LAVOURA LAVANDERIA"),
        titleLine(`UNIDADE DE ${d.cidade || "[CIDADE]"}: TERRITÓRIO ${d.nome_territorio || "[TERRITÓRIO]"}`, { size: 22 }),
        titleLine(`MODALIDADE: ${d.modalidade || "[MODALIDADE]"}`, { size: 20 }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 160 },
          children: [new TextRun({ text: "(Proibida a reprodução total ou parcial deste documento)", italics: true, size: 18, font: FONT })],
        }),
        sectionTitle("DAS PARTES"),
        new Table({ width: { size: W1 + W2, type: WidthType.DXA }, columnWidths: [W1 + W2], rows: partesRows }),
        new Paragraph({ text: "", spacing: { after: 160 } }),
        body("Para fins do presente contrato, FRANQUEADO e EMPRESA FRANQUEADA terão as mesmas responsabilidades contratuais."),
        body("Por fim, o(s) FRANQUEADO(S) será(ão) garantidor(es) solidário(s) a todas as obrigações do presente contrato, em conjunto com a EMPRESA FRANQUEADA."),
        new Paragraph({ text: "", spacing: { after: 100 } }),
        sectionTitle("QUADRO RESUMO (QR)"),
        new Table({ width: { size: W1 + W2, type: WidthType.DXA }, columnWidths: [W1, W2], rows: qrRows }),
        new Paragraph({ text: "", spacing: { after: 200 } }),
        sectionTitle("CONSIDERAÇÕES INICIAIS"),
        bullet("A FRANQUEADORA atua no ramo de lavanderia de autosserviço, cujo negócio principal é a operação de estabelecimentos comerciais voltados para a prestação de serviços de lavagem e secagem de roupas e edredons, oferecendo também coworking, cafeteria e serviços complementares que proporcionam praticidade, conforto e otimização do tempo dos clientes;"),
        bullet("A FRANQUEADORA desenvolveu um sistema padronizado e uniforme para a instalação, gestão e operação de unidades franqueadas destinadas à comercialização dos serviços e produtos, denominado Sistema de Franquias, o qual garante a padronização e qualidade das operações sob a supervisão direta da FRANQUEADORA;"),
        bullet("A FRANQUEADORA é uma empresa devidamente autorizada a utilizar e conceder a terceiros o uso da marca objeto deste contrato de franquia (939387573, NCL(12) 44), reconhecida pela excelência no mercado consumidor;"),
        bullet("O FRANQUEADO declara ter pleno conhecimento da Lei nº 13.966/2019, que disciplina o sistema de franquias empresariais (franchising) no Brasil. Além disso, afirma ter recebido e analisado atentamente a Circular de Oferta de Franquia fornecida pela FRANQUEADORA, na qual constam, de forma clara e detalhada, todas as informações exigidas pela legislação. O FRANQUEADO reconhece que compreendeu integralmente tais informações, tendo verificado que elas estão alinhadas com seus interesses;"),
        bullet("O FRANQUEADO reconhece que todo negócio, por mais estruturado e consolidado que seja, está sujeito a riscos. Em um contrato de franquia, não existe qualquer tipo de promessa de resultados, desempenho financeiro, faturamento ou retorno do investimento;"),
        bullet("O FRANQUEADO compreende que, embora a FRANQUEADORA possa oferecer suporte na busca e avaliação do ponto comercial, a decisão final sobre a escolha do local de operação é de exclusiva responsabilidade da EMPRESA FRANQUEADA;"),
        bullet("O FRANQUEADO reconhece que a assinatura do presente contrato não lhe confere exclusividade sobre todos os canais de venda dos serviços e produtos da marca, que podem ser comercializados diretamente pela FRANQUEADORA, por parceiros ou Licenciados, em unidades próprias, franquias, coworking, cafeterias, lavanderias de autosserviço e demais canais de prestação de serviços autorizados pela Franqueadora;"),
        bullet("As partes reconhecem que a realização dos objetivos compartilhados exige uma relação bem estruturada, equilibrada e eficiente, pautada em regras claras que assegurem segurança jurídica e previsibilidade no desenvolvimento das atividades contratadas. Dessa forma, buscam promover a evolução produtiva empresarial, fundamentada nos princípios da boa-fé e da equidade, visando benefícios recíprocos."),
        body("Resolvem as partes, de mútuo e comum acordo, celebrar o presente contrato de franquia, que se regerá pelas cláusulas e condições a seguir:"),
        ...entries.map((e) => e.kind === "title" ? sectionTitle(e.text) : clause(e.num, e.text)),
        new Paragraph({ text: "", spacing: { after: 100 } }),
        body("E por estarem assim justas e contratadas, as partes firmam o presente instrumento em 02 (duas) vias de igual forma e teor, juntamente com duas testemunhas abaixo identificadas."),
        body(dataAssinatura),
        new Paragraph({ text: "", spacing: { after: 200 } }),
        body("LAVOURA LAVANDERIA FRANCHISE LTDA. — FRANQUEADORA. Assinatura: ______________________________________"),
        new Paragraph({ text: "", spacing: { after: 200 } }),
        body(`${d.empresa_razao_social || "______________________"} — EMPRESA FRANQUEADA. Assinatura: ______________________________________`),
        new Paragraph({ text: "", spacing: { after: 200 } }),
        body(`${d.franqueado_nome || "______________________"} — FRANQUEADO. Assinatura: ______________________________________`),
        new Paragraph({ text: "", spacing: { after: 200 } }),
        new Paragraph({
          spacing: { after: 160 },
          children: [
            new TextRun({ text: "TESTEMUNHAS:", size: 21, font: FONT }),
            new TextRun({
              text: `Nome: ${d.testemunha1_nome || "____________________"}  CPF: ${d.testemunha1_cpf || "____________________"}.`,
              size: 21,
              font: FONT,
              break: 7,
            }),
            new TextRun({
              text: `Nome: ${d.testemunha2_nome || "____________________"}  CPF: ${d.testemunha2_cpf || "____________________"}`,
              size: 21,
              font: FONT,
              break: 7,
            }),
          ],
        }),
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

    let dadosFormatados = dados;
    if (ANTHROPIC_KEY) {
      const prompt = `Formate os dados abaixo para um Contrato de Franquia. Retorne APENAS JSON válido, sem texto adicional.
Nome do franqueado e razão social: coloque em maiúsculas
CPF/CNPJ: formato padrão (000.000.000-00 / 00.000.000/0000-00)
Outros campos: mantenha como estão, sem inventar informação nova.

JSON de saída:
{"cidade":"","nome_territorio":"","modalidade":"","empresa_razao_social":"","empresa_cnpj":"","empresa_endereco":"","franqueado_nome":"","franqueado_nacionalidade":"","franqueado_estado_civil":"","franqueado_profissao":"","franqueado_rg":"","franqueado_cpf":"","franqueado_endereco":"","data_inauguracao":"","data_assinatura_cof":"","taxa_franquia":"","primeira_unidade":"","outras_condicoes":"","data_assinatura_dia":"","data_assinatura_mes":"","data_assinatura_ano":"","testemunha1_nome":"","testemunha1_cpf":"","testemunha2_nome":"","testemunha2_cpf":""}

Dados de entrada: ${JSON.stringify(dados)}`;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30_000);
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 1500, messages: [{ role: "user", content: prompt }] }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const res = await r.json();
        const text = res.content?.[0]?.text ?? "";
        const clean = text.replace(/```json|```/g, "").trim();
        dadosFormatados = { ...dados, ...JSON.parse(clean) };
      } catch { /* usa dados originais */ }
    }

    const buffer = await gerarDocx(dadosFormatados);
    const base64 = btoa(String.fromCharCode(...buffer));

    return new Response(JSON.stringify({ ok: true, docx: base64, nome: dadosFormatados.empresa_razao_social || dadosFormatados.franqueado_nome }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro inesperado." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
