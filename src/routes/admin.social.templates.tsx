import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  sdb,
  createWorkflow,
  triggerTypes,
  TRIGGER_LABELS,
  type FlowGraph,
} from "@/lib/social/api";
import { BUILTIN_TEMPLATES } from "@/lib/social/templates";

export const Route = createFileRoute("/admin/social/templates")({
  component: Templates,
});

type Saved = {
  id: string;
  name: string;
  description: string | null;
  graph: FlowGraph;
  created_at: string;
};

function Templates() {
  const navigate = useNavigate();
  const [mine, setMine] = useState<Saved[]>([]);

  const load = () =>
    sdb
      .from("ss_templates")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setMine((data ?? []) as Saved[]));
  useEffect(() => {
    load();
  }, []);

  const use = async (name: string, graph: FlowGraph) => {
    try {
      const id = await createWorkflow(name, graph);
      navigate({ to: "/admin/social/automacoes/$id", params: { id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const card = (
    key: string,
    name: string,
    desc: string,
    graph: () => FlowGraph,
    onDelete?: () => void,
  ) => {
    const g = graph();
    return (
      <div
        key={key}
        className="flex flex-col rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]"
      >
        <p className="font-semibold text-primary">{name}</p>
        <p className="mt-1 flex-1 text-sm text-muted-foreground">{desc}</p>
        <p className="mt-3 text-xs text-muted-foreground">
          {triggerTypes(g)
            .map((t) => TRIGGER_LABELS[t])
            .join(" · ") || "Sem gatilho"}{" "}
          · {g.nodes.length - 1} bloco(s)
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" onClick={() => use(name, g)}>
            Usar template <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
          {onDelete && (
            <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Excluir">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight text-primary">Templates</h1>
      <Tabs defaultValue="lavoura">
        <TabsList>
          <TabsTrigger value="lavoura">Biblioteca Lavoura</TabsTrigger>
          <TabsTrigger value="meus">Meus templates ({mine.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="lavoura" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BUILTIN_TEMPLATES.map((t) => card(t.slug, t.name, t.description, t.graph))}
          </div>
        </TabsContent>
        <TabsContent value="meus" className="mt-4">
          {mine.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nas Automações, use o menu ⋮ → "Salvar como template".
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {mine.map((t) =>
                card(
                  t.id,
                  t.name,
                  t.description ?? "Salvo a partir de uma automação sua.",
                  () => t.graph,
                  async () => {
                    if (!window.confirm(`Excluir o template "${t.name}"?`)) return;
                    await sdb.from("ss_templates").delete().eq("id", t.id);
                    load();
                  },
                ),
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
