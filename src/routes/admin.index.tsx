import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Trash2, FileText, Search, Eye, Pencil } from "lucide-react";
import { FileDown } from "lucide-react";
import jsPDF from "jspdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SocioFields, type SocioData } from "@/components/forms/SocioFields";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Franqueados — Lavoura" }] }),
  component: AdminFranqueados,
});

type SocioRow = {
  id: string;
  nome_completo: string;
  email: string;
  telefone: string;
  cpf: string;
  tipo: "administrador" | "cotista";
  numero_unidade: string;
  cidade: string;
  uf: string;
  created_at: string;
  documento_identidade_path: string | null;
  documento_cpf_path: string | null;
  data_nascimento: string | null;
  rg: string | null;
  rg_orgao: string | null;
  nacionalidade: string | null;
  estado_civil: string | null;
  logradouro: string | null;
  numero_casa: string | null;
  bairro: string | null;
  cep: string | null;
};

function AdminFranqueados() {
  const [rows, setRows] = useState<SocioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<SocioRow | null>(null);
  const [editing, setEditing] = useState<SocioRow | null>(null);
  const [editData, setEditData] = useState<SocioData | null>(null);
  const [saving, setSaving] = useState(false);
  const [unidades, setUnidades] = useState<Array<{ id: string; numero: string; nome: string | null }>>([]);
  const [editUnidade, setEditUnidade] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("socios")
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      console.error("[admin/socios] erro ao carregar:", error);
      return toast.error(`Falha ao carregar franqueados: ${error.message}`);
    }
    console.log("[admin/socios] carregados:", data?.length ?? 0);
    setRows((data ?? []) as SocioRow[]);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("unidades")
        .select("id, numero, nome")
        .order("numero", { ascending: true });
      if (error) {
        console.error("[admin/unidades] erro:", error);
        return;
      }
      setUnidades(data ?? []);
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [r.nome_completo, r.email, r.cpf, r.numero_unidade, r.cidade].some((v) =>
        (v ?? "").toLowerCase().includes(term)
      )
    );
  }, [rows, q]);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este sócio?")) return;
    const { error } = await supabase.from("socios").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Sócio excluído.");
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleDownloadDoc = async (path: string | null) => {
    if (!path) return toast.error("Documento não disponível.");
    const { data, error } = await supabase.storage.from("socio-documentos").createSignedUrl(path, 60);
    if (error || !data) return toast.error("Falha ao gerar link.");
    window.open(data.signedUrl, "_blank");
  };

  const exportSocioPDF = (r: SocioRow) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 40;
    let y = 50;

    const ensureSpace = (need: number) => {
      if (y + need > pageH - 40) {
        doc.addPage();
        y = 50;
      }
    };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Ficha do Franqueado", marginX, y);
    y += 8;
    doc.setDrawColor(57, 79, 62);
    doc.setLineWidth(1);
    doc.line(marginX, y, pageW - marginX, y);
    y += 18;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, marginX, y);
    y += 20;
    doc.setTextColor(0);

    const section = (title: string) => {
      ensureSpace(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(57, 79, 62);
      doc.text(title, marginX, y);
      y += 6;
      doc.setDrawColor(220);
      doc.line(marginX, y, pageW - marginX, y);
      y += 14;
      doc.setTextColor(0);
    };

    const field = (label: string, value: string | null | undefined) => {
      ensureSpace(28);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(110);
      doc.text(label.toUpperCase(), marginX, y);
      y += 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(20);
      const lines = doc.splitTextToSize(value || "—", pageW - marginX * 2);
      doc.text(lines, marginX, y);
      y += lines.length * 13 + 4;
    };

    section("Identificação");
    field("Nome completo", r.nome_completo);
    field("Tipo de sócio", r.tipo);
    field("Unidade", r.numero_unidade);
    field("CPF", r.cpf);
    field("RG", r.rg);
    field("Órgão expedidor", r.rg_orgao);
    field("Data de nascimento", formatDateBR(r.data_nascimento));
    field("Nacionalidade", r.nacionalidade);
    field("Estado civil", r.estado_civil);

    section("Contato");
    field("Email", r.email);
    field("Telefone", r.telefone);

    section("Endereço");
    field("CEP", r.cep);
    field("Logradouro", r.logradouro);
    field("Número", r.numero_casa);
    field("Bairro", r.bairro);
    field("Cidade", r.cidade);
    field("UF", r.uf);

    section("Cadastro");
    field("Cadastrado em", new Date(r.created_at).toLocaleString("pt-BR"));

    const slug = (r.nome_completo || "franqueado")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    doc.save(`franqueado-${slug}.pdf`);
  };

  const openEdit = (r: SocioRow) => {
    setEditing(r);
    setEditData({
      tipo: r.tipo,
      nome_completo: r.nome_completo ?? "",
      email: r.email ?? "",
      telefone: r.telefone ?? "",
      data_nascimento: r.data_nascimento ?? "",
      rg: r.rg ?? "",
      rg_orgao: r.rg_orgao ?? "",
      cpf: r.cpf ?? "",
      logradouro: r.logradouro ?? "",
      numero_casa: r.numero_casa ?? "",
      bairro: r.bairro ?? "",
      cidade: r.cidade ?? "",
      uf: r.uf ?? "",
      cep: r.cep ?? "",
      nacionalidade: r.nacionalidade ?? "",
      estado_civil: r.estado_civil ?? "",
    });
    setEditUnidade(r.numero_unidade ?? "");
  };

  const saveEdit = async () => {
    if (!editing || !editData) return;
    if (!editUnidade) {
      return toast.error("Selecione a unidade.");
    }
    setSaving(true);
    const unidadeRow = unidades.find((u) => u.numero === editUnidade);
    const updatePayload = {
      ...editData,
      numero_unidade: editUnidade,
      unidade_id: unidadeRow?.id ?? null,
    };
    const { error } = await supabase.from("socios").update(updatePayload).eq("id", editing.id);
    setSaving(false);
    if (error) return toast.error(`Falha ao salvar: ${error.message}`);
    toast.success("Dados atualizados com sucesso.");
    setRows((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...editData, numero_unidade: editUnidade } : r)));
    setEditing(null);
    setEditData(null);
  };

  const exportCSV = () => {
    const header = ["Nome", "Email", "Telefone", "CPF", "Tipo", "Unidade", "Cidade", "UF", "Cadastrado em"];
    const lines = filtered.map((r) => [
      r.nome_completo, r.email, r.telefone, r.cpf, r.tipo, r.numero_unidade, r.cidade, r.uf,
      new Date(r.created_at).toLocaleString("pt-BR"),
    ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `franqueados-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Franqueados</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} cadastro(s)</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." className="pl-8" />
          </div>
          <Button onClick={exportCSV} variant="outline"><Download className="mr-2 h-4 w-4" />Exportar CSV</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Lista de sócios</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Nenhum cadastro encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Documentos</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.nome_completo}</TableCell>
                    <TableCell><Badge variant={r.tipo === "administrador" ? "default" : "secondary"}>{r.tipo}</Badge></TableCell>
                    <TableCell>{r.numero_unidade}</TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell>{r.telefone}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleDownloadDoc(r.documento_identidade_path)} title="Identidade">
                          <FileText className="h-4 w-4" /> ID
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDownloadDoc(r.documento_cpf_path)} title="CPF">
                          <FileText className="h-4 w-4" /> CPF
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setSelected(r)} title="Ver detalhes">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => exportSocioPDF(r)} title="Baixar PDF">
                        <FileDown className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(r)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.nome_completo}</DialogTitle>
            <DialogDescription>Dados completos do franqueado</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <Section title="Identificação">
                <Field label="Tipo de sócio" value={selected.tipo} />
                <Field label="Unidade" value={selected.numero_unidade} />
                <Field label="CPF" value={selected.cpf} />
                <Field label="RG" value={selected.rg} />
                <Field label="Órgão expedidor" value={selected.rg_orgao} />
                <Field label="Data de nascimento" value={formatDateBR(selected.data_nascimento)} />
                <Field label="Nacionalidade" value={selected.nacionalidade} />
                <Field label="Estado civil" value={selected.estado_civil} />
              </Section>
              <Section title="Contato">
                <Field label="Email" value={selected.email} />
                <Field label="Telefone" value={selected.telefone} />
              </Section>
              <Section title="Endereço">
                <Field label="CEP" value={selected.cep} />
                <Field label="Logradouro" value={selected.logradouro} />
                <Field label="Número" value={selected.numero_casa} />
                <Field label="Bairro" value={selected.bairro} />
                <Field label="Cidade" value={selected.cidade} />
                <Field label="UF" value={selected.uf} />
              </Section>
              <Section title="Documentos">
                <div className="col-span-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleDownloadDoc(selected.documento_identidade_path)}>
                    <FileText className="mr-2 h-4 w-4" /> Ver Identidade (PDF)
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDownloadDoc(selected.documento_cpf_path)}>
                    <FileText className="mr-2 h-4 w-4" /> Ver CPF (PDF)
                  </Button>
                </div>
              </Section>
              <p className="text-xs text-muted-foreground">
                Cadastrado em {new Date(selected.created_at).toLocaleString("pt-BR")}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) { setEditing(null); setEditData(null); } }}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar franqueado</DialogTitle>
            <DialogDescription>Altere os dados e clique em salvar.</DialogDescription>
          </DialogHeader>
          {editData && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-unidade" className="text-sm font-medium">Unidade</Label>
                <Select value={editUnidade} onValueChange={setEditUnidade}>
                  <SelectTrigger id="edit-unidade"><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
                  <SelectContent>
                    {unidades.map((u) => (
                      <SelectItem key={u.id} value={u.numero}>
                        {u.numero}{u.nome ? ` — ${u.nome}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <SocioFields value={editData} onChange={setEditData} />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setEditing(null); setEditData(null); }} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={saveEdit} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar alterações"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-primary">{title}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}

function formatDateBR(value: string | null | undefined): string {
  if (!value) return "—";
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return value;
}