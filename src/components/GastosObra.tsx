import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, Wallet, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Gasto = {
  id: string;
  categoria: string;
  descricao: string;
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
  const [novoItem, setNovoItem] = useState({ categoria: "", descricao: "", valor_previsto: "" });
  const [adicionando, setAdicionando] = useState(false);
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
      // Popula itens padrão
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

    // Debounce save
    clearTimeout(debounceRef.current[id + field]);
    debounceRef.current[id + field] = setTimeout(async () => {
      setSaving(id);
      const { error } = await supabase
        .from("obra_gastos").update({ [field]: valor }).eq("id", id);
      setSaving(null);
      if (error) toast.error(error.message);
    }, 800);
  };

  const addItem = async () => {
    if (!novoItem.categoria.trim() || !novoItem.descricao.trim()) {
      return toast.error("Informe categoria e descrição.");
    }
    setAdicionando(true);
    const ordem = gastos.filter((g) => g.categoria === novoItem.categoria.trim()).length + 1;
    const { data, error } = await supabase
      .from("obra_gastos")
      .insert({
        unidade_id: unidadeId,
        categoria: novoItem.categoria.trim(),
        descricao: novoItem.descricao.trim(),
        valor_previsto: parseMoeda(novoItem.valor_previsto),
        valor_pago: 0,
        ordem,
      })
      .select("*")
      .single();
    setAdicionando(false);
    if (error) return toast.error(error.message);
    setGastos((prev) => [...prev, data as Gasto]);
    setNovoItem({ categoria: novoItem.categoria, descricao: "", valor_previsto: "" });
    toast.success("Item adicionado.");
  };

  const removeItem = async (id: string) => {
    if (!confirm("Remover este item?")) return;
    const { error } = await supabase.from("obra_gastos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setGastos((prev) => prev.filter((g) => g.id !== id));
  };

  // Agrupamento por categoria
  const grouped = gastos.reduce<Record<string, Gasto[]>>((acc, g) => {
    (acc[g.categoria] ??= []).push(g);
    return acc;
  }, {});

  // Totais gerais
  const totalPago = gastos.reduce((s, g) => s + (g.valor_pago ?? 0), 0);
  const totalPrevisto = gastos.reduce((s, g) => s + (g.valor_previsto ?? 0), 0);
  const diferenca = totalPrevisto - totalPago;

  // Ranking por categoria
  const ranking = Object.entries(grouped)
    .map(([cat, items]) => ({
      cat,
      pago: items.reduce((s, g) => s + (g.valor_pago ?? 0), 0),
    }))
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
            <div className="bg-primary px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm font-semibold text-primary-foreground">{categoria}</span>
              <Badge variant="secondary" className="text-xs">
                Pago: R$ {fmt(subPago)} / Prev: R$ {fmt(subPrevisto)}
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="px-4 py-2.5 text-left font-semibold text-foreground">Descrição</th>
                    <th className="w-36 px-4 py-2.5 text-right font-semibold text-foreground">Valor Pago</th>
                    {isAdmin && <th className="w-36 px-4 py-2.5 text-right font-semibold text-foreground">Previsto</th>}
                    <th className="w-28 px-4 py-2.5 text-right font-semibold text-foreground">Diferença</th>
                    {isAdmin && <th className="w-10 px-2 py-2.5"></th>}
                  </tr>
                </thead>
                <tbody>
                  {itens.map((g) => {
                    const dif = (g.valor_previsto ?? 0) - (g.valor_pago ?? 0);
                    return (
                      <tr key={g.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 text-foreground">{g.descricao}</td>
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
                        <td className="px-4 py-2.5 text-right">
                          {g.valor_previsto != null ? (
                            <span className={cn("font-semibold text-xs", dif > 0.004 ? "text-green-600 dark:text-green-400" : dif < -0.004 ? "text-destructive" : "text-muted-foreground")}>
                              {dif > 0 ? "+" : ""}R$ {fmt(dif)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
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
                  {/* Subtotal row */}
                  <tr className="bg-muted/60 font-semibold border-t-2 border-border">
                    <td className="px-4 py-2 text-sm text-foreground">Subtotal</td>
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
              <Input
                placeholder="Categoria (ex: 1. Máquinas)"
                value={novoItem.categoria}
                onChange={(e) => setNovoItem((p) => ({ ...p, categoria: e.target.value }))}
                className="flex-1 min-w-[180px]"
              />
              <Input
                placeholder="Descrição"
                value={novoItem.descricao}
                onChange={(e) => setNovoItem((p) => ({ ...p, descricao: e.target.value }))}
                className="flex-1 min-w-[200px]"
              />
              <Input
                placeholder="Previsto (R$)"
                value={novoItem.valor_previsto}
                onChange={(e) => setNovoItem((p) => ({ ...p, valor_previsto: e.target.value }))}
                className="w-36"
                inputMode="decimal"
              />
              <Button onClick={addItem} disabled={adicionando}>
                <Plus className="mr-1.5 h-4 w-4" /> Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ranking */}
      {ranking.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ranking de gastos por categoria</CardTitle>
          </CardHeader>
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
                  <div
                    className={cn("h-full rounded-full transition-all", i === 0 ? "bg-destructive/70" : "bg-primary/60")}
                    style={{ width: `${(r.pago / maxRanking) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
