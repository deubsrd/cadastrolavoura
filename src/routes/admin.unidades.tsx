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
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/unidades")({
  head: () => ({ meta: [{ title: "Unidades — Lavoura" }] }),
  component: AdminUnidades,
});

type Unidade = { id: string; numero: string; nome: string | null; ativo: boolean; created_at: string };

function AdminUnidades() {
  const [rows, setRows] = useState<Unidade[]>([]);
  const [numero, setNumero] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("unidades").select("*").order("numero");
    setLoading(false);
    if (error) return toast.error("Falha ao carregar unidades.");
    setRows((data ?? []) as Unidade[]);
  };
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numero.trim()) return toast.error("Informe o número.");
    const { error } = await supabase.from("unidades").insert({ numero: numero.trim(), nome: nome.trim() || null });
    if (error) return toast.error(error.message);
    setNumero(""); setNome("");
    toast.success("Unidade criada.");
    load();
  };

  const toggle = async (u: Unidade) => {
    const { error } = await supabase.from("unidades").update({ ativo: !u.ativo }).eq("id", u.id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta unidade?")) return;
    const { error } = await supabase.from("unidades").delete().eq("id", id);
    if (error) return toast.error(error.message);
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
              <Button type="submit"><Plus className="mr-2 h-4 w-4" />Adicionar</Button>
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
                    <TableCell className="font-medium">{u.numero}</TableCell>
                    <TableCell>{u.nome ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={u.ativo ? "default" : "secondary"}>{u.ativo ? "Ativa" : "Inativa"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
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
    </div>
  );
}

