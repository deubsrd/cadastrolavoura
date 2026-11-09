import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ETAPAS,
  FAIXA_CLASS,
  formatPhone,
  leadName,
  minutesBetween,
  sdrDb,
  type Etapa,
  type Lead,
} from "@/lib/sdr/api";

export const Route = createFileRoute("/admin/sdr/pipeline")({
  component: Pipeline,
});

// Colunas do funil da Estratégia Agrotóxicos (nutrição e perdido ficam no fim)
const COLUNAS: Etapa[] = [
  "novo",
  "contato",
  "qualificado",
  "agendada",
  "realizada",
  "cof",
  "dia_lavoura",
  "contrato",
  "nutricao",
  "perdido",
];

function Pipeline() {
  const [leads, setLeads] = useState<Lead[] | null>(null);

  useEffect(() => {
    let vivo = true;
    const carregar = async () => {
      const { data, error } = await sdrDb
        .from("sdr_leads")
        .select("*")
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(500);
      if (!vivo) return;
      if (error) toast.error(error.message);
      setLeads((data as Lead[]) ?? []);
    };
    carregar();
    const canal = sdrDb
      .channel("sdr-pipeline")
      .on("postgres_changes", { event: "*", schema: "public", table: "sdr_leads" }, carregar)
      .subscribe();
    return () => {
      vivo = false;
      sdrDb.removeChannel(canal);
    };
  }, []);

  const mover = async (lead: Lead, etapa: Etapa) => {
    setLeads((ls) => ls?.map((l) => (l.id === lead.id ? { ...l, etapa } : l)) ?? null);
    const { error } = await sdrDb.from("sdr_leads").update({ etapa }).eq("id", lead.id);
    if (error) toast.error(error.message);
  };

  const porEtapa = useMemo(() => {
    const m = new Map<Etapa, Lead[]>();
    COLUNAS.forEach((e) => m.set(e, []));
    leads?.forEach((l) => m.get(l.etapa)?.push(l));
    return m;
  }, [leads]);

  const resumo = useMemo(() => {
    const ls = leads ?? [];
    const tempos = ls
      .map((l) => minutesBetween(l.entrou_em, l.primeiro_contato_em))
      .filter((v): v is number => v !== null);
    const media = tempos.length
      ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length)
      : null;
    const qualificados = ls.filter((l) => l.faixa === "A" || l.faixa === "B").length;
    return {
      total: ls.length,
      a: ls.filter((l) => l.faixa === "A").length,
      b: ls.filter((l) => l.faixa === "B").length,
      c: ls.filter((l) => l.faixa === "C").length,
      humano: ls.filter((l) => l.precisa_humano).length,
      media,
      taxaQualificacao: ls.length ? Math.round((qualificados / ls.length) * 100) : 0,
    };
  }, [leads]);

  if (!leads) return <Loader2 className="mx-auto mt-10 h-5 w-5 animate-spin" />;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Metrica titulo="Leads" valor={resumo.total} />
        <Metrica titulo="Faixa A" valor={resumo.a} />
        <Metrica titulo="Faixa B" valor={resumo.b} />
        <Metrica titulo="Faixa C" valor={resumo.c} />
        <Metrica titulo="Precisam de humano" valor={resumo.humano} />
        <Metrica
          titulo="1º contato (média)"
          valor={resumo.media === null ? "—" : `${resumo.media} min`}
          dica={`${resumo.taxaQualificacao}% qualificados (A ou B)`}
        />
      </div>

      <div className="-mx-1 flex gap-3 overflow-x-auto pb-3">
        {COLUNAS.map((etapa) => {
          const itens = porEtapa.get(etapa) ?? [];
          const rotulo = ETAPAS.find((e) => e.value === etapa)?.label ?? etapa;
          return (
            <div key={etapa} className="w-64 shrink-0 space-y-2 rounded-lg bg-muted/40 p-2">
              <div className="flex items-center justify-between px-1 pt-1">
                <p className="text-sm font-semibold">{rotulo}</p>
                <Badge variant="secondary">{itens.length}</Badge>
              </div>
              {itens.length === 0 && (
                <p className="px-1 py-4 text-center text-xs text-muted-foreground">Nenhum lead</p>
              )}
              {itens.map((lead) => (
                <Card key={lead.id} className="shadow-sm">
                  <CardHeader className="space-y-1 p-3 pb-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium leading-tight">{leadName(lead)}</span>
                      {lead.faixa && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-semibold ${FAIXA_CLASS[lead.faixa]}`}
                        >
                          {lead.faixa}
                          {lead.nota !== null ? ` · ${lead.nota}` : ""}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{formatPhone(lead.wa_id)}</p>
                  </CardHeader>
                  <CardContent className="space-y-2 p-3 pt-1">
                    {lead.cidade && <p className="text-xs">{lead.cidade}</p>}
                    {lead.precisa_humano && (
                      <p className="text-xs font-medium text-destructive">
                        Precisa de humano{lead.motivo_humano ? `: ${lead.motivo_humano}` : ""}
                      </p>
                    )}
                    <Select value={lead.etapa} onValueChange={(v) => mover(lead, v as Etapa)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ETAPAS.map((e) => (
                          <SelectItem key={e.value} value={e.value}>
                            {e.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Metrica({
  titulo,
  valor,
  dica,
}: {
  titulo: string;
  valor: number | string;
  dica?: string;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground">{titulo}</p>
        <p className="text-2xl font-semibold">{valor}</p>
        {dica && <p className="text-xs text-muted-foreground">{dica}</p>}
      </CardContent>
    </Card>
  );
}
