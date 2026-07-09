import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFranqueado } from "@/hooks/use-franqueado";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/progresso")({
  head: () => ({ meta: [{ title: "Progresso — Sistema Lavoura" }] }),
  component: Progresso,
});

type Etapa = { id: string; numero: number; nome: string; descricao: string | null };
type Subitem = { id: string; etapa_id: string; texto: string; ordem: number };
type ProgressoItem = { subitem_id: string; concluido: boolean };

const ETAPA_EMOJIS: Record<number, string> = {
  1: "🌱", 2: "🌿", 3: "🪴", 4: "🔨", 5: "🌸", 6: "🎉", 7: "🌾",
};

function Progresso() {
  const { unidadeId, loading: loadingUnidade } = useFranqueado();
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [subitens, setSubitens] = useState<Subitem[]>([]);
  const [progresso, setProgresso] = useState<ProgressoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("jornada_etapas").select("id, numero, nome, descricao").order("ordem"),
      supabase.from("jornada_subitens").select("id, etapa_id, texto, ordem").order("ordem"),
    ]).then(([{ data: et }, { data: sub }]) => {
      setEtapas((et as Etapa[]) ?? []);
      setSubitens((sub as Subitem[]) ?? []);
    });
  }, []);

  useEffect(() => {
    if (!unidadeId) return;
    supabase.from("jornada_progresso")
      .select("subitem_id, concluido")
      .eq("unidade_id", unidadeId)
      .then(({ data }) => { setProgresso((data as ProgressoItem[]) ?? []); setLoading(false); });
  }, [unidadeId]);

  const isConcluido = (subitemId: string) =>
    progresso.find((p) => p.subitem_id === subitemId)?.concluido ?? false;

  const totalSubitens = subitens.length;
  const totalConcluidos = progresso.filter((p) => p.concluido).length;
  const pct = totalSubitens > 0 ? Math.round((totalConcluidos / totalSubitens) * 100) : 0;

  const etapaAtualNumero = (() => {
    for (const etapa of etapas) {
      const subs = subitens.filter((s) => s.etapa_id === etapa.id);
      const todosOk = subs.length > 0 && subs.every((s) => isConcluido(s.id));
      if (!todosOk) return etapa.numero;
    }
    return etapas[etapas.length - 1]?.numero ?? 1;
  })();

  if (loadingUnidade || loading) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Progresso</h1>
        <p className="text-sm text-muted-foreground">Acompanhe sua jornada de implementação da unidade Lavoura.</p>
      </div>

      {/* Barra de progresso geral */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-foreground">Progresso geral da implementação</p>
            <span className="text-2xl font-bold text-primary">{pct}%</span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {totalConcluidos} de {totalSubitens} itens concluídos ·{" "}
            <span className="font-medium text-foreground">
              Etapa atual: {ETAPA_EMOJIS[etapaAtualNumero]} {etapas.find((e) => e.numero === etapaAtualNumero)?.nome}
            </span>
          </p>
        </CardContent>
      </Card>

      {/* Linha do tempo */}
      <div className="relative">
        {/* linha vertical */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-6">
          {etapas.map((etapa) => {
            const subs = subitens.filter((s) => s.etapa_id === etapa.id);
            const concluidos = subs.filter((s) => isConcluido(s.id)).length;
            const etapaConcluida = concluidos === subs.length && subs.length > 0;
            const etapaAtiva = etapa.numero === etapaAtualNumero;
            const etapaBloqueada = etapa.numero > etapaAtualNumero;
            const etapaPct = subs.length > 0 ? Math.round((concluidos / subs.length) * 100) : 0;

            return (
              <div key={etapa.id} className="relative flex gap-4 pl-4">
                {/* Ícone na linha */}
                <div className={cn(
                  "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-background text-base",
                  etapaConcluida && "border-green-500 bg-green-500 text-white",
                  etapaAtiva && !etapaConcluida && "border-primary bg-primary text-primary-foreground",
                  etapaBloqueada && "border-muted-foreground/30 bg-muted text-muted-foreground/50"
                )}>
                  {etapaConcluida ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : etapaBloqueada ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : (
                    <span className="text-xs font-bold">{etapa.numero}</span>
                  )}
                </div>

                {/* Conteúdo */}
                <div className={cn("flex-1 pb-2", etapaBloqueada && "opacity-50")}>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-base">{ETAPA_EMOJIS[etapa.numero]}</span>
                    <h3 className={cn(
                      "text-sm font-semibold",
                      etapaConcluida && "text-green-600 dark:text-green-400",
                      etapaAtiva && !etapaConcluida && "text-primary",
                      etapaBloqueada && "text-muted-foreground"
                    )}>
                      Etapa {etapa.numero} — {etapa.nome}
                    </h3>
                    {etapaConcluida && <Badge className="bg-green-500 text-white text-xs">Concluída ✓</Badge>}
                    {etapaAtiva && !etapaConcluida && <Badge variant="secondary" className="text-xs">Em andamento</Badge>}
                    {etapaBloqueada && <Badge variant="outline" className="text-xs text-muted-foreground">Em breve</Badge>}
                  </div>

                  {etapa.descricao && (
                    <p className="text-xs text-muted-foreground mb-2">{etapa.descricao}</p>
                  )}

                  {/* Mini barra de progresso da etapa */}
                  {!etapaBloqueada && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{concluidos}/{subs.length} itens</span>
                        <span>{etapaPct}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", etapaConcluida ? "bg-green-500" : "bg-primary")}
                          style={{ width: `${etapaPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Subitens — só mostra na etapa atual e concluídas */}
                  {!etapaBloqueada && (
                    <div className="space-y-1.5 rounded-lg bg-muted/40 p-3">
                      {subs.map((sub) => {
                        const ok = isConcluido(sub.id);
                        return (
                          <div key={sub.id} className="flex items-start gap-2">
                            {ok ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-0.5" />
                            )}
                            <span className={cn("text-xs", ok && "line-through text-muted-foreground")}>
                              {sub.texto}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Etapa bloqueada — mostra só a quantidade */}
                  {etapaBloqueada && (
                    <p className="text-xs text-muted-foreground">{subs.length} {subs.length === 1 ? "item" : "itens"}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
