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
import { FileText, Download, Lock, Truck } from "lucide-react";
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
