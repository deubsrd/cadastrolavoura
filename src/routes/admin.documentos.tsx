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
import { FileText, Download, Truck } from "lucide-react";
import jsPDF from "jspdf";

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
  nacionalidade: string | null;
  estado_civil: string | null;
  profissao: string | null;
};

type UnidadeInfo = {
  id: string;
  nome: string | null;
  cnpj: string | null;
  endereco: string | null;
};

// ──────────────────────────────────────────
// Gerador de .docx via Blob (client-side)
// usando a API do Claude para preencher o texto
// e a lib docx via CDN/worker para montar o arquivo
// ──────────────────────────────────────────

function AdminDocumentos() {
  const [socios, setSocios] = useState<Socio[]>([]);
  const [socioId, setSocioId] = useState("");
  const [socio, setSocio] = useState<Socio | null>(null);
  const [gerando, setGerando] = useState(false);

  const [form, setForm] = useState({
    data_recebimento_cof: "",
    area_ponto: "",
    modalidade: "3 conjuntos de máquinas",
    taxa_franquia: "R$ 25.900,00 (vinte e cinco mil e novecentos reais)",
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
  const [taxaTipo, setTaxaTipo] = useState<"padrao" | "outro">("padrao");
  const [taxaOutroValor, setTaxaOutroValor] = useState("");

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
    if (taxaTipo === "outro" && !taxaOutroValor.trim()) {
      return toast.error("Preencha o valor da taxa de franquia.");
    }
    setGerando(true);
    try {
      const dados = {
        candidato_nome: socio.nome_completo,
        candidato_rg: `${socio.rg} ${socio.rg_orgao}`,
        candidato_cpf: socio.cpf,
        candidato_endereco: `${socio.logradouro}, ${socio.numero_casa}, ${socio.bairro}, ${socio.cidade}/${socio.uf}`,
        ...form,
      };

      const { data, error } = await supabase.functions.invoke("gerar-precontrato", {
        body: dados,
      });

      if (error || !data?.docx) throw new Error(error?.message ?? "Falha ao gerar documento.");

      // Converte base64 → Blob → download .docx
      const binary = atob(data.docx);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Pré-Contrato - ${data.nome || socio.nome_completo}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Pré-contrato gerado!");
    } catch (e) {
      toast.error("Falha ao gerar o documento.");
      console.error(e);
    }
    setGerando(false);
  };

  const set = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  useEffect(() => {
    set(
      "taxa_franquia",
      taxaTipo === "padrao"
        ? "R$ 25.900,00 (vinte e cinco mil e novecentos reais)"
        : taxaOutroValor
          ? `R$ ${taxaOutroValor}`
          : "",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taxaTipo, taxaOutroValor]);

  // ──────────────────────────────────────────
  // Contrato de franquia
  // ──────────────────────────────────────────
  const [contratoSocioId, setContratoSocioId] = useState("");
  const [contratoSocio, setContratoSocio] = useState<Socio | null>(null);
  const [contratoUnidade, setContratoUnidade] = useState<UnidadeInfo | null>(null);
  const [gerandoContrato, setGerandoContrato] = useState(false);
  const [primeiraUnidade, setPrimeiraUnidade] = useState(true);

  const [contratoForm, setContratoForm] = useState({
    cidade: "Boa Vista",
    nome_territorio: "",
    modalidade: "3 conjuntos de máquinas",
    empresa_razao_social: "",
    empresa_cnpj: "",
    empresa_endereco: "",
    data_inauguracao: "",
    data_assinatura_cof: "",
    outras_condicoes: "",
    data_assinatura_dia: String(new Date().getDate()),
    data_assinatura_mes: new Date().toLocaleDateString("pt-BR", { month: "long" }),
    data_assinatura_ano: String(new Date().getFullYear()),
    testemunha1_nome: "",
    testemunha1_cpf: "",
    testemunha2_nome: "",
    testemunha2_cpf: "",
  });
  const [contratoTaxaTipo, setContratoTaxaTipo] = useState<"padrao" | "outro">("padrao");
  const [contratoTaxaOutroValor, setContratoTaxaOutroValor] = useState("");
  const setContrato = (key: string, value: string) => setContratoForm((p) => ({ ...p, [key]: value }));

  useEffect(() => {
    if (!contratoSocioId) {
      setContratoSocio(null);
      setContratoUnidade(null);
      return;
    }
    const s = socios.find((s) => s.id === contratoSocioId) ?? null;
    setContratoSocio(s);
    if (!s?.unidade_id) {
      setContratoUnidade(null);
      return;
    }
    supabase
      .from("unidades")
      .select("id, nome, cnpj, endereco")
      .eq("id", s.unidade_id)
      .maybeSingle()
      .then(({ data }) => {
        const u = (data as UnidadeInfo | null) ?? null;
        setContratoUnidade(u);
        setContrato("empresa_cnpj", u?.cnpj ?? "");
        setContrato("empresa_endereco", u?.endereco ?? "");
      });
  }, [contratoSocioId, socios]);

  const gerarContrato = async () => {
    if (!contratoSocio) return toast.error("Selecione um franqueado.");
    if (!contratoForm.empresa_razao_social.trim()) return toast.error("Preencha a razão social da empresa franqueada.");
    if (!contratoForm.empresa_cnpj.trim()) return toast.error("Preencha o CNPJ da empresa franqueada.");
    if (contratoTaxaTipo === "outro" && !contratoTaxaOutroValor.trim()) {
      return toast.error("Preencha o valor da taxa de franquia.");
    }
    setGerandoContrato(true);
    try {
      const dados = {
        franqueado_nome: contratoSocio.nome_completo,
        franqueado_nacionalidade: contratoSocio.nacionalidade || "brasileiro(a)",
        franqueado_estado_civil: contratoSocio.estado_civil || "",
        franqueado_profissao: contratoSocio.profissao || "",
        franqueado_rg: `${contratoSocio.rg} ${contratoSocio.rg_orgao}`,
        franqueado_cpf: contratoSocio.cpf,
        franqueado_endereco: `${contratoSocio.logradouro}, ${contratoSocio.numero_casa}, ${contratoSocio.bairro}, ${contratoSocio.cidade}/${contratoSocio.uf}`,
        taxa_franquia:
          contratoTaxaTipo === "padrao"
            ? "R$ 25.900,00 (vinte e cinco mil e novecentos reais)"
            : `R$ ${contratoTaxaOutroValor}`,
        primeira_unidade: String(primeiraUnidade),
        ...contratoForm,
      };

      const { data, error } = await supabase.functions.invoke("gerar-contrato", { body: dados });
      if (error || !data?.docx) throw new Error(error?.message ?? "Falha ao gerar documento.");

      const binary = atob(data.docx);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Contrato de Franquia - ${data.nome || contratoSocio.nome_completo}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Contrato de franquia gerado!");
    } catch (e) {
      toast.error("Falha ao gerar o documento.");
      console.error(e);
    }
    setGerandoContrato(false);
  };

  // ──────────────────────────────────────────
  // Anexos do Contrato (Mix de Produtos, Fornecedores Homologados, Área Territorial)
  // ──────────────────────────────────────────
  const [anexosSocioId, setAnexosSocioId] = useState("");
  const [anexosUnidadeNome, setAnexosUnidadeNome] = useState("");
  const [areaTerritorial, setAreaTerritorial] = useState("");
  const [mixProdutos, setMixProdutos] = useState("");
  const [fornecedoresHomologados, setFornecedoresHomologados] = useState("");
  const [gerandoAnexos, setGerandoAnexos] = useState(false);

  useEffect(() => {
    if (!anexosSocioId) { setAnexosUnidadeNome(""); return; }
    const s = socios.find((s) => s.id === anexosSocioId) ?? null;
    if (!s?.unidade_id) { setAnexosUnidadeNome(s?.numero_unidade ?? ""); return; }
    supabase
      .from("unidades")
      .select("nome, numero")
      .eq("id", s.unidade_id)
      .maybeSingle()
      .then(({ data }) => setAnexosUnidadeNome(data?.nome || data?.numero || s.numero_unidade || ""));
  }, [anexosSocioId, socios]);

  const gerarAnexos = async () => {
    if (!anexosSocioId) return toast.error("Selecione um franqueado/unidade.");
    setGerandoAnexos(true);
    try {
      const dados = {
        unidade_nome: anexosUnidadeNome,
        area_territorial: areaTerritorial,
        mix_produtos: mixProdutos,
        fornecedores_homologados: fornecedoresHomologados,
      };
      const { data, error } = await supabase.functions.invoke("gerar-anexos-contrato", { body: dados });
      if (error || !data?.docx) throw new Error(error?.message ?? "Falha ao gerar documento.");

      const binary = atob(data.docx);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Anexos do Contrato - ${data.nome || anexosUnidadeNome || "unidade"}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Anexos gerados!");
    } catch (e) {
      toast.error("Falha ao gerar os anexos.");
      console.error(e);
    }
    setGerandoAnexos(false);
  };

  // ──────────────────────────────────────────
  // Cotação de frete
  // ──────────────────────────────────────────
  const ORIGENS = {
    guarulhos: {
      label: "Guarulhos/SP",
      cnpj: "38.391.636/0001-84",
      cep: "07174-000",
      endereco:
        "Guarulhos/SP (matriz) – Avenida Papa João Paulo I, nº 687, Galpão 09 Bloco A, Jardim Presidente Dutra",
    },
    cabedelo: {
      label: "Cabedelo/PB",
      cnpj: "38.391.636/0001-84",
      cep: "58105-066",
      endereco: "Galpão Paylav – R. Castro Alves, 61 - Recanto do Poço, Cabedelo - PB",
    },
  } as const;

  const [origemKey, setOrigemKey] = useState<keyof typeof ORIGENS>("guarulhos");
  const [cotacaoSocioId, setCotacaoSocioId] = useState("");
  const [cotacaoSocio, setCotacaoSocio] = useState<Socio | null>(null);
  const [unidadeEndereco, setUnidadeEndereco] = useState<string | null>(null);
  const [destinoEndereco, setDestinoEndereco] = useState("");
  const [destinoCep, setDestinoCep] = useState("");
  const [conjuntos, setConjuntos] = useState<"3" | "4" | "5">("3");
  const [valorNf, setValorNf] = useState("89.970,00");
  const [gerandoCotacao, setGerandoCotacao] = useState(false);

  useEffect(() => {
    if (!cotacaoSocioId) {
      setCotacaoSocio(null);
      setUnidadeEndereco(null);
      setDestinoEndereco("");
      return;
    }
    const s = socios.find((s) => s.id === cotacaoSocioId) ?? null;
    setCotacaoSocio(s);
    if (!s?.unidade_id) {
      setUnidadeEndereco(null);
      setDestinoEndereco("");
      return;
    }
    supabase
      .from("unidades")
      .select("endereco")
      .eq("id", s.unidade_id)
      .maybeSingle()
      .then(({ data }) => {
        const endereco = data?.endereco || null;
        setUnidadeEndereco(endereco);
        setDestinoEndereco(endereco ?? "");
      });
  }, [cotacaoSocioId, socios]);

  const gerarCotacao = () => {
    if (!cotacaoSocio) return toast.error("Selecione um franqueado.");
    if (!destinoEndereco.trim()) return toast.error("Preencha o endereço de entrega.");
    if (!destinoCep.trim()) return toast.error("Preencha o CEP de destino.");

    setGerandoCotacao(true);
    try {
      const origem = ORIGENS[origemKey];
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const marginX = 40;
      let y = 50;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(57, 79, 62);
      doc.text("Cotação de Frete — Lavoura", marginX, y);
      y += 8;
      doc.setDrawColor(57, 79, 62);
      doc.setLineWidth(1);
      doc.line(marginX, y, pageW - marginX, y);
      y += 26;
      doc.setTextColor(0);

      const linha = (label: string, valor: string) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(label, marginX, y);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(valor, pageW - marginX * 2 - 140);
        doc.text(lines, marginX + 140, y);
        y += Math.max(18, lines.length * 15);
      };

      linha("Destinatário:", cotacaoSocio.nome_completo);
      linha("Item:", "Conjuntos de equipamentos LG GIANT C 13Kg");
      linha("Quantidade:", `${conjuntos} lavadoras e ${conjuntos} secadoras`);
      linha("Valor da NF:", `R$ ${valorNf}`);
      y += 10;

      const secao = (titulo: string) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(57, 79, 62);
        doc.text(titulo, marginX, y);
        y += 6;
        doc.setDrawColor(220);
        doc.line(marginX, y, pageW - marginX, y);
        y += 18;
        doc.setTextColor(0);
      };

      secao("Informações de origem");
      linha("CNPJ:", origem.cnpj);
      linha("CEP:", origem.cep);
      linha("Endereço:", origem.endereco);
      y += 10;

      secao("Informações de destino");
      linha("CPF:", cotacaoSocio.cpf);
      linha("Endereço:", destinoEndereco);
      linha("CEP:", destinoCep);
      y += 16;

      secao("Informações dos equipamentos — LG Giant C 13kg");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Equipamento", marginX, y);
      doc.text("Largura", marginX + 130, y);
      doc.text("Altura", marginX + 210, y);
      doc.text("Profund.", marginX + 280, y);
      doc.text("Peso aprox.", marginX + 360, y);
      y += 16;
      doc.setDrawColor(220);
      doc.line(marginX, y - 6, pageW - marginX, y - 6);

      doc.setFont("helvetica", "normal");
      const equipamentos = [
        ["Lavadora Giant C 13kg", "686mm", "983mm", "767mm", "87kg"],
        ["Secadora Giant C 13kg", "686mm", "983mm", "764mm", "59kg"],
      ];
      for (const [nome, l, a, p, peso] of equipamentos) {
        doc.text(nome, marginX, y);
        doc.text(l, marginX + 130, y);
        doc.text(a, marginX + 210, y);
        doc.text(p, marginX + 280, y);
        doc.text(peso, marginX + 360, y);
        y += 18;
      }
      y += 8;
      linha("Medidas da caixa:", "760 x 1.170 x 795 mm (L x A x P)");
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(120);
      const nota = doc.splitTextToSize(
        "As dimensões da lavadora e secadora são praticamente iguais em largura e altura, facilitando o empilhamento ou transporte conjunto.",
        pageW - marginX * 2,
      );
      doc.text(nota, marginX, y);

      doc.save(`Cotação de Frete (${origem.label}) - ${cotacaoSocio.nome_completo}.pdf`);
      toast.success("Cotação gerada!");
    } catch (e) {
      toast.error("Falha ao gerar a cotação.");
      console.error(e);
    }
    setGerandoCotacao(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Documentos</h1>
        <p className="text-sm text-muted-foreground">Gere documentos contratuais com dados do sistema, revisados pelo Claude.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                  <SelectItem value="4 conjuntos de máquinas">4 conjuntos de máquinas</SelectItem>
                  <SelectItem value="5 conjuntos de máquinas">5 conjuntos de máquinas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Taxa Inicial de Franquia</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={taxaTipo === "padrao" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setTaxaTipo("padrao")}
                >
                  Padrão (R$ 25.900,00)
                </Button>
                <Button
                  type="button"
                  variant={taxaTipo === "outro" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setTaxaTipo("outro")}
                >
                  Outro valor
                </Button>
              </div>
              {taxaTipo === "outro" && (
                <Input
                  className="mt-2"
                  placeholder="ex: 30.000,00 (trinta mil reais)"
                  value={taxaOutroValor}
                  onChange={(e) => setTaxaOutroValor(e.target.value)}
                />
              )}
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

        {/* Contrato de franquia */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Contrato de franquia</CardTitle>
              </div>
              <Badge variant="default">Disponível</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Contrato definitivo, entre a Franqueadora e a EMPRESA FRANQUEADA (CNPJ).</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Franqueado</Label>
              <Select value={contratoSocioId} onValueChange={setContratoSocioId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o franqueado..." />
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

            {contratoSocio && (
              <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1 text-muted-foreground">
                <p><span className="font-semibold text-foreground">CPF:</span> {contratoSocio.cpf}</p>
                <p><span className="font-semibold text-foreground">RG:</span> {contratoSocio.rg} {contratoSocio.rg_orgao}</p>
                <p><span className="font-semibold text-foreground">Nacionalidade/Estado civil:</span> {contratoSocio.nacionalidade || "—"} / {contratoSocio.estado_civil || "—"}</p>
                <p><span className="font-semibold text-foreground">Profissão:</span> {contratoSocio.profissao || "— (preencha no cadastro do sócio)"}</p>
                <p><span className="font-semibold text-foreground">Endereço:</span> {contratoSocio.logradouro}, {contratoSocio.numero_casa}, {contratoSocio.bairro}, {contratoSocio.cidade}/{contratoSocio.uf}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Esta é a 1ª unidade deste franqueado ou uma unidade adicional?</Label>
              <div className="flex gap-2">
                <Button type="button" variant={primeiraUnidade ? "default" : "outline"} className="flex-1" onClick={() => setPrimeiraUnidade(true)}>
                  1ª unidade
                </Button>
                <Button type="button" variant={!primeiraUnidade ? "default" : "outline"} className="flex-1" onClick={() => setPrimeiraUnidade(false)}>
                  Unidade adicional
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {primeiraUnidade
                  ? "Taxa Inicial de Franquia já quitada no pré-contrato."
                  : "Taxa Inicial de Franquia será quitada no ato da assinatura deste Contrato."}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Razão Social (empresa franqueada)</Label>
                <Input placeholder="ex: XYZ LAVANDERIA LTDA" value={contratoForm.empresa_razao_social} onChange={(e) => setContrato("empresa_razao_social", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>CNPJ da empresa franqueada</Label>
                <Input placeholder="00.000.000/0000-00" value={contratoForm.empresa_cnpj} onChange={(e) => setContrato("empresa_cnpj", e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Endereço da Unidade Franqueada</Label>
              <Input value={contratoForm.empresa_endereco} onChange={(e) => setContrato("empresa_endereco", e.target.value)} />
              {!contratoUnidade?.endereco && contratoSocioId && (
                <p className="text-xs text-muted-foreground">A unidade ainda não tem endereço cadastrado — preencha manualmente.</p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input value={contratoForm.cidade} onChange={(e) => setContrato("cidade", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Nome do Território</Label>
                <Input placeholder="ex: Liberdade" value={contratoForm.nome_territorio} onChange={(e) => setContrato("nome_territorio", e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Modalidade</Label>
              <Select value={contratoForm.modalidade} onValueChange={(v) => setContrato("modalidade", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3 conjuntos de máquinas">3 conjuntos de máquinas</SelectItem>
                  <SelectItem value="4 conjuntos de máquinas">4 conjuntos de máquinas</SelectItem>
                  <SelectItem value="5 conjuntos de máquinas">5 conjuntos de máquinas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Data da inauguração</Label>
                <Input placeholder="ex: 20/08/2026" value={contratoForm.data_inauguracao} onChange={(e) => setContrato("data_inauguracao", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Data de assinatura da COF</Label>
                <Input placeholder="ex: 20/08/2026" value={contratoForm.data_assinatura_cof} onChange={(e) => setContrato("data_assinatura_cof", e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Taxa Inicial de Franquia</Label>
              <div className="flex gap-2">
                <Button type="button" variant={contratoTaxaTipo === "padrao" ? "default" : "outline"} className="flex-1" onClick={() => setContratoTaxaTipo("padrao")}>
                  Padrão (R$ 25.900,00)
                </Button>
                <Button type="button" variant={contratoTaxaTipo === "outro" ? "default" : "outline"} className="flex-1" onClick={() => setContratoTaxaTipo("outro")}>
                  Outro valor
                </Button>
              </div>
              {contratoTaxaTipo === "outro" && (
                <Input className="mt-2" placeholder="ex: 30.000,00 (trinta mil reais)" value={contratoTaxaOutroValor} onChange={(e) => setContratoTaxaOutroValor(e.target.value)} />
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Outras condições <span className="text-muted-foreground">(opcional)</span></Label>
              <Input placeholder="Deixe em branco se não houver" value={contratoForm.outras_condicoes} onChange={(e) => setContrato("outras_condicoes", e.target.value)} />
            </div>

            <div className="grid gap-3 grid-cols-3">
              <div className="space-y-1.5">
                <Label>Dia</Label>
                <Input value={contratoForm.data_assinatura_dia} onChange={(e) => setContrato("data_assinatura_dia", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Mês</Label>
                <Input value={contratoForm.data_assinatura_mes} onChange={(e) => setContrato("data_assinatura_mes", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Ano</Label>
                <Input value={contratoForm.data_assinatura_ano} onChange={(e) => setContrato("data_assinatura_ano", e.target.value)} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Testemunha 1 — Nome</Label>
                <Input value={contratoForm.testemunha1_nome} onChange={(e) => setContrato("testemunha1_nome", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Testemunha 1 — CPF</Label>
                <Input value={contratoForm.testemunha1_cpf} onChange={(e) => setContrato("testemunha1_cpf", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Testemunha 2 — Nome</Label>
                <Input value={contratoForm.testemunha2_nome} onChange={(e) => setContrato("testemunha2_nome", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Testemunha 2 — CPF</Label>
                <Input value={contratoForm.testemunha2_cpf} onChange={(e) => setContrato("testemunha2_cpf", e.target.value)} />
              </div>
            </div>

            <Button className="w-full" onClick={gerarContrato} disabled={gerandoContrato || !contratoSocioId}>
              <Download className="mr-2 h-4 w-4" />
              {gerandoContrato ? "Gerando com Claude..." : "Gerar contrato de franquia"}
            </Button>
          </CardContent>
        </Card>

        {/* Anexos do Contrato */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Anexos do Contrato</CardTitle>
              </div>
              <Badge variant="default">Disponível</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Anexo I (Mix de Produtos/Serviços), Anexo II (Fornecedores Homologados) e Anexo III (Área Territorial), num .docx separado.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Franqueado / unidade</Label>
              <Select value={anexosSocioId} onValueChange={setAnexosSocioId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o franqueado..." />
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

            <div className="space-y-1.5">
              <Label>Área Territorial</Label>
              <Input
                placeholder="ex: Raio de 2km do ponto, bairro Liberdade, Boa Vista/RR"
                value={areaTerritorial}
                onChange={(e) => setAreaTerritorial(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Mix de Produtos/Serviços <span className="text-muted-foreground">(opcional — deixe em branco para usar o texto padrão remetendo ao manual)</span></Label>
              <Input value={mixProdutos} onChange={(e) => setMixProdutos(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Fornecedores Homologados <span className="text-muted-foreground">(opcional — deixe em branco para usar o texto padrão remetendo ao manual)</span></Label>
              <Input value={fornecedoresHomologados} onChange={(e) => setFornecedoresHomologados(e.target.value)} />
            </div>

            <Button className="w-full" onClick={gerarAnexos} disabled={gerandoAnexos || !anexosSocioId}>
              <Download className="mr-2 h-4 w-4" />
              {gerandoAnexos ? "Gerando..." : "Gerar anexos"}
            </Button>
          </CardContent>
        </Card>

        {/* Cotação de frete */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Cotação de frete</CardTitle>
              </div>
              <Badge variant="default">Disponível</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pedido de cotação dos conjuntos LG Giant C 13kg, saindo de Guarulhos ou Cabedelo.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Origem</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={origemKey === "guarulhos" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setOrigemKey("guarulhos")}
                >
                  Guarulhos/SP
                </Button>
                <Button
                  type="button"
                  variant={origemKey === "cabedelo" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setOrigemKey("cabedelo")}
                >
                  Cabedelo/PB
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Franqueado / destinatário</Label>
              <Select value={cotacaoSocioId} onValueChange={setCotacaoSocioId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o franqueado..." />
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

            {cotacaoSocioId && (
              <div className="space-y-1.5">
                <Label>Endereço de entrega</Label>
                <Input
                  value={destinoEndereco}
                  onChange={(e) => setDestinoEndereco(e.target.value)}
                  placeholder="Endereço completo da unidade"
                />
                {!unidadeEndereco && (
                  <p className="text-xs text-muted-foreground">
                    A unidade ainda não tem endereço cadastrado — preencha manualmente.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>CEP de destino</Label>
              <Input
                value={destinoCep}
                onChange={(e) => setDestinoCep(e.target.value)}
                placeholder="ex: 69314-550"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Conjuntos de máquinas</Label>
                <Select
                  value={conjuntos}
                  onValueChange={(v) => {
                    const val = v as "3" | "4" | "5";
                    setConjuntos(val);
                    // Sugestão proporcional ao valor de 3 conjuntos (R$89.970,00) —
                    // confirme o valor real da NF antes de gerar, isso é só ponto de partida.
                    const sugestoes: Record<"3" | "4" | "5", string> = {
                      "3": "89.970,00",
                      "4": "119.960,00",
                      "5": "149.950,00",
                    };
                    setValorNf(sugestoes[val]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 conjuntos</SelectItem>
                    <SelectItem value="4">4 conjuntos</SelectItem>
                    <SelectItem value="5">5 conjuntos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor da NF (R$)</Label>
                <Input value={valorNf} onChange={(e) => setValorNf(e.target.value)} placeholder="89.970,00" />
              </div>
            </div>

            <Button className="w-full" onClick={gerarCotacao} disabled={gerandoCotacao || !cotacaoSocioId}>
              <Download className="mr-2 h-4 w-4" />
              {gerandoCotacao ? "Gerando..." : "Gerar cotação"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
