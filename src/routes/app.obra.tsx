import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFranqueado } from "@/hooks/use-franqueado";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Eye, HardHat } from "lucide-react";

type ChecklistItem = {
  id: string;
  categoria: string;
  item: string;
  quantidade_sugerida: string | null;
  observacao: string | null;
  status: "pendente" | "comprado" | "instalado";
};

type Prancha = {
  id: string;
  nome: string;
  storage_path: string;
  created_at: string;
};

const STATUS_LABEL: Record<ChecklistItem["status"], string> = {
  pendente: "A comprar",
  comprado: "Comprado",
  instalado: "Instalado",
};

const STATUS_VARIANT: Record<ChecklistItem["status"], "secondary" | "default" | "outline"> = {
  pendente: "secondary",
  comprado: "default",
  instalado: "outline",
};

export const Route = createFileRoute("/app/obra")({
  head: () => ({ meta: [{ title: "Obra — Sistema Lavoura" }] }),
  component: Obra,
});

function Obra() {
  const { unidadeId, loading: loadingUnidade } = useFranqueado();
  const [itens, setItens] = useState<ChecklistItem[]>([]);
  const [pranchas, setPranchas] = useState<Prancha[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!unidadeId) return;
    setLoading(true);
    const [{ data: checklist }, { data: docs }] = await Promise.all([
      supabase
        .from("obra_checklist_itens")
        .select("id, categoria, item, quantidade_sugerida, observacao, status")
        .eq("unidade_id", unidadeId)
        .order("categoria")
        .order("ordem"),
      supabase
        .from("unidade_documentos")
        .select("id, nome, storage_path, created_at")
        .eq("unidade_id", unidadeId)
        .eq("tipo", "planta_obra")
        .eq("arquivado", false)
        .order("created_at", { ascending: false }),
    ]);
    setItens((checklist as ChecklistItem[]) ?? []);
    setPranchas((docs as Prancha[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!loadingUnidade) load();
  }, [unidadeId, loadingUnidade]);

  const updateStatus = async (id: string, status: ChecklistItem["status"]) => {
    setItens((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    const { error } = await supabase.from("obra_checklist_itens").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
  };

  const verPrancha = async (p: Prancha) => {
    const { data, error } = await supabase.storage
      .from("unidade-documentos")
      .createSignedUrl(p.storage_path, 60 * 5);
    if (!error && data) window.open(data.signedUrl, "_blank");
  };

  if (loadingUnidade || loading) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }

  const grouped = itens.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
    (acc[item.categoria] ??= []).push(item);
    return acc;
  }, {});

  const total = itens.length;
  const concluidos = itens.filter((i) => i.status === "instalado").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Obra</h1>
        <p className="text-sm text-muted-foreground">
          Checklist de itens e plantas do projeto da sua unidade.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plantas / pranchas do projeto</CardTitle>
        </CardHeader>
        <CardContent>
          {pranchas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma planta enviada ainda pela franqueadora.
            </p>
          ) : (
            <div className="space-y-2">
              {pranchas.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-md border border-border p-3"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">{p.nome}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => verPrancha(p)}>
                    <Eye className="mr-1.5 h-4 w-4" /> Abrir
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <HardHat className="h-5 w-5 text-primary" /> Checklist de itens
          </CardTitle>
          {total > 0 && (
            <Badge variant="secondary">
              {concluidos}/{total} instalados
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {total === 0 ? (
            <p className="text-sm text-muted-foreground">
              A franqueadora ainda não cadastrou o checklist desta unidade.
            </p>
          ) : (
            Object.entries(grouped).map(([categoria, lista]) => (
              <div key={categoria}>
                <h3 className="mb-2 text-sm font-semibold text-foreground">{categoria}</h3>
                <div className="space-y-2">
                  {lista.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {item.item}
                          {item.quantidade_sugerida ? ` — ${item.quantidade_sugerida}` : ""}
                        </p>
                        {item.observacao && (
                          <p className="text-xs text-muted-foreground">{item.observacao}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={STATUS_VARIANT[item.status]}
                          className="hidden sm:inline-flex"
                        >
                          {STATUS_LABEL[item.status]}
                        </Badge>
                        <Select
                          value={item.status}
                          onValueChange={(v) => updateStatus(item.id, v as ChecklistItem["status"])}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendente">A comprar</SelectItem>
                            <SelectItem value="comprado">Comprado</SelectItem>
                            <SelectItem value="instalado">Instalado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
