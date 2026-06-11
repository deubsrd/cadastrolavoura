import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { isTransientDbError, withDbRetry } from "@/lib/db-retry";
import { Plus, Trash2, Users, FileText, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnidadeDocumentos } from "@/components/admin/UnidadeDocumentos";

export const Route = createFileRoute("/admin/unidades")({
  head: () => ({ meta: [{ title: "Unidades — Lavoura" }] }),
  component: AdminUnidades,
});

type Unidade = { id: string; numero: string; nome: string | null; ativo: boolean; created_at: string; endereco: string | null; cnpj: string | null };
type SocioBrief = { id: string; nome_completo: string; tipo: string; email: string; telefone: string; cpf: string };

function AdminUnidades() {
  const [rows, setRows] = useState<Unidade[]>([]);
  const [numero, setNumero] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Unidade | null>(null);
  const [socios, setSocios] = useState<SocioBrief[]>([]);
  const [loadingSocios, setLoadingSocios] = useState(false);
  const [editing, setEditing] = useState<Unidade | null>(null);
  const [editForm, setEditForm] = useState({ numero: "", nome: "", endereco: "", cnpj: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const openEdit = (u: Unidade) => {
    setEditing(u);
    setEditForm({
      numero: u.numero,
      nome: u.nome ?? "",
      endereco: u.endereco ?? "",
      cnpj: u.cnpj ?? "",
    });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || savingEdit) return;
    if (!editForm.numero.trim()) return toast.error("Informe o número.");
    setSavingEdit(true);
    const payload = {
      numero: editForm.numero.trim(),
      nome: editForm.nome.trim() || null,
      endereco: editForm.endereco.trim() || null,
      cnpj: editForm.cnpj.trim() || null,
    };
    const { data, error } = await withDbRetry(() =>
      supabase.from("unidades").update(payload).eq("id", editing.id).select("*").single()
    );
    setSavingEdit(false);
    if (error) return toast.error(isTransientDbError(error) ? "Conexão instável. Tente novamente." : error.message);
    setRows((prev) => prev.map((r) => (r.id === editing.id ? (data as Unidade) : r)).sort((a, b) => a.numero.localeCompare(b.numero)));
    setEditing(null);
    toast.success("Unidade atualizada.");
  };

  const openSocios = async (u: Unidade) => {
    setSelected(u);
    setLoadingSocios(true);
    setSocios([]);
    const { data, error } = await supabase
      .from("socios")
      .select("id, nome_completo, tipo, email, telefone, cpf")
      .eq("numero_unidade", u.numero)
      .order("nome_completo");
    setLoadingSocios(false);
    if (error) return toast.error(`Falha ao carregar sócios: ${error.message}`);
    setSocios((data ?? []) as SocioBrief[]);
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await withDbRetry(() => supabase.from("unidades").select("*").order("numero"));
    setLoading(false);
    if (error) return toast.error(`Falha ao carregar unidades: ${error.message}`);
    setRows((data ?? []) as Unidade[]);
  };
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!numero.trim()) return toast.error("Informe o número.");
    setSaving(true);
    try {
      const { data, error } = await withDbRetry(() =>
        supabase.from("unidades").insert({ numero: numero.trim(), nome: nome.trim() || null }).select("*").single(),
        2
      );
      if (error) return toast.error(isTransientDbError(error) ? "A conexão demorou demais. Tente novamente em alguns segundos." : error.message);
      setNumero(""); setNome("");
      toast.success("Unidade criada.");
      setRows((prev) => [...prev, data as Unidade].sort((a, b) => a.numero.localeCompare(b.numero)));
    } catch {
      toast.error("Não foi possível adicionar a unidade. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (u: Unidade) => {
    const { error } = await withDbRetry(() => supabase.from("unidades").update({ ativo: !u.ativo }).eq("id", u.id));
    if (error) return toast.error(isTransientDbError(error) ? "Conexão com o banco instável. Tente novamente em alguns segundos." : error.message);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta unidade?")) return;
    const { error } = await withDbRetry(() => supabase.from("unidades").delete().eq("id", id));
    if (error) return toast.error(isTransientDbError(error) ? "Conexão com o banco instável. Tente novamente em alguns segundos." : error.message);
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Unidades</h1>
        <p className="text-sm text-muted-foreground">Gerencie as unidades disponíveis para cadastro.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Nova unidade</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-[140px_1fr_auto]">
            <div className="space-y-1">
              <Label htmlFor="numero">Número</Label>
              <Input id="numero" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="001" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nome">Nome (opcional)</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Lavoura Centro" />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={saving}><Plus className="mr-2 h-4 w-4" />{saving ? "Adicionando..." : "Adicionar"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Unidades cadastradas</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Carregando...</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Nenhuma unidade.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      <button
                        type="button"
                        onClick={() => openSocios(u)}
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        {u.numero}
                      </button>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => openSocios(u)}
                        className="hover:underline"
                      >
                        {u.nome ?? "—"}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.ativo ? "default" : "secondary"}>{u.ativo ? "Ativa" : "Inativa"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openSocios(u)} title="Ver sócios">
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openSocios(u)} title="Documentos">
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(u)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggle(u)}>{u.ativo ? "Desativar" : "Ativar"}</Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(u.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Unidade {selected?.numero}</DialogTitle>
            <DialogDescription>{selected?.nome ?? "Sem nome cadastrado"}</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="socios" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="socios">Sócios</TabsTrigger>
              <TabsTrigger value="documentos">Documentos</TabsTrigger>
            </TabsList>
            <TabsContent value="socios" className="mt-4">
              {loadingSocios ? (
                <p className="p-4 text-sm text-muted-foreground">Carregando sócios...</p>
              ) : socios.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Nenhum sócio vinculado a esta unidade.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>CPF</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {socios.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.nome_completo}</TableCell>
                        <TableCell><Badge variant={s.tipo === "administrador" ? "default" : "secondary"}>{s.tipo}</Badge></TableCell>
                        <TableCell>{s.email}</TableCell>
                        <TableCell>{s.telefone}</TableCell>
                        <TableCell>{s.cpf}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
            <TabsContent value="documentos" className="mt-4">
              {selected && <UnidadeDocumentos unidadeId={selected.id} />}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar unidade</DialogTitle>
            <DialogDescription>Atualize as informações da unidade.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveEdit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
              <div className="space-y-1">
                <Label htmlFor="edit-numero">Número</Label>
                <Input id="edit-numero" value={editForm.numero} onChange={(e) => setEditForm((f) => ({ ...f, numero: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-nome">Nome</Label>
                <Input id="edit-nome" value={editForm.nome} onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Lavoura Centro" />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-cnpj">CNPJ</Label>
              <Input id="edit-cnpj" value={editForm.cnpj} onChange={(e) => setEditForm((f) => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-endereco">Endereço</Label>
              <Textarea id="edit-endereco" value={editForm.endereco} onChange={(e) => setEditForm((f) => ({ ...f, endereco: e.target.value }))} placeholder="Rua, número, bairro, cidade - UF" rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button type="submit" disabled={savingEdit}>{savingEdit ? "Salvando..." : "Salvar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

