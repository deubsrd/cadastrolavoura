/* eslint-disable @typescript-eslint/no-explicit-any -- dados dos blocos são JSON livre vindo do grafo */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft,
  Plus,
  Undo2,
  Redo2,
  Wand2,
  BarChart3,
  Sparkles,
  Play,
  Pause,
  Rocket,
  Loader2,
  Check,
  Search,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  sdb,
  callFn,
  uid,
  triggerTypes,
  within24h,
  displayName,
  type FlowGraph,
  type Workflow,
  type Contact,
} from "@/lib/social/api";
import { FlowNode as FlowNodeView } from "@/components/social/editor/FlowNode";
import { NodePanel, type EditorRefs } from "@/components/social/editor/NodePanel";
import { BLOCKS, outputsOf } from "@/components/social/editor/blocks";

export const Route = createFileRoute("/admin/social/automacoes/$id")({
  head: () => ({ meta: [{ title: "Editor de automação — Admin" }] }),
  component: Editor,
});

const NODE_TYPES = Object.fromEntries(
  ["trigger", ...BLOCKS.map((b) => b.type)].map((t) => [t, FlowNodeView]),
);

const toRF = (g: FlowGraph): { nodes: Node[]; edges: Edge[] } => ({
  nodes: g.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position ?? { x: 0, y: 0 },
    data: n.data,
    deletable: n.type !== "trigger",
  })),
  edges: g.edges.map((e) => ({
    id: e.id,
    source: e.source,
    sourceHandle: e.sourceHandle ?? "next",
    target: e.target,
    animated: true,
    style: { stroke: "var(--brand-green)", strokeWidth: 2 },
  })),
});
const fromRF = (nodes: Node[], edges: Edge[]): FlowGraph => ({
  nodes: nodes.map((n) => ({
    id: n.id,
    type: n.type ?? "message",
    position: n.position,
    data: n.data as Record<string, any>,
  })),
  edges: edges.map((e) => ({
    id: e.id,
    source: e.source,
    sourceHandle: e.sourceHandle ?? "next",
    target: e.target,
  })),
});

function validate(g: FlowGraph): string[] {
  const out: string[] = [];
  const trig = g.nodes.find((n) => n.type === "trigger");
  if (!trig?.data.types?.length) out.push("Escolha pelo menos um gatilho.");
  if (!g.edges.some((e) => e.source === "trigger")) out.push("Ligue o gatilho ao primeiro bloco.");
  for (const n of g.nodes) {
    if (n.type === "message" && !(n.data.items ?? []).length)
      out.push(`O bloco "${n.data.title || "Mensagem"}" está vazio.`);
    if (n.type === "http" && !n.data.url) out.push("Bloco HTTP sem URL.");
    if (n.type === "sheets" && !n.data.webhookUrl) out.push("Bloco Google Sheets sem URL.");
    if (n.type === "message") {
      for (const it of n.data.items ?? []) {
        if ((it.kind === "text" || it.kind === "question") && !it.text?.trim())
          out.push(`Há uma mensagem sem texto em "${n.data.title || "Mensagem"}".`);
        if (it.kind === "question" && !it.field)
          out.push("Uma pergunta não tem campo para salvar a resposta.");
      }
    }
  }
  return [...new Set(out)];
}

function autoLayout(g: FlowGraph): FlowGraph {
  const depth = new Map<string, number>([["trigger", 0]]);
  const queue = ["trigger"];
  while (queue.length) {
    const id = queue.shift()!;
    for (const e of g.edges.filter((x) => x.source === id)) {
      if (!depth.has(e.target)) {
        depth.set(e.target, depth.get(id)! + 1);
        queue.push(e.target);
      }
    }
  }
  const rows = new Map<number, number>();
  const maxD = Math.max(0, ...depth.values());
  return {
    ...g,
    nodes: g.nodes.map((n) => {
      const d = depth.get(n.id) ?? maxD + 1;
      const r = rows.get(d) ?? 0;
      rows.set(d, r + 1);
      return { ...n, position: { x: d * 340, y: 80 + r * 260 } };
    }),
  };
}

function Editor() {
  const { id } = Route.useParams();
  const [wf, setWf] = useState<Workflow | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty">("saved");
  const [refs, setRefs] = useState<Omit<EditorRefs, "reloadRefs">>({
    tags: [],
    fields: [],
    replyLists: [],
    workflows: [],
  });
  const [blockSearch, setBlockSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const past = useRef<FlowGraph[]>([]);
  const future = useRef<FlowGraph[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const loaded = useRef(false);

  const loadRefs = useCallback(async () => {
    const [t, f, r, w] = await Promise.all([
      sdb.from("ss_tags").select("id, name, color").order("name"),
      sdb.from("ss_custom_fields").select("id, key, label, type").order("label"),
      sdb.from("ss_reply_lists").select("id, name").order("name"),
      sdb.from("ss_workflows").select("id, name").neq("id", id).order("name"),
    ]);
    setRefs({
      tags: t.data ?? [],
      fields: f.data ?? [],
      replyLists: r.data ?? [],
      workflows: w.data ?? [],
    });
  }, [id]);

  useEffect(() => {
    loaded.current = false;
    sdb
      .from("ss_workflows")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error) return toast.error(error.message);
        const w = data as Workflow;
        setWf(w);
        const rf = toRF(
          w.graph?.nodes?.length
            ? w.graph
            : {
                nodes: [
                  {
                    id: "trigger",
                    type: "trigger",
                    position: { x: 0, y: 120 },
                    data: {
                      types: [],
                      keywordMode: "any",
                      keywords: [],
                      postScope: "any",
                      mediaIds: [],
                      publicReplies: [],
                      onlyOnce: true,
                    },
                  },
                ],
                edges: [],
              },
        );
        setNodes(rf.nodes);
        setEdges(rf.edges);
        if (!w.graph?.edges?.length) setSelected("trigger");
        setTimeout(() => {
          loaded.current = true;
        }, 0);
      });
    loadRefs();
  }, [id, loadRefs]);

  const graph = useMemo(() => fromRF(nodes, edges), [nodes, edges]);

  // salvar automático
  useEffect(() => {
    if (!loaded.current || !wf) return;
    setSaveState("dirty");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveState("saving");
      const { error } = await sdb
        .from("ss_workflows")
        .update({ graph, trigger_types: triggerTypes(graph) })
        .eq("id", id);
      if (error) {
        toast.error(`Não salvou: ${error.message}`);
        setSaveState("dirty");
      } else setSaveState("saved");
    }, 700);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph]);

  const snapshot = () => {
    past.current = [...past.current.slice(-49), fromRF(nodes, edges)];
    future.current = [];
  };
  const restore = (g: FlowGraph) => {
    const rf = toRF(g);
    setNodes(rf.nodes);
    setEdges(rf.edges);
  };
  const undo = () => {
    const g = past.current.pop();
    if (!g) return;
    future.current.push(fromRF(nodes, edges));
    restore(g);
  };
  const redo = () => {
    const g = future.current.pop();
    if (!g) return;
    past.current.push(fromRF(nodes, edges));
    restore(g);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || (e.target as HTMLElement)?.closest("input, textarea"))
        return;
      if (e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if (e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onNodesChange = (changes: NodeChange[]) => {
    if (changes.some((c) => c.type === "remove")) snapshot();
    if (changes.some((c) => c.type === "remove" && c.id === selected)) setSelected(null);
    setNodes((ns) => applyNodeChanges(changes, ns));
  };
  const onEdgesChange = (changes: EdgeChange[]) => {
    if (changes.some((c) => c.type === "remove")) snapshot();
    setEdges((es) => applyEdgeChanges(changes, es));
  };
  const onConnect = (c: Connection) => {
    if (!c.source || !c.target || c.source === c.target) return;
    snapshot();
    const handle = c.sourceHandle ?? "next";
    setEdges((es) => [
      ...es.filter((e) => !(e.source === c.source && (e.sourceHandle ?? "next") === handle)), // uma saída = um destino
      {
        id: uid("e"),
        source: c.source!,
        sourceHandle: handle,
        target: c.target!,
        animated: true,
        style: { stroke: "var(--brand-green)", strokeWidth: 2 },
      },
    ]);
  };

  const updateNodeData = (nodeId: string, data: Record<string, any>) => {
    setNodes((ns) => ns.map((n) => (n.id === nodeId ? { ...n, data } : n)));
    // remove ligações de saídas que deixaram de existir (ex.: botão apagado)
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      const valid = new Set(outputsOf(node.type ?? "", data).map((o) => o.id));
      setEdges((es) =>
        es.filter((e) => e.source !== nodeId || valid.has(e.sourceHandle ?? "next")),
      );
    }
  };

  const addBlock = (type: string) => {
    snapshot();
    const def = BLOCKS.find((b) => b.type === type)!;
    const from =
      nodes.find((n) => n.id === selected) ?? nodes.find((n) => n.type === "trigger") ?? null;
    const newId = uid("n");
    const pos = from
      ? {
          x: from.position.x + 340,
          y: from.position.y + edges.filter((e) => e.source === from.id).length * 220,
        }
      : { x: 340, y: 120 };
    setNodes((ns) => [...ns, { id: newId, type, position: pos, data: def.initial() }]);
    if (from) {
      const used = new Set(
        edges.filter((e) => e.source === from.id).map((e) => e.sourceHandle ?? "next"),
      );
      const free = outputsOf(from.type ?? "", from.data as Record<string, any>).find(
        (o) => !used.has(o.id),
      );
      if (free)
        setEdges((es) => [
          ...es,
          {
            id: uid("e"),
            source: from.id,
            sourceHandle: free.id,
            target: newId,
            animated: true,
            style: { stroke: "var(--brand-green)", strokeWidth: 2 },
          },
        ]);
    }
    setSelected(newId);
    setAddOpen(false);
    setBlockSearch("");
  };

  const rename = async (name: string) => {
    if (!wf) return;
    setWf({ ...wf, name });
    await sdb
      .from("ss_workflows")
      .update({ name: name || "Sem título" })
      .eq("id", id);
  };

  const setStatus = async (status: Workflow["status"]) => {
    if (!wf) return;
    if (status === "active") {
      const problems = validate(graph);
      if (problems.length) {
        problems.slice(0, 4).forEach((p) => toast.error(p));
        return;
      }
      const { count } = await sdb
        .from("ss_channels")
        .select("id", { count: "exact", head: true })
        .eq("status", "connected");
      if (!count) return toast.error("Conecte o Instagram em Configurações antes de ativar.");
    }
    const patch: Record<string, unknown> = { status, graph, trigger_types: triggerTypes(graph) };
    if (status === "active" && !wf.published_at) patch.published_at = new Date().toISOString();
    const { error } = await sdb.from("ss_workflows").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    setWf({ ...wf, status, published_at: (patch.published_at as string) ?? wf.published_at });
    toast.success(status === "active" ? "Automação ativa! 🚀" : "Automação pausada.");
  };

  const filteredBlocks = BLOCKS.filter((b) =>
    b.label.toLowerCase().includes(blockSearch.toLowerCase()),
  );
  const selNode = nodes.find((n) => n.id === selected);

  if (!wf)
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="-m-4 flex h-[calc(100dvh-7rem)] flex-col sm:-m-6 md:h-dvh">
      <header className="flex flex-wrap items-center gap-2 border-b bg-card px-3 py-2">
        <Button variant="ghost" size="icon" asChild aria-label="Voltar">
          <Link to="/admin/social/automacoes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <Input
          value={wf.name}
          onChange={(e) => rename(e.target.value)}
          className="h-9 max-w-xs border-none font-bold shadow-none focus-visible:ring-1"
        />
        <Badge
          variant="secondary"
          className={wf.status === "active" ? "bg-success text-success-foreground" : ""}
        >
          {wf.status === "active" ? "Ativa" : wf.status === "paused" ? "Pausada" : "Rascunho"}
        </Badge>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {saveState === "saving" ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> Salvando
            </>
          ) : saveState === "dirty" ? (
            "Alterações não salvas"
          ) : (
            <>
              <Check className="h-3 w-3" /> Salvo
            </>
          )}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Button variant="ghost" size="icon" onClick={undo} aria-label="Desfazer">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={redo} aria-label="Refazer">
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              snapshot();
              restore(autoLayout(graph));
            }}
            aria-label="Organizar"
          >
            <Wand2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMetricsOpen(true)}
            aria-label="Métricas"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAiOpen(true)}>
            <Sparkles className="mr-1 h-4 w-4" /> IA
          </Button>
          <Button variant="outline" size="sm" onClick={() => setTestOpen(true)}>
            <FlaskConical className="mr-1 h-4 w-4" /> Testar
          </Button>
          {wf.status === "active" ? (
            <Button size="sm" variant="secondary" onClick={() => setStatus("paused")}>
              <Pause className="mr-1 h-4 w-4" /> Pausar
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setStatus("active")}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {wf.status === "paused" ? (
                <Play className="mr-1 h-4 w-4" />
              ) : (
                <Rocket className="mr-1 h-4 w-4" />
              )}{" "}
              {wf.status === "paused" ? "Retomar" : "Publicar"}
            </Button>
          )}
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <div className="relative flex-1 bg-muted/40">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => setSelected(n.id)}
            onPaneClick={() => setSelected(null)}
            onNodeDragStart={snapshot}
            fitView
            fitViewOptions={{ maxZoom: 1, padding: 0.3 }}
            deleteKeyCode={["Delete", "Backspace"]}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} size={1.2} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable className="!hidden md:!block" />
          </ReactFlow>

          <Popover open={addOpen} onOpenChange={setAddOpen}>
            <PopoverTrigger asChild>
              <Button className="absolute left-4 top-4 z-10 shadow-[var(--shadow-soft)]">
                <Plus className="mr-1 h-4 w-4" /> Adicionar bloco
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-2">
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  autoFocus
                  value={blockSearch}
                  onChange={(e) => setBlockSearch(e.target.value)}
                  placeholder="Buscar"
                  className="pl-8"
                />
              </div>
              {[false, true].map((adv) => {
                const list = filteredBlocks.filter((b) => !!b.advanced === adv);
                if (!list.length) return null;
                return (
                  <div key={String(adv)}>
                    {adv && (
                      <p className="px-2 pb-1 pt-2 text-xs font-semibold uppercase text-muted-foreground">
                        Avançado
                      </p>
                    )}
                    {list.map(({ type, label, description, icon: Icon }) => (
                      <button
                        key={type}
                        onClick={() => addBlock(type)}
                        className="flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left hover:bg-muted"
                      >
                        <Icon className="mt-0.5 h-4 w-4 text-accent" />
                        <span>
                          <span className="block text-sm font-medium">{label}</span>
                          <span className="block text-xs text-muted-foreground">{description}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })}
              <p className="px-2 pt-2 text-[11px] text-muted-foreground">
                O bloco novo já sai ligado ao bloco selecionado.
              </p>
            </PopoverContent>
          </Popover>
        </div>

        {selNode && (
          <div className="absolute inset-0 z-20 sm:static sm:inset-auto">
            <NodePanel
              node={{
                id: selNode.id,
                type: selNode.type ?? "",
                data: selNode.data as Record<string, any>,
              }}
              refs={{ ...refs, reloadRefs: loadRefs }}
              onChange={(d) => updateNodeData(selNode.id, d)}
              onDelete={() => {
                snapshot();
                setNodes((ns) => ns.filter((n) => n.id !== selNode.id));
                setEdges((es) =>
                  es.filter((e) => e.source !== selNode.id && e.target !== selNode.id),
                );
                setSelected(null);
              }}
              onClose={() => setSelected(null)}
            />
          </div>
        )}
      </div>

      <MetricsDialog open={metricsOpen} onOpenChange={setMetricsOpen} workflowId={id} />
      <TestDialog open={testOpen} onOpenChange={setTestOpen} workflowId={id} />
      <AIDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
        current={graph}
        onApply={(g) => {
          snapshot();
          restore(g);
        }}
      />
    </div>
  );
}

// ------------------------------------------------------------------ métricas
function MetricsDialog({
  open,
  onOpenChange,
  workflowId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workflowId: string;
}) {
  const [stats, setStats] = useState<{
    byStatus: Record<string, number>;
    clicks: number;
    sent: number;
    errors: { error: string; created_at: string }[];
  } | null>(null);
  useEffect(() => {
    if (!open) return;
    setStats(null);
    (async () => {
      const [{ data: runs }, { data: links }, { count: sent }] = await Promise.all([
        sdb
          .from("ss_runs")
          .select("status, error, created_at")
          .eq("workflow_id", workflowId)
          .order("created_at", { ascending: false })
          .limit(1000),
        sdb.from("ss_links").select("ss_link_clicks(count)").eq("workflow_id", workflowId),
        sdb
          .from("ss_messages")
          .select("id", { count: "exact", head: true })
          .eq("workflow_id", workflowId)
          .is("error", null),
      ]);
      const byStatus: Record<string, number> = {};
      for (const r of runs ?? []) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      const clicks = (links ?? []).reduce(
        (s: number, l: any) => s + (l.ss_link_clicks?.[0]?.count ?? 0),
        0,
      );
      setStats({
        byStatus,
        clicks,
        sent: sent ?? 0,
        errors: (runs ?? []).filter((r) => r.error).slice(0, 8) as any,
      });
    })();
  }, [open, workflowId]);
  const total = Object.values(stats?.byStatus ?? {}).reduce((a, b) => a + b, 0);
  const label: Record<string, string> = {
    done: "Concluídas",
    failed: "Com erro",
    waiting_input: "Esperando resposta",
    waiting_click: "Esperando clique",
    waiting_time: "Aguardando",
    running: "Rodando",
    cancelled: "Expiradas",
    queued: "Na fila",
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Métricas da automação</DialogTitle>
        </DialogHeader>
        {!stats ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ["Execuções", total],
                ["Mensagens enviadas", stats.sent],
                ["Cliques em links", stats.clicks],
              ].map(([l, v]) => (
                <div key={l} className="rounded-lg bg-muted p-3">
                  <p className="text-2xl font-extrabold text-primary">{v}</p>
                  <p className="text-xs text-muted-foreground">{l}</p>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              {Object.entries(stats.byStatus).map(([s, n]) => (
                <div key={s} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label[s] ?? s}</span>
                  <span className="font-semibold">{n}</span>
                </div>
              ))}
            </div>
            {stats.errors.length > 0 && (
              <div>
                <p className="mb-1 text-sm font-semibold">Últimos erros</p>
                {stats.errors.map((e, i) => (
                  <p key={i} className="text-xs text-destructive">
                    {new Date(e.created_at).toLocaleString("pt-BR")} — {e.error}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------ testar
function TestDialog({
  open,
  onOpenChange,
  workflowId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workflowId: string;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactId, setContactId] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    sdb
      .from("ss_contacts")
      .select("*")
      .gte("last_inbound_at", new Date(Date.now() - 24 * 3600_000).toISOString())
      .order("last_inbound_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setContacts((data ?? []) as Contact[]));
  }, [open]);
  const run = async () => {
    setBusy(true);
    try {
      const r = await callFn<{ status: string; error?: string }>("ss-engine", {
        action: "test_run",
        workflow_id: workflowId,
        contact_id: contactId,
      });
      if (r?.status === "failed") toast.error(r.error ?? "Falhou");
      else toast.success("Teste enviado! Confira o direct.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Testar automação</DialogTitle>
          <DialogDescription>
            Roda o fluxo (sem o gatilho) para um contato que te mandou mensagem nas últimas 24h.
            Para testar você mesmo, mande um "oi" de outro perfil para o Instagram da Lavoura e
            escolha ele aqui.
          </DialogDescription>
        </DialogHeader>
        {contacts.length ? (
          <Select value={contactId || undefined} onValueChange={setContactId}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha o contato" />
            </SelectTrigger>
            <SelectContent>
              {contacts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {displayName(c)}
                  {within24h(c.last_inbound_at) ? "" : " (fora da janela)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum contato com conversa aberta nas últimas 24h.
          </p>
        )}
        <Button onClick={run} disabled={!contactId || busy}>
          {busy ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <FlaskConical className="mr-1 h-4 w-4" />
          )}{" "}
          Enviar teste
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------ IA
function AIDialog({
  open,
  onOpenChange,
  current,
  onApply,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  current: FlowGraph;
  onApply: (g: FlowGraph) => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      const r = await callFn<{ graph: FlowGraph }>("ss-ai", {
        action: "build_workflow",
        description: `Automação atual (ajuste a partir dela, mantendo o que não for pedido):\n${JSON.stringify(current)}\n\nPedido: ${text}`,
      });
      onApply(autoLayout(r.graph));
      onOpenChange(false);
      setText("");
      toast.success("Fluxo atualizado. Revise antes de publicar.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar com IA</DialogTitle>
          <DialogDescription>
            Peça mudanças em linguagem natural. Dá para desfazer com Ctrl+Z.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='Ex.: "só mandar o link para quem segue o perfil; quem não segue recebe um pedido para seguir"'
        />
        <Button onClick={go} disabled={busy || text.trim().length < 5}>
          {busy ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-1 h-4 w-4" />
          )}{" "}
          Aplicar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
