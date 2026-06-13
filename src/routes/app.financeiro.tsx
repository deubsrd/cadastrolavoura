import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useFranqueado } from "@/hooks/use-franqueado";
import { useFinanceiro } from "@/hooks/use-financeiro";
import { MonthSelector } from "@/components/financeiro/MonthSelector";
import {
  buildDREStructure,
  EDITABLE_CATEGORIES,
  calculateDRE,
  formatCurrency,
} from "@/lib/dre-structure";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  BarChart3,
  Wallet,
  Plus,
  X,
  Pencil,
  Check,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/app/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — Sistema Lavoura" }] }),
  component: Financeiro,
});

function KPICard({
  label,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card className="border-border/50 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="flex items-start gap-4 p-5">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl print:hidden",
            trend === "up" && "bg-success/10 text-success",
            trend === "down" && "bg-destructive/10 text-destructive",
            (!trend || trend === "neutral") && "bg-primary/10 text-primary",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-xl font-bold tracking-tight text-foreground">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function Financeiro() {
  const { unidadeId, loading: loadingUnidade } = useFranqueado();
  const store = useFinanceiro(unidadeId);

  if (loadingUnidade || store.loading) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }

  if (!unidadeId) {
    return (
      <div className="text-sm text-muted-foreground">
        Não encontramos uma unidade vinculada ao seu acesso. Fale com a franqueadora.
      </div>
    );
  }

  if (!store.activeRecord) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground">DRE mensal e visão geral da sua unidade.</p>
      </div>

      <MonthSelector
        records={store.records}
        activeId={store.activeId}
        onSelect={store.setActiveId}
        onAdd={store.addMonth}
        onDelete={store.deleteMonth}
      />

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="planilha">Planilha DRE</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-4">
          <Dashboard store={store} />
        </TabsContent>
        <TabsContent value="planilha" className="mt-4">
          <Planilha store={store} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Dashboard({ store }: { store: ReturnType<typeof useFinanceiro> }) {
  const { records, activeRecord } = store;
  if (!activeRecord) return null;

  const calc = calculateDRE(
    activeRecord.data,
    activeRecord.customItems || [],
    activeRecord.removedItems || [],
  );
  const revenue = calc.fat_bruto || 1;
  const margemPct = ((calc.margem_contribuicao / revenue) * 100).toFixed(1);
  const ebitdaPct = ((calc.ebitda / revenue) * 100).toFixed(1);

  const chartData = records.map((r) => {
    const c = calculateDRE(r.data, r.customItems || [], r.removedItems || []);
    return {
      name: r.label.replace(/\s\d{4}$/, "").slice(0, 3),
      faturamento: c.fat_bruto,
      custos:
        c.cmv_total + c.impostos_total + c.custos_total + c.comissoes_total + c.desp_adm_total,
      lucro: c.saldo_final,
    };
  });

  const breakdownData = [
    { name: "CMV", value: calc.cmv_total },
    { name: "Impostos", value: calc.impostos_total },
    { name: "Custos Op.", value: calc.custos_total },
    { name: "Taxas", value: calc.comissoes_total },
    { name: "Desp. Adm.", value: calc.desp_adm_total },
    { name: "Royalties", value: calc.outras_desp_total },
  ];

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KPICard
          label="Faturamento Bruto"
          value={formatCurrency(calc.fat_bruto)}
          icon={DollarSign}
          trend="neutral"
        />
        <KPICard
          label="Margem de Contribuição"
          value={formatCurrency(calc.margem_contribuicao)}
          subtitle={`${margemPct}% do faturamento`}
          icon={Percent}
          trend="up"
        />
        <KPICard
          label="EBITDA"
          value={formatCurrency(calc.ebitda)}
          subtitle={`${ebitdaPct}% do faturamento`}
          icon={BarChart3}
          trend={calc.ebitda >= 0 ? "up" : "down"}
        />
        <KPICard
          label="Saldo Final"
          value={formatCurrency(calc.saldo_final)}
          icon={Wallet}
          trend={calc.saldo_final >= 0 ? "up" : "down"}
        />
        <KPICard
          label="Despesas Totais"
          value={formatCurrency(calc.desp_adm_total)}
          subtitle="Administrativas + Marketing"
          icon={TrendingDown}
          trend="down"
        />
        <KPICard
          label="Receita Líquida"
          value={formatCurrency(calc.receita_liquida)}
          icon={TrendingUp}
          trend="up"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Evolução Mensal</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="faturamento"
                    name="Faturamento"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="lucro"
                    name="Lucro"
                    fill="hsl(var(--success))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Composição de Custos</h3>
            <div className="space-y-3">
              {breakdownData.map((item) => {
                const pct = (item.value / revenue) * 100;
                return (
                  <div key={item.name}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{item.name}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(item.value)} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary/70 transition-all"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Planilha({ store }: { store: ReturnType<typeof useFinanceiro> }) {
  const {
    activeRecord,
    updateData,
    addCustomItem,
    removeCustomItem,
    removeDefaultItem,
    renameCustomItem,
  } = store;
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [addingCategory, setAddingCategory] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  if (!activeRecord) return null;

  const structure = buildDREStructure(
    activeRecord.customItems || [],
    activeRecord.removedItems || [],
  );
  const calculated = calculateDRE(
    activeRecord.data,
    activeRecord.customItems || [],
    activeRecord.removedItems || [],
  );
  const revenue = calculated.fat_bruto || 1;

  const handleStartEdit = (lineId: string) => {
    setEditingCell(lineId);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleEndEdit = (lineId: string, rawValue: string) => {
    const num = parseFloat(rawValue.replace(/[^\d.,-]/g, "").replace(",", ".")) || 0;
    updateData(lineId, num);
    setEditingCell(null);
  };

  const handleAddItem = (categoryId: string) => {
    if (!newItemName.trim()) return;
    addCustomItem(categoryId, newItemName.trim());
    setNewItemName("");
    setAddingCategory(null);
  };

  const handleStartRename = (itemId: string, currentLabel: string) => {
    setEditingName(itemId);
    setRenamingValue(currentLabel);
  };

  const handleEndRename = (itemId: string) => {
    if (renamingValue.trim()) renameCustomItem(itemId, renamingValue.trim());
    setEditingName(null);
  };

  const isCustom = (id: string) => (activeRecord.customItems || []).some((ci) => ci.id === id);
  const isCategoryHeader = (id: string) => id in EDITABLE_CATEGORIES;

  return (
    <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-secondary/50">
            <th className="px-4 py-3 text-left font-semibold text-foreground">Descrição</th>
            <th className="w-40 px-4 py-3 text-right font-semibold text-foreground">Valor (R$)</th>
            <th className="w-28 px-4 py-3 text-right font-semibold text-foreground">% Receita</th>
            <th className="w-16 px-4 py-3 text-center font-semibold text-foreground">Ações</th>
          </tr>
        </thead>
        <tbody>
          {structure.map((line) => {
            const value = calculated[line.id] || 0;
            const pct = line.percentOfRevenue ? (value / revenue) * 100 : null;
            const isTotal = line.type === "total";
            const isHeader = line.type === "header";
            const isEditing = editingCell === line.id;
            const isNegativeResult = isTotal && value < 0;
            const canAddItems = isCategoryHeader(line.id);
            const isCustomItem = isCustom(line.id);

            return (
              <tr
                key={line.id}
                className={cn(
                  "group border-b transition-colors last:border-0",
                  isTotal && "bg-primary/5 font-bold",
                  isHeader && "bg-secondary/30 font-semibold",
                  !isTotal && !isHeader && "hover:bg-muted/50",
                )}
              >
                <td
                  className="px-4 py-2.5 text-foreground"
                  style={{ paddingLeft: `${16 + line.indent * 24}px` }}
                >
                  <div className="flex items-center gap-2">
                    {editingName === line.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={renamingValue}
                          onChange={(e) => setRenamingValue(e.target.value)}
                          className="h-7 w-40 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleEndRename(line.id);
                            if (e.key === "Escape") setEditingName(null);
                          }}
                          autoFocus
                        />
                        <button onClick={() => handleEndRename(line.id)} className="text-primary">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span>{line.label}</span>
                        {isCustomItem && (
                          <button
                            onClick={() => handleStartRename(line.id, line.label)}
                            className="hidden text-muted-foreground hover:text-foreground group-hover:inline-flex"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right">
                  {line.isEditable ? (
                    isEditing ? (
                      <input
                        ref={inputRef}
                        type="text"
                        defaultValue={String(activeRecord.data[line.id] || 0)}
                        className="w-full rounded border bg-background px-2 py-1 text-right text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        onBlur={(e) => handleEndEdit(line.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            handleEndEdit(line.id, (e.target as HTMLInputElement).value);
                          if (e.key === "Escape") setEditingCell(null);
                        }}
                      />
                    ) : (
                      <button
                        onClick={() => handleStartEdit(line.id)}
                        className="w-full cursor-pointer rounded px-2 py-1 text-right text-foreground transition-colors hover:bg-primary/10"
                      >
                        {formatCurrency(value)}
                      </button>
                    )
                  ) : (
                    <span
                      className={cn(
                        isNegativeResult ? "text-destructive" : "text-foreground",
                        isTotal && "text-base",
                      )}
                    >
                      {formatCurrency(value)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">
                  {pct !== null ? `${Math.round(pct)}%` : ""}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {canAddItems && (
                    <Dialog
                      open={addingCategory === line.id}
                      onOpenChange={(open) => {
                        if (open) setAddingCategory(line.id);
                        else {
                          setAddingCategory(null);
                          setNewItemName("");
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <button className="hidden rounded p-1 text-primary hover:bg-primary/10 group-hover:inline-flex">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-xs">
                        <DialogHeader>
                          <DialogTitle>Adicionar item</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 pt-2">
                          <Input
                            placeholder="Nome do item"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddItem(line.id);
                            }}
                            autoFocus
                          />
                          <Button
                            onClick={() => handleAddItem(line.id)}
                            className="w-full"
                            disabled={!newItemName.trim()}
                          >
                            Adicionar
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  {isCustomItem && (
                    <button
                      onClick={() => removeCustomItem(line.id)}
                      className="hidden rounded p-1 text-destructive hover:bg-destructive/10 group-hover:inline-flex"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {!isCustomItem && line.type === "subitem" && (
                    <button
                      onClick={() => removeDefaultItem(line.id)}
                      className="hidden rounded p-1 text-destructive hover:bg-destructive/10 group-hover:inline-flex"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
