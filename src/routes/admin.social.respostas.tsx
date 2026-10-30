import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Sparkles, Loader2, Pencil, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { sdb, callFn } from "@/lib/social/api";

export const Route = createFileRoute("/admin/social/respostas")({
  component: Respostas,
});

type ReplyList = { id: string; name: string; replies: string[]; updated_at: string };

function Respostas() {
  const [lists, setLists] = useState<ReplyList[] | null>(null);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Partial<ReplyList> | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data }, { data: wfs }] = await Promise.all([
      sdb.from("ss_reply_lists").select("*").order("updated_at", { ascending: false }),
      sdb.from("ss_workflows").select("graph"),
    ]);
    setLists((data ?? []) as ReplyList[]);
    const u: Record<string, number> = {};
    for (const w of wfs ?? []) {
      const id = (w.graph?.nodes ?? []).find((n: { type: string }) => n.type === "trigger")?.data
        ?.replyListId;
      if (id) u[id] = (u[id] ?? 0) + 1;
    }
    setUsage(u);
  };
  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!editing?.name?.trim()) return toast.error("Dê um nome para a lista.");
    const replies = (editing.replies ?? []).map((r) => r.trim()).filter(Boolean);
    if (!replies.length) return toast.error("Adicione pelo menos uma resposta.");
    const payload = { name: editing.name.trim(), replies };
    const { error } = editing.id
      ? await sdb.from("ss_reply_lists").update(payload).eq("id", editing.id)
      : await sdb.from("ss_reply_lists").insert(payload);
    if (error) return toast.error(error.message);
    setEditing(null);
    load();
  };

  const remove = async (l: ReplyList) => {
    if (usage[l.id]) return toast.error("Essa lista está em uso numa automação.");
    if (!window.confirm(`Excluir "${l.name}"?`)) return;
    await sdb.from("ss_reply_lists").delete().eq("id", l.id);
    load();
  };

  const generate = async () => {
    const example = (editing?.replies ?? []).find((r) => r.trim());
    if (!example) return toast.error("Escreva 1 resposta para a IA aprender o tom.");
    setBusy(true);
    try {
      const r = await callFn<{ replies: string[] }>("ss-ai", {
        action: "public_replies",
        example,
        n: 8,
      });
      setEditing((e) => ({
        ...e,
        replies: [...(e?.replies ?? []).filter((x) => x.trim()), ...r.replies],
      }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  const visible = (lists ?? []).filter((l) => l.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-primary">
            Listas de respostas
          </h1>
          <p className="text-sm text-muted-foreground">
            Conjuntos de respostas públicas para reutilizar nos comentários de várias automações.
          </p>
        </div>
        <Button onClick={() => setEditing({ name: "", replies: [""] })}>
          <Plus className="mr-1 h-4 w-4" /> Criar lista
        </Button>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar listas"
          className="pl-9"
        />
      </div>
      {lists === null ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma lista ainda. Crie uma para responder comentários com variedade.
          </CardContent>
        </Card>
      ) : (
        <div className="divide-y rounded-xl border bg-card">
          {visible.map((l) => (
            <div key={l.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-primary">{l.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {l.replies.length} respostas ·{" "}
                  {usage[l.id] ? `em uso em ${usage[l.id]} automação(ões)` : "sem uso"} ·{" "}
                  {new Date(l.updated_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditing(l)} aria-label="Editar">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => remove(l)} aria-label="Excluir">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar lista" : "Nova lista"}</DialogTitle>
          </DialogHeader>
          <Input
            value={editing?.name ?? ""}
            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            placeholder="Nome (ex.: Respostas de reels)"
          />
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {(editing?.replies ?? []).map((r, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={r}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      replies: editing!.replies!.map((x, j) => (j === i ? e.target.value : x)),
                    })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setEditing({ ...editing, replies: editing!.replies!.filter((_, j) => j !== i) })
                  }
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing({ ...editing, replies: [...(editing?.replies ?? []), ""] })}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Resposta
            </Button>
            <Button variant="outline" size="sm" onClick={generate} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-3.5 w-3.5" />
              )}{" "}
              Gerar com IA
            </Button>
            <Button className="ml-auto" onClick={save}>
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
