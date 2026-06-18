import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, FileText, Eye, Upload, Link2, Image, Pencil, BookOpen, Copy } from "lucide-react";
import { ObraFotoImg } from "@/components/ObraFotoImg";

export const Route = createFileRoute("/admin/obra")({
  head: () => ({ meta: [{ title: "Obra — Lavoura" }] }),
  component: AdminObra,
});

type Unidade = { id: string; numero: string; nome: string | null };

type ChecklistItem = {
  id: string;
  unidade_id: string;
  categoria: string;
  item: string;
  quantidade_sugerida: string | null;
  observacao: string | null;
  link_compra: string | null;
  foto_url: string | null;
  _signedUrl?: string | null;
  status: "pendente" | "comprado" | "instalado";
  ordem: number;
};

type BibliotecaItem = {
  id: string;
  categoria: string;
  item: string;
  quantidade_sugerida: string | null;
  observacao: string | null;
  link_compra: string | null;
};

type Prancha = { id: string; nome: string; storage_path: string; created_at: string };

const STATUS_LABEL: Record<ChecklistItem["status"], string> = {
  pendente: "A comprar",
  comprado: "Comprado",
  instalado: "Instalado",
};

function AdminObra() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [unidadeId, setUnidadeId] = useState<string>("");
  const [itens, setItens] = useState<ChecklistItem[]>([]);
  const [pranchas, setPranchas] = useState<Prancha[]>([]);
  const [biblioteca, setBiblioteca] = useState<BibliotecaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fotoRef = useRef<HTMLInputElement>(null);

  const [editingLink, setEditingLink] = useState<{ id: string; value: string } | null>(null);
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);

  // Biblioteca dialog
  const [showBiblioteca, setShowBiblioteca] = useState(false);
  const [buscaBiblioteca, setBuscaBiblioteca] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [adicionandoBiblioteca, setAdicionandoBiblioteca] = useState(false);

  // Importar checklist dialog
  const [showImportar, setShowImportar] = useState(false);
  const [importarDe, setImportarDe] = useState<string>("");
  const [importando, setImportando] = useState(false);

  const [novo, setNovo] = useState({
    categoria: "",
    item: "",
    quantidade_sugerida: "",
    observacao: "",
    link_compra: "",
  });

  useEffect(() => {
    supabase
      .from("unidades")
      .select("id, numero, nome")
      .order("numero")
      .then(({ data }) => setUnidades((data as Unidade[]) ?? []));

    supabase
      .from("obra_itens_biblioteca")
      .select("*")
      .order("categoria")
      .order("item")
      .then(({ data }) => setBiblioteca((data as BibliotecaItem[]) ?? []));
  }, []);

  const load = async (uid: string) => {
    setLoading(true);
    const [{ data: checklist }, { data: docs }] = await Promise.all([
      supabase.from("obra_checklist_itens").select("*").eq("unidade_id", uid).order("categoria").order("ordem"),
      supabase.from("unidade_documentos").select("id, nome, storage_path, created_at").eq("unidade_id", uid).eq("tipo", "planta_obra").eq("arquivado", false).order("created_at", { ascending: false }),
    ]);
    setItens((checklist as ChecklistItem[]) ?? []);
    setPranchas((docs as Prancha[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (unidadeId) load(unidadeId);
    else { setItens([]); setPranchas([]); }
  }, [unidadeId]);

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unidadeId) return;
    if (!novo.categoria.trim() || !novo.item.trim()) return toast.error("Informe categoria e item.");

    const ordem = itens.filter((i) => i.categoria === novo.categoria.trim()).length;
    const { data, error } = await supabase
      .from("obra_checklist_itens")
      .insert({
        unidade_id: unidadeId,
        categoria: novo.categoria.trim(),
        item: novo.item.trim(),
        quantidade_sugerida: novo.quantidade_sugerida.trim() || null,
        observacao: novo.observacao.trim() || null,
        link_compra: novo.link_compra.trim() || null,
        ordem,
      })
      .select("*")
      .single();

    if (error) return toast.error(error.message);
    setItens((prev) => [...prev, data as ChecklistItem]);
    // refresh biblioteca
    supabase.from("obra_itens_biblioteca").select("*").order("categoria").order("item")
      .then(({ data: bib }) => setBiblioteca((bib as BibliotecaItem[]) ?? []));
    setNovo((p) => ({ ...p, item: "", quantidade_sugerida: "", observacao: "", link_compra: "" }));
    toast.success("Item adicionado.");
  };

  // Adicionar da biblioteca
  const bibliotecaFiltrada = biblioteca.filter((b) => {
    const q = buscaBiblioteca.toLowerCase();
    return !q || b.categoria.toLowerCase().includes(q) || b.item.toLowerCase().includes(q);
  });

  const toggleSelecionado = (id: string) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const adicionarDaBiblioteca = async () => {
    if (!unidadeId || selecionados.size === 0) return;
    setAdicionandoBiblioteca(true);

    const itensSelecionados = biblioteca.filter((b) => selecionados.has(b.id));
    const inserts = itensSelecionados.map((b, i) => ({
      unidade_id: unidadeId,
      categoria: b.categoria,
      item: b.item,
      quantidade_sugerida: b.quantidade_sugerida,
      observacao: b.observacao,
      link_compra: b.link_compra,
      ordem: itens.filter((it) => it.categoria === b.categoria).length + i,
    }));

    const { data, error } = await supabase
      .from("obra_checklist_itens")
      .insert(inserts)
      .select("*");

    setAdicionandoBiblioteca(false);
    if (error) return toast.error(error.message);
    setItens((prev) => [...prev, ...((data as ChecklistItem[]) ?? [])]);
    setSelecionados(new Set());
    setShowBiblioteca(false);
    toast.success(`${inserts.length} item(ns) adicionado(s).`);
  };

  // Importar checklist de outra unidade
  const importarChecklist = async () => {
    if (!importarDe || !unidadeId) return;
    setImportando(true);

    const { data: origem, error: origemErr } = await supabase
      .from("obra_checklist_itens")
      .select("categoria, item, quantidade_sugerida, observacao, link_compra, ordem")
      .eq("unidade_id", importarDe);

    if (origemErr || !origem?.length) {
      setImportando(false);
      return toast.error(origemErr?.message ?? "Nenhum item encontrado na unidade selecionada.");
    }

    const inserts = origem.map((o) => ({ ...o, unidade_id: unidadeId }));
    const { data, error } = await supabase
      .from("obra_checklist_itens")
      .insert(inserts)
      .select("*");

    setImportando(false);
    if (error) return toast.error(error.message);
    setItens((prev) => {
      const existingIds = new Set(prev.map((i) => i.id));
      const novos = (data as ChecklistItem[]).filter((d) => !existingIds.has(d.id));
      return [...prev, ...novos];
    });
    setShowImportar(false);
    setImportarDe("");
    toast.success(`${inserts.length} item(ns) importado(s).`);
  };

  const updateStatus = async (id: string, status: ChecklistItem["status"]) => {
    setItens((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    const { error } = await supabase.from("obra_checklist_itens").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
  };

  const saveLink = async (id: string, link: string) => {
    const value = link.trim() || null;
    setItens((prev) => prev.map((i) => (i.id === id ? { ...i, link_compra: value } : i)));
    const { error } = await supabase.from("obra_checklist_itens").update({ link_compra: value }).eq("id", id);
    if (error) toast.error(error.message);
    setEditingLink(null);
  };

  const uploadFoto = async (id: string) => {
    const file = fotoRef.current?.files?.[0];
    if (!file) return;
    setUploadingFoto(id);

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${id}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("obra-fotos")
      .upload(path, file, { contentType: file.type || undefined, upsert: false });

    if (upErr) { setUploadingFoto(null); return toast.error(`Falha no upload: ${upErr.message}`); }

    const { error } = await supabase.from("obra_checklist_itens").update({ foto_url: path }).eq("id", id);
    setUploadingFoto(null);
    if (error) return toast.error(error.message);

    const { data: signed } = await supabase.storage.from("obra-fotos").createSignedUrl(path, 60 * 60);
    setItens((prev) => prev.map((i) => i.id === id ? { ...i, foto_url: path, _signedUrl: signed?.signedUrl ?? null } : i));
    if (fotoRef.current) fotoRef.current.value = "";
    toast.success("Foto salva.");
  };

  const removeFoto = async (id: string) => {
    const { error } = await supabase.from("obra_checklist_itens").update({ foto_url: null }).eq("id", id);
    if (error) return toast.error(error.message);
    setItens((prev) => prev.map((i) => (i.id === id ? { ...i, foto_url: null } : i)));
  };

  const removeItem = async (id: string) => {
    if (!confirm("Remover este item do checklist?")) return;
    const { error } = await supabase.from("obra_checklist_itens").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItens((prev) => prev.filter((i) => i.id !== id));
  };

  const uploadPrancha = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !unidadeId) return toast.error("Selecione um arquivo.");
    setUploading(true);
    const ext = file.name.split(".").pop() || "bin";
    const path = `${unidadeId}/planta_obra/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage.from("unidade-documentos").upload(path, file, { contentType: file.type || undefined, upsert: false });
    if (upErr) { setUploading(false); return toast.error(`Falha no upload: ${upErr.message}`); }

    const { data, error } = await supabase.from("unidade_documentos")
      .insert({ unidade_id: unidadeId, tipo: "planta_obra", nome: file.name, storage_path: path, mime_type: file.type || null, tamanho_bytes: file.size })
      .select("id, nome, storage_path, created_at").single();

    setUploading(false);
    if (error) { await supabase.storage.from("unidade-documentos").remove([path]); return toast.error(`Falha ao salvar: ${error.message}`); }
    setPranchas((prev) => [data as Prancha, ...prev]);
    if (fileRef.current) fileRef.current.value = "";
    toast.success("Planta enviada.");
  };

  const viewPrancha = async (p: Prancha) => {
    const { data, error } = await supabase.storage.from("unidade-documentos").createSignedUrl(p.storage_path, 60 * 5);
    if (!error && data) window.open(data.signedUrl, "_blank");
  };

  const removePrancha = async (p: Prancha) => {
    if (!confirm(`Excluir "${p.nome}"?`)) return;
    await supabase.storage.from("unidade-documentos").remove([p.storage_path]);
    const { error } = await supabase.from("unidade_documentos").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    setPranchas((prev) => prev.filter((d) => d.id !== p.id));
  };

  const fotoInputTrigger = (id: string) => {
    if (fotoRef.current) {
      fotoRef.current.onchange = () => uploadFoto(id);
      fotoRef.current.click();
    }
  };

  const grouped = itens.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
    (acc[item.categoria] ??= []).push(item);
    return acc;
  }, {});

  const unidadesOutras = unidades.filter((u) => u.id !== unidadeId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Obra</h1>
        <p className="text-sm text-muted-foreground">Checklist de itens e plantas do projeto por unidade.</p>
      </div>

      <input ref={fotoRef} type="file" accept="image/*" className="hidden" />

      <Card>
        <CardContent className="pt-6">
          <Label>Unidade</Label>
          <Select value={unidadeId} onValueChange={setUnidadeId}>
            <SelectTrigger className="mt-1 max-w-xs">
              <SelectValue placeholder="Selecione a unidade" />
            </SelectTrigger>
            <SelectContent>
              {unidades.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.numero}{u.nome ? ` — ${u.nome}` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {unidadeId && (
        <>
          {/* Plantas */}
          <Card>
            <CardHeader><CardTitle className="text-base">Plantas / pranchas do projeto</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Input ref={fileRef} type="file" accept="application/pdf,.pdf,image/*,.dwg,.skp" className="max-w-sm" />
                <Button onClick={uploadPrancha} disabled={uploading}>
                  <Upload className="mr-1.5 h-4 w-4" />{uploading ? "Enviando..." : "Enviar planta"}
                </Button>
              </div>
              {pranchas.length > 0 && (
                <div className="space-y-2">
                  {pranchas.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-md border border-border p-3">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">{p.nome}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => viewPrancha(p)}><Eye className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => removePrancha(p)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Checklist */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">Checklist de itens</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setSelecionados(new Set()); setShowBiblioteca(true); }}>
                    <BookOpen className="mr-1.5 h-4 w-4" /> Adicionar da biblioteca
                    {biblioteca.length > 0 && <Badge variant="secondary" className="ml-1.5">{biblioteca.length}</Badge>}
                  </Button>
                  {unidadesOutras.length > 0 && (
                    <Button size="sm" variant="outline" onClick={() => { setImportarDe(""); setShowImportar(true); }}>
                      <Copy className="mr-1.5 h-4 w-4" /> Importar de outra unidade
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={addItem} className="grid gap-3 sm:grid-cols-6">
                <Input placeholder="Categoria (ex: Hidráulica)" value={novo.categoria} onChange={(e) => setNovo((p) => ({ ...p, categoria: e.target.value }))} />
                <Input placeholder="Item" value={novo.item} onChange={(e) => setNovo((p) => ({ ...p, item: e.target.value }))} />
                <Input placeholder="Qtd. sugerida" value={novo.quantidade_sugerida} onChange={(e) => setNovo((p) => ({ ...p, quantidade_sugerida: e.target.value }))} />
                <Textarea placeholder="Observação (opcional)" value={novo.observacao} onChange={(e) => setNovo((p) => ({ ...p, observacao: e.target.value }))} className="min-h-9" />
                <Input placeholder="Link de compra (opcional)" value={novo.link_compra} onChange={(e) => setNovo((p) => ({ ...p, link_compra: e.target.value }))} />
                <Button type="submit"><Plus className="mr-1.5 h-4 w-4" /> Adicionar</Button>
              </form>

              {loading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : itens.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum item cadastrado para esta unidade ainda.</p>
              ) : (
                Object.entries(grouped).map(([categoria, lista]) => (
                  <div key={categoria}>
                    <h3 className="mb-2 text-sm font-semibold text-foreground">{categoria}</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Foto</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead>Qtd.</TableHead>
                          <TableHead>Observação</TableHead>
                          <TableHead>Link</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lista.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              {item.foto_url ? (
                                <div className="flex items-center gap-1">
                                  <ObraFotoImg path={item.foto_url} alt={item.item} className="h-10 w-10 rounded object-cover ring-1 ring-border hover:opacity-80" onClick={(url) => setPreviewFoto(url)} />
                                  <Button size="sm" variant="ghost" onClick={() => removeFoto(item.id)} title="Remover foto"><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => fotoInputTrigger(item.id)} disabled={uploadingFoto === item.id}>
                                  <Image className="mr-1 h-3.5 w-3.5" />{uploadingFoto === item.id ? "..." : "Foto"}
                                </Button>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{item.item}</TableCell>
                            <TableCell>{item.quantidade_sugerida || "—"}</TableCell>
                            <TableCell className="max-w-xs text-sm text-muted-foreground">{item.observacao || "—"}</TableCell>
                            <TableCell>
                              {editingLink?.id === item.id ? (
                                <div className="flex items-center gap-1">
                                  <Input value={editingLink.value} onChange={(e) => setEditingLink({ id: item.id, value: e.target.value })} className="h-7 w-48 text-xs" placeholder="https://..." onKeyDown={(e) => { if (e.key === "Enter") saveLink(item.id, editingLink.value); if (e.key === "Escape") setEditingLink(null); }} autoFocus />
                                  <Button size="sm" variant="ghost" onClick={() => saveLink(item.id, editingLink.value)}>✓</Button>
                                </div>
                              ) : item.link_compra ? (
                                <div className="flex items-center gap-1">
                                  <a href={item.link_compra} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline"><Link2 className="h-3.5 w-3.5" /> Ver link</a>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingLink({ id: item.id, value: item.link_compra ?? "" })}><Pencil className="h-3.5 w-3.5" /></Button>
                                </div>
                              ) : (
                                <Button size="sm" variant="ghost" onClick={() => setEditingLink({ id: item.id, value: "" })} className="text-xs text-muted-foreground">
                                  <Link2 className="mr-1 h-3.5 w-3.5" /> Adicionar
                                </Button>
                              )}
                            </TableCell>
                            <TableCell>
                              <Select value={item.status} onValueChange={(v) => updateStatus(item.id, v as ChecklistItem["status"])}>
                                <SelectTrigger className="w-36"><SelectValue>{STATUS_LABEL[item.status]}</SelectValue></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pendente">A comprar</SelectItem>
                                  <SelectItem value="comprado">Comprado</SelectItem>
                                  <SelectItem value="instalado">Instalado</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="ghost" onClick={() => removeItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Preview foto */}
      <Dialog open={!!previewFoto} onOpenChange={() => setPreviewFoto(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Foto do item</DialogTitle></DialogHeader>
          {previewFoto && <img src={previewFoto} alt="Preview" className="w-full rounded-lg object-contain" />}
        </DialogContent>
      </Dialog>

      {/* Biblioteca de itens */}
      <Dialog open={showBiblioteca} onOpenChange={setShowBiblioteca}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Biblioteca de itens</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Buscar por categoria ou item..." value={buscaBiblioteca} onChange={(e) => setBuscaBiblioteca(e.target.value)} autoFocus />
            <div className="max-h-80 overflow-y-auto rounded-md border border-border">
              {bibliotecaFiltrada.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Nenhum item encontrado.</p>
              ) : (
                <div className="divide-y divide-border">
                  {bibliotecaFiltrada.map((b) => (
                    <label key={b.id} className="flex cursor-pointer items-start gap-3 p-3 hover:bg-muted/50">
                      <Checkbox checked={selecionados.has(b.id)} onCheckedChange={() => toggleSelecionado(b.id)} className="mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{b.item}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.categoria}{b.quantidade_sugerida ? ` · ${b.quantidade_sugerida}` : ""}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{selecionados.size} selecionado(s)</span>
              <Button onClick={adicionarDaBiblioteca} disabled={selecionados.size === 0 || adicionandoBiblioteca}>
                {adicionandoBiblioteca ? "Adicionando..." : "Adicionar selecionados"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Importar checklist de outra unidade */}
      <Dialog open={showImportar} onOpenChange={setShowImportar}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Importar checklist de outra unidade</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Copiar checklist da unidade</Label>
              <Select value={importarDe} onValueChange={setImportarDe}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade de origem" />
                </SelectTrigger>
                <SelectContent>
                  {unidadesOutras.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.numero}{u.nome ? ` — ${u.nome}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">Todos os itens da unidade selecionada serão copiados para a unidade atual. Itens duplicados serão ignorados.</p>
            <Button className="w-full" onClick={importarChecklist} disabled={!importarDe || importando}>
              {importando ? "Importando..." : "Importar checklist"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
