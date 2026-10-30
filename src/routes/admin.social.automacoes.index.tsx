import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Folder,
  FolderPlus,
  MoreVertical,
  Sparkles,
  LayoutTemplate,
  Blocks,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  sdb,
  callFn,
  createWorkflow,
  TRIGGER_LABELS,
  type Workflow,
  type FlowGraph,
  type TriggerKind,
} from "@/lib/social/api";

export const Route = createFileRoute("/admin/social/automacoes/")({
  component: Automacoes,
});

const STATUS_LABEL = { draft: "Rascunho", active: "Ativa", paused: "Pausada" } as const;

function Automacoes() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Workflow[] | null>(null);
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [folder, setFolder] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [inContent, setInContent] = useState(false);
  const [status, setStatus] = useState("all");
  const [trigger, setTrigger] = useState("all");
  const [sort, setSort] = useState<"updated" | "name" | "runs">("updated");
  const [newOpen, setNewOpen] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [aiText, setAiText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data: w, error }, { data: f }] = await Promise.all([
      sdb.from("ss_workflows").select("*").order("updated_at", { ascending: false }),
      sdb.from("ss_folders").select("id, name").order("name"),
    ]);
    if (error) toast.error(error.message);
    setItems((w ?? []) as Workflow[]);
    setFolders(f ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (items ?? [])
      .filter((w) => (folder ? w.folder_id === folder : true))
      .filter((w) => (status === "all" ? true : w.status === status))
      .filter((w) => (trigger === "all" ? true : w.trigger_types.includes(trigger as TriggerKind)))
      .filter((w) => {
        if (!term) return true;
        if (w.name.toLowerCase().includes(term)) return true;
        return inContent && JSON.stringify(w.graph).toLowerCase().includes(term);
      })
      .sort((a, b) =>
        sort === "name"
          ? a.name.localeCompare(b.name)
          : sort === "runs"
            ? b.runs_count - a.runs_count
            : b.updated_at.localeCompare(a.updated_at),
      );
  }, [items, folder, status, trigger, q, inContent, sort]);

  const newFolder = async () => {
    const name = window.prompt("Nome da pasta");
    if (!name?.trim()) return;
    const { error } = await sdb.from("ss_folders").insert({ name: name.trim() });
    if (error) return toast.error(error.message);
    load();
  };

  const createBlank = async () => {
    try {
      const id = await createWorkflow("Sem título");
      if (folder) await sdb.from("ss_workflows").update({ folder_id: folder }).eq("id", id);
      navigate({ to: "/admin/social/automacoes/$id", params: { id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const createWithAI = async () => {
    if (aiText.trim().length < 10)
      return toast.error("Descreva um pouco mais o que a automação deve fazer.");
    setBusy(true);
    try {
      const r = await callFn<{ name: string; graph: FlowGraph }>("ss-ai", {
        action: "build_workflow",
        description: aiText,
      });
      const id = await createWorkflow(r.name || "Automação da IA", r.graph);
      navigate({ to: "/admin/social/automacoes/$id", params: { id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  const setWfStatus = async (w: Workflow, s: Workflow["status"]) => {
    const patch: Record<string, unknown> = { status: s };
    if (s === "active" && !w.published_at) patch.published_at = new Date().toISOString();
    const { error } = await sdb.from("ss_workflows").update(patch).eq("id", w.id);
    if (error) return toast.error(error.message);
    load();
  };

  const duplicate = async (w: Workflow) => {
    await createWorkflow(`${w.name} (cópia)`, w.graph);
    load();
  };

  const remove = async (w: Workflow) => {
    if (!window.confirm(`Excluir "${w.name}"? As execuções e métricas dela também somem.`)) return;
    const { error } = await sdb.from("ss_workflows").delete().eq("id", w.id);
    if (error) return toast.error(error.message);
    load();
  };

  const saveAsTemplate = async (w: Workflow) => {
    const { error } = await sdb
      .from("ss_templates")
      .insert({ name: w.name, graph: w.graph, category: "meus" });
    if (error) return toast.error(error.message);
    toast.success("Salvo em Meus templates");
  };

  const moveTo = async (w: Workflow, folderId: string | null) => {
    await sdb.from("ss_workflows").update({ folder_id: folderId }).eq("id", w.id);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-primary">Automações</h1>
        <Button
          onClick={() => {
            setAiMode(false);
            setNewOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Criar automação
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar automações"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativas</SelectItem>
            <SelectItem value="paused">Pausadas</SelectItem>
            <SelectItem value="draft">Rascunhos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={trigger} onValueChange={setTrigger}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Gatilho" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os gatilhos</SelectItem>
            {Object.entries(TRIGGER_LABELS).map(([k, l]) => (
              <SelectItem key={k} value={k}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">Mais recentes</SelectItem>
            <SelectItem value="name">Nome</SelectItem>
            <SelectItem value="runs">Mais execuções</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={inContent} onCheckedChange={(v) => setInContent(!!v)} /> Buscar no
          conteúdo
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFolder(null)}
          className={`rounded-full border px-3 py-1 text-sm ${!folder ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}
        >
          Todas
        </button>
        {folders.map((f) => (
          <button
            key={f.id}
            onClick={() => setFolder(f.id)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${folder === f.id ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}
          >
            <Folder className="h-3.5 w-3.5" /> {f.name}
          </button>
        ))}
        <Button variant="ghost" size="sm" onClick={newFolder}>
          <FolderPlus className="mr-1 h-4 w-4" /> Nova pasta
        </Button>
      </div>

      {items === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Blocks className="h-8 w-8 text-accent" />
            <p className="font-semibold">
              Nenhuma automação {items.length ? "com esses filtros" : "ainda"}
            </p>
            {!items.length && (
              <Button onClick={() => setNewOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> Criar automação
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="divide-y rounded-xl border bg-card">
          {visible.map((w) => (
            <div key={w.id} className="flex items-center gap-3 px-4 py-3">
              <Link
                to="/admin/social/automacoes/$id"
                params={{ id: w.id }}
                className="min-w-0 flex-1"
              >
                <p className="truncate font-semibold text-primary hover:underline">{w.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {w.trigger_types.length
                    ? w.trigger_types.map((t) => TRIGGER_LABELS[t]).join(" · ")
                    : "Sem gatilho"}{" "}
                  · {w.runs_count} execuç{w.runs_count === 1 ? "ão" : "ões"}
                </p>
              </Link>
              <Badge
                variant={w.status === "active" ? "default" : "secondary"}
                className={w.status === "active" ? "bg-success text-success-foreground" : ""}
              >
                {STATUS_LABEL[w.status]}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Ações">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {w.status === "active" ? (
                    <DropdownMenuItem onClick={() => setWfStatus(w, "paused")}>
                      Pausar
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => setWfStatus(w, "active")}>
                      Ativar
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => duplicate(w)}>Duplicar</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => saveAsTemplate(w)}>
                    Salvar como template
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => moveTo(w, null)}>
                    Tirar da pasta
                  </DropdownMenuItem>
                  {folders.map((f) => (
                    <DropdownMenuItem key={f.id} onClick={() => moveTo(w, f.id)}>
                      Mover para {f.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => remove(w)}>
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{aiMode ? "Descreva a automação" : "Nova automação"}</DialogTitle>
          </DialogHeader>
          {aiMode ? (
            <div className="space-y-3">
              <Textarea
                rows={5}
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                placeholder='Ex.: "Quando alguém comentar FRANQUIA no reels, responder no comentário e mandar no direct perguntas de nome, cidade e WhatsApp, e etiquetar como lead de franquia."'
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setAiMode(false)}>
                  Voltar
                </Button>
                <Button onClick={createWithAI} disabled={busy}>
                  {busy ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1 h-4 w-4" />
                  )}{" "}
                  Gerar
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  icon: Sparkles,
                  title: "Criar com IA",
                  desc: "Descreva e a IA monta o fluxo.",
                  onClick: () => setAiMode(true),
                },
                {
                  icon: LayoutTemplate,
                  title: "Começar com template",
                  desc: "Modelos prontos da Lavoura.",
                  onClick: () => navigate({ to: "/admin/social/templates" }),
                },
                {
                  icon: Blocks,
                  title: "Criar do zero",
                  desc: "Monte bloco a bloco.",
                  onClick: createBlank,
                },
              ].map(({ icon: Icon, title, desc, onClick }) => (
                <button
                  key={title}
                  onClick={onClick}
                  className="rounded-xl border p-5 text-left transition hover:border-accent hover:bg-accent/5"
                >
                  <Icon className="mb-3 h-7 w-7 text-accent" />
                  <p className="font-semibold text-primary">{title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
