import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/jornada")({
  head: () => ({ meta: [{ title: "Jornada — Lavoura" }] }),
  component: AdminJornada,
});

type Unidade = { id: string; numero: string; nome: string | null };
type Etapa = { id: string; numero: number; nome: string; descricao: string | null; ordem: number };
type Subitem = { id: string; etapa_id: string; texto: string; ordem: number };
type Progresso = { subitem_id: string; concluido: boolean; concluido_em: string | null };

function AdminJornada() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [unidadeId, setUnidadeId] = useState("");
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [subitens, setSubitens] = useState<Subitem[]>([]);
  const [progresso, setProgresso] = useState<Progresso[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("unidades").select("id, numero, nome").order("numero")
      .then(({ data }) => setUnidades((data as Unidade[]) ?? []));

    supabase.from("jornada_etapas").select("*").order("ordem")
      .then(({ data }) => setEtapas((data as Etapa[]) ?? []));

    supabase.from("jornada_subitens").select("*").order("ordem")
      .then(({ data }) => setSubitens((data as Subitem[]) ?? []));
  }, []);

  useEffect(() => {
    if (!unidadeId) { setProgresso([]); return; }
    setLoading(true);
    supabase.from("jornada_progresso").select("subitem_id, concluido, concluido_em")
      .eq("unidade_id", unidadeId)
      .then(({ data }) => { setProgresso((data as Progresso[]) ?? []); setLoading(false); });
  }, [unidadeId]);

  const toggleSubitem = async (subitemId: string, atual: boolean) => {
    if (!unidadeId) return;
    setSaving(subitemId);

    const novoConcluido = !atual;
    const { error } = await supabase.from("jornada_progresso").upsert({
      unidade_id: unidadeId,
      subitem_id: subitemId,
      concluido: novoConcluido,
      concluido_em: novoConcluido ? new Date().toISOString() : null,
    }, { onConflict: "unidade_id,subitem_id" });

    setSaving(null);
    if (error) return toast.error(error.message);

    setProgresso((prev) => {
      const exists = prev.find((p) => p.subitem_id === subitemId);
      if (exists) return prev.map((p) => p.subitem_id === subitemId ? { ...p, concluido: novoConcluido, concluido_em: novoConcluido ? new Date().toISOString() : null } : p);
      return [...prev, { subitem_id: subitemId, concluido: novoConcluido, concluido_em: novoConcluido ? new Date().toISOString() : null }];
    });
  };

  const isConcluido = (subitemId: string) => progresso.find((p) => p.subitem_id === subitemId)?.concluido ?? false;

  const totalSubitens = subitens.length;
  const totalConcluidos = progresso.filter((p) => p.concluido).length;
  const pct = totalSubitens > 0 ? Math.round((totalConcluidos / totalSubitens) * 100) : 0;

  // Etapa atual: primeira etapa que tem pelo menos 1 subitem não concluído
  const etapaAtualNumero = (() => {
    for (const etapa of etapas) {
      const subs = subitens.filter((s) => s.etapa_id === etapa.id);
      const todosOk = subs.length > 0 && subs.every((s) => isConcluido(s.id));
      if (!todosOk) return etapa.numero;
    }
    return etapas[etapas.length - 1]?.numero ?? 1;
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Jornada do Franqueado</h1>
        <p className="text-sm text-muted-foreground">Acompanhe e mova o progresso de cada unidade pelas etapas de implementação.</p>
      </div>

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

      {unidadeId && !loading && (
        <>
          {/* Barra de progresso geral */}
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-foreground">Progresso geral</p>
                <span className="text-sm font-bold text-primary">{pct}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{totalConcluidos} de {totalSubitens} itens concluídos · Etapa atual: <span className="font-semibold text-foreground">{etapas.find((e) => e.numero === etapaAtualNumero)?.nome}</span></p>
            </CardContent>
          </Card>

          {/* Etapas */}
          <div className="space-y-4">
            {etapas.map((etapa) => {
              const subs = subitens.filter((s) => s.etapa_id === etapa.id);
              const concluidos = subs.filter((s) => isConcluido(s.id)).length;
              const etapaConcluida = concluidos === subs.length && subs.length > 0;
              const etapaAtiva = etapa.numero === etapaAtualNumero;

              return (
                <Card key={etapa.id} className={cn(
                  "transition-all",
                  etapaConcluida && "border-green-500/40 bg-green-50/30 dark:bg-green-950/10",
                  etapaAtiva && !etapaConcluida && "border-primary/50 shadow-sm"
                )}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {etapaConcluida ? (
                          <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
                        ) : etapaAtiva ? (
                          <Circle className="h-6 w-6 text-primary shrink-0" />
                        ) : (
                          <Circle className="h-6 w-6 text-muted-foreground/40 shrink-0" />
                        )}
                        <div>
                          <CardTitle className="text-base">
                            Etapa {etapa.numero} — {etapa.nome}
                          </CardTitle>
                          {etapa.descricao && <p className="text-xs text-muted-foreground mt-0.5">{etapa.descricao}</p>}
                        </div>
                      </div>
                      <Badge variant={etapaConcluida ? "default" : etapaAtiva ? "secondary" : "outline"}>
                        {concluidos}/{subs.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {subs.map((sub) => {
                      const ok = isConcluido(sub.id);
                      return (
                        <label key={sub.id} className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-muted/50 transition-colors">
                          <Checkbox
                            checked={ok}
                            disabled={saving === sub.id}
                            onCheckedChange={() => toggleSubitem(sub.id, ok)}
                            className="mt-0.5"
                          />
                          <span className={cn("text-sm", ok && "line-through text-muted-foreground")}>{sub.texto}</span>
                        </label>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {unidadeId && loading && (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      )}
    </div>
  );
}
