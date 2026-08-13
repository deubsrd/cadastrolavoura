import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Check, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

type Gasto = {
  id: string;
  categoria: string;
  descricao: string;
  quantidade: string | null;
  valor_previsto: number | null;
  valor_pago: number | null;
  ordem: number;
};

type Props = {
  unidadeId: string;
  isAdmin?: boolean;
};

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const parseMoeda = (str: string): number | null => {
  const s = str.trim().replace(/^R\$\s*/i, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
};

export function GastosObra({ unidadeId, isAdmin = false }: Props) {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [novoItem, setNovoItem] = useState({ categoria: "", descricao: "", quantidade: "", valor_previsto: "" });
  const [adicionando, setAdicionando] = useState(false);
  // Inline editing for admin: descricao, categoria, quantidade
  const [editing, setEditing] = useState<{ id: string; field: "descricao" | "categoria" | "quantidade"; value: string } | null>(null);
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("obra_gastos")
      .select("*")
      .eq("unidade_id", unidadeId)
      .order("categoria")
      .order("ordem");

    if (error) { toast.error(error.message); setLoading(false); return; }

    if (!data?.length) {
      await supabase.rpc("popular_gastos_padrao", { p_unidade_id: unidadeId });
      const { data: after } = await supabase
        .from("obra_gastos").select("*").eq("unidade_id", unidadeId)
        .order("categoria").order("ordem");
      setGastos((after as Gasto[]) ?? []);
    } else {
      setGastos((data as Gasto[]) ?? []);
    }
    setLoading(false);
  }, [unidadeId]);

  useEffect(() => { load(); }, [load]);

  const updateField = (id: string, field: "valor_pago" | "valor_previsto", rawValue: string) => {
    const valor = parseMoeda(rawValue) ?? 0;
    setGastos((prev) => prev.map((g) => g.id === id ? { ...g, [field]: valor } : g));
    clearTimeout(debounceRef.current[id + field]);
    debounceRef.current[id + field] = setTimeout(async () => {
      setSaving(id);
      await supabase.from("obra_gastos").update({ [field]: valor }).eq("id", id);
      setSaving(null);
    }, 800);
  };

  const saveEditing = async () => {
    if (!editing) return;
    const { id, field, value } = editing;
    setGastos((prev) => prev.map((g) => g.id === id ? { ...g, [field]: value || null } : g));
    setEditing(null);
    const { error } = await supabase.from("obra_gastos").update({ [field]: value.trim() || null }).eq("id", id);
    if (error) toast.error(error.message);
  };

  const addItem = async () => {
    if (!novoItem.categoria.trim() || !novoItem.descricao.trim()) return toast.error("Informe categoria e descrição.");
    setAdicionando(true);
    const ordem = gastos.filter((g) => g.categoria === novoItem.categoria.trim()).length + 1;
    const { data, error } = await supabase
      .from("obra_gastos")
      .insert({
        unidade_id: unidadeId,
        categoria: novoItem.categoria.trim(),
        descricao: novoItem.descricao.trim(),
        quantidade: novoItem.quantidade.trim() || null,
        valor_previsto: parseMoeda(novoItem.valor_previsto),
        valor_pago: 0,
        ordem,
      })
      .select("*")
      .single();
    setAdicionando(false);
    if (error) return toast.error(error.message);
    setGastos((prev) => [...prev, data as Gasto]);
    setNovoItem((p) => ({ ...p, descricao: "", quantidade: "", valor_previsto: "" }));
    toast.success("Item adicionado.");
  };

  const removeItem = async (id: string) => {
    if (!confirm("Remover este item?")) return;
    const { error } = await supabase.from("obra_gastos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setGastos((prev) => prev.filter((g) => g.id !== id));
  };

  const grouped = gastos.reduce<Record<string, Gasto[]>>((acc, g) => {
    (acc[g.categoria] ??= []).push(g);
    return acc;
  }, {});

  const totalPago = gastos.reduce((s, g) => s + (g.valor_pago ?? 0), 0);
  const totalPrevisto = gastos.reduce((s, g) => s + (g.valor_previsto ?? 0), 0);
  const diferenca = totalPrevisto - totalPago;

  const ranking = Object.entries(grouped)
    .map(([cat, items]) => ({ cat, pago: items.reduce((s, g) => s + (g.valor_pago ?? 0), 0) }))
    .filter((r) => r.pago > 0)
    .sort((a, b) => b.pago - a.pago);
  const maxRanking = ranking[0]?.pago ?? 1;

  if (loading) return <div className="text-sm text-muted-foreground py-4">Carregando gastos...</div>;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Pago</p>
            <p className="text-xl font-bold text-foreground">R$ {fmt(totalPago)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Previsto</p>
            <p className="text-xl font-bold text-foreground">R$ {fmt(totalPrevisto)}</p>
          </CardContent>
        </Card>
        <Card className={cn("border-border/50", diferenca < 0 && "border-destructive/30 bg-destructive/5")}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Diferença</p>
            <p className={cn("text-xl font-bold", diferenca >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive")}>
              {diferenca >= 0 ? "+" : ""}R$ {fmt(diferenca)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabelas por categoria */}
      {Object.entries(grouped).map(([categoria, itens]) => {
        const subPago = itens.reduce((s, g) => s + (g.valor_pago ?? 0), 0);
        const subPrevisto = itens.reduce((s, g) => s + (g.valor_previsto ?? 0), 0);
        const subDif = subPrevisto - subPago;

        return (
          <Card key={categoria} className="border-border/50 overflow-hidden">
            <div className="bg-primary px-4 py-2.5 flex items-center justify-between gap-2">
              {isAdmin && editing?.id === `cat:${categoria}` ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editing.value}
                    onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                    className="h-7 text-sm bg-white/10 border-white/30 text-white placeholder:text-white/50"
                    onKeyDown={(e) => { if (e.key === "Enter") saveEditing(); if (e.key === "Escape") setEditing(null); }}
                    autoFocus
                  />
                  <button onClick={saveEditing} className="text-white/80 hover:text-white"><Check className="h-4 w-4" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm font-semibold text-primary-foreground">{categoria}</span>
                  {isAdmin && (
                    <button onClick={() => setEditing({ id: `cat:${categoria}`, field: "categoria", value: categoria })} className="text-white/50 hover:text-white/90">
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
              <Badge variant="secondary" className="text-xs shrink-0">
                Pago: R$ {fmt(subPago)} / Prev: R$ {fmt(subPrevisto)}
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="px-4 py-2.5 text-left font-semibold text-foreground">Descrição</th>
                    <th className="w-28 px-4 py-2.5 text-left font-semibold text-foreground">Quantidade</th>
                    <th className="w-36 px-4 py-2.5 text-right font-semibold text-foreground">Valor Pago</th>
                    {isAdmin && <th className="w-36 px-4 py-2.5 text-right font-semibold text-foreground">Previsto</th>}
                    <th className="w-28 px-4 py-2.5 text-right font-semibold text-foreground">Diferença</th>
                    {isAdmin && <th className="w-10 px-2 py-2.5"></th>}
                  </tr>
                </thead>
                <tbody>
                  {itens.map((g) => {
                    const dif = (g.valor_previsto ?? 0) - (g.valor_pago ?? 0);
                    const isEditingDescricao = editing?.id === g.id && editing?.field === "descricao";
                    const isEditingQtd = editing?.id === g.id && editing?.field === "quantidade";

                    return (
                      <tr key={g.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                        {/* Descrição */}
                        <td className="px-4 py-2.5 text-foreground">
                          {isAdmin && isEditingDescricao ? (
                            <div className="flex items-center gap-1.5">
                              <Input
                                value={editing.value}
                                onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                                className="h-7 text-sm"
                                onKeyDown={(e) => { if (e.key === "Enter") saveEditing(); if (e.key === "Escape") setEditing(null); }}
                                autoFocus
                              />
                              <button onClick={saveEditing} className="text-primary shrink-0"><Check className="h-4 w-4" /></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 group">
                              <span>{g.descricao}</span>
                              {isAdmin && (
                                <button onClick={() => setEditing({ id: g.id, field: "descricao", value: g.descricao })} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity">
                                  <Pencil className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        {/* Quantidade */}
                        <td className="px-4 py-2.5">
                          {isAdmin && isEditingQtd ? (
                            <div className="flex items-center gap-1.5">
                              <Input
                                value={editing.value}
                                onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                                className="h-7 text-sm w-24"
                                placeholder="ex: 4 un."
                                onKeyDown={(e) => { if (e.key === "Enter") saveEditing(); if (e.key === "Escape") setEditing(null); }}
                                autoFocus
                              />
                              <button onClick={saveEditing} className="text-primary shrink-0"><Check className="h-4 w-4" /></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 group">
                              <span className="text-muted-foreground text-xs">{g.quantidade ?? "—"}</span>
                              {isAdmin && (
                                <button onClick={() => setEditing({ id: g.id, field: "quantidade", value: g.quantidade ?? "" })} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity">
                                  <Pencil className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        {/* Valor Pago */}
                        <td className="px-4 py-2.5 text-right">
                          <input
                            type="text"
                            inputMode="decimal"
                            defaultValue={g.valor_pago ? fmt(g.valor_pago) : ""}
                            placeholder="0,00"
                            className="w-32 rounded border border-border bg-background px-2 py-1 text-right text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            onBlur={(e) => updateField(g.id, "valor_pago", e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                          />
                        </td>
                        {/* Previsto (admin only) */}
                        {isAdmin && (
                          <td className="px-4 py-2.5 text-right">
                            <input
                              type="text"
                              inputMode="decimal"
                              defaultValue={g.valor_previsto ? fmt(g.valor_previsto) : ""}
                              placeholder="0,00"
                              className="w-32 rounded border border-border bg-background px-2 py-1 text-right text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                              onBlur={(e) => updateField(g.id, "valor_previsto", e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                            />
                          </td>
                        )}
                        {/* Diferença */}
                        <td className="px-4 py-2.5 text-right">
                          {g.valor_previsto != null ? (
                            <span className={cn("font-semibold text-xs", dif > 0.004 ? "text-green-600 dark:text-green-400" : dif < -0.004 ? "text-destructive" : "text-muted-foreground")}>
                              {dif > 0 ? "+" : ""}R$ {fmt(dif)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        {/* Ações (admin only) */}
                        {isAdmin && (
                          <td className="px-2 py-2.5 text-center">
                            <button onClick={() => removeItem(g.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {/* Subtotal */}
                  <tr className="bg-muted/60 font-semibold border-t-2 border-border">
                    <td className="px-4 py-2 text-sm text-foreground" colSpan={2}>Subtotal</td>
                    <td className="px-4 py-2 text-right text-sm text-foreground">R$ {fmt(subPago)}</td>
                    {isAdmin && <td className="px-4 py-2 text-right text-sm text-foreground">R$ {fmt(subPrevisto)}</td>}
                    <td className="px-4 py-2 text-right text-xs">
                      <span className={cn("font-semibold", subDif >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive")}>
                        {subDif >= 0 ? "+" : ""}R$ {fmt(subDif)}
                      </span>
                    </td>
                    {isAdmin && <td />}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}

      {/* Adicionar item (admin only) */}
      {isAdmin && (
        <Card className="border-dashed border-border/50">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Adicionar item</p>
            <div className="flex flex-wrap gap-2">
              <Input placeholder="Categoria" value={novoItem.categoria} onChange={(e) => setNovoItem((p) => ({ ...p, categoria: e.target.value }))} className="flex-1 min-w-[160px]" />
              <Input placeholder="Descrição" value={novoItem.descricao} onChange={(e) => setNovoItem((p) => ({ ...p, descricao: e.target.value }))} className="flex-1 min-w-[180px]" />
              <Input placeholder="Quantidade" value={novoItem.quantidade} onChange={(e) => setNovoItem((p) => ({ ...p, quantidade: e.target.value }))} className="w-28" />
              <Input placeholder="Previsto (R$)" value={novoItem.valor_previsto} onChange={(e) => setNovoItem((p) => ({ ...p, valor_previsto: e.target.value }))} className="w-32" inputMode="decimal" />
              <Button onClick={addItem} disabled={adicionando}>
                <Plus className="mr-1.5 h-4 w-4" />{adicionando ? "Adicionando..." : "Adicionar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ranking */}
      {ranking.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-base">Ranking de gastos por categoria</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {ranking.map((r, i) => (
              <div key={r.cat} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={cn("font-medium", i === 0 ? "text-foreground" : "text-muted-foreground")}>
                    {i === 0 ? "🏆 " : ""}{r.cat.replace(/^\d+\.\s*/, "")}
                  </span>
                  <span className="text-muted-foreground">R$ {fmt(r.pago)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div className={cn("h-full rounded-full transition-all", i === 0 ? "bg-destructive/70" : "bg-primary/60")} style={{ width: `${(r.pago / maxRanking) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
