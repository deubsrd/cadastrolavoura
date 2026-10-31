import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Plus, Loader2, Search, Pencil, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { sdb, callFn, displayName } from "@/lib/social/api";

export const Route = createFileRoute("/admin/social/inbox")({
  component: InboxBoard,
});

type Column = { id: string; name: string; criteria: string; color: string; position: number };
type Conv = {
  id: string;
  column_id: string | null;
  unread: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  ss_contacts: { name: string | null; username: string | null } | null;
};

function InboxBoard() {
  const [cols, setCols] = useState<Column[]>([]);
  const [convs, setConvs] = useState<Conv[] | null>(null);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Partial<Column> | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [suggested, setSuggested] = useState<{ name: string; criteria: string }[] | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const load = async () => {
    const [{ data: c }, { data: v }] = await Promise.all([
      sdb.from("ss_inbox_columns").select("*").order("position"),
      sdb
        .from("ss_conversations")
        .select(
          "id, column_id, unread, last_message_at, last_message_preview, ss_contacts(name, username)",
        )
        .eq("status", "open")
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(400),
    ]);
    setCols((c ?? []) as Column[]);
    setConvs((v ?? []) as unknown as Conv[]);
  };
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const t = q.toLowerCase();
    return (convs ?? []).filter(
      (c) =>
        !t ||
        `${c.ss_contacts?.name ?? ""} ${c.ss_contacts?.username ?? ""} ${c.last_message_preview ?? ""}`
          .toLowerCase()
          .includes(t),
    );
  }, [convs, q]);

  const saveCol = async () => {
    if (!edit?.name?.trim()) return toast.error("Dê um nome à coluna.");
    const payload = {
      name: edit.name.trim(),
      criteria: edit.criteria ?? "",
      color: edit.color ?? "#394f3e",
    };
    const { error } = edit.id
      ? await sdb.from("ss_inbox_columns").update(payload).eq("id", edit.id)
      : await sdb.from("ss_inbox_columns").insert({ ...payload, position: cols.length });
    if (error) return toast.error(error.message);
    setEdit(null);
    load();
  };

  const removeCol = async (c: Column) => {
    if (!window.confirm(`Excluir a coluna "${c.name}"? As conversas voltam para "Outros".`)) return;
    await sdb.from("ss_inbox_columns").delete().eq("id", c.id);
    load();
  };

  const suggest = async () => {
    setAiBusy(true);
    try {
      const r = await callFn<{ columns: { name: string; criteria: string }[] }>("ss-ai", {
        action: "suggest_columns",
      });
      setSuggested(r.columns);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setAiBusy(false);
    }
  };

  const applySuggested = async () => {
    if (!suggested?.length) return;
    const { error } = await sdb
      .from("ss_inbox_columns")
      .insert(suggested.map((s, i) => ({ ...s, position: cols.length + i })));
    if (error) return toast.error(error.message);
    setSuggested(null);
    toast.success("Colunas criadas. A IA distribui as conversas a cada minuto.");
    load();
  };

  const reclassify = async () => {
    await sdb.from("ss_conversations").update({ column_id: null }).eq("status", "open");
    toast.success("A IA vai reorganizar as conversas no próximo minuto.");
    load();
  };

  const drop = async (columnId: string | null) => {
    if (!dragging) return;
    setConvs((cur) =>
      (cur ?? []).map((c) => (c.id === dragging ? { ...c, column_id: columnId } : c)),
    );
    await sdb.from("ss_conversations").update({ column_id: columnId }).eq("id", dragging);
    setDragging(null);
  };

  const columnList: (Column | { id: null; name: string; color: string; criteria: string })[] = [
    ...cols,
    { id: null, name: "Outros", color: "#8a948c", criteria: "" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-primary">Inbox</h1>
          <p className="text-sm text-muted-foreground">
            Colunas inteligentes: a IA agrupa as conversas por assunto e intenção. Arraste para
            corrigir.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={suggest} disabled={aiBusy}>
            {aiBusy ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1 h-4 w-4" />
            )}{" "}
            Criar com IA
          </Button>
          <Button variant="outline" onClick={reclassify}>
            <RefreshCw className="mr-1 h-4 w-4" /> Reclassificar
          </Button>
          <Button onClick={() => setEdit({ name: "", criteria: "", color: "#394f3e" })}>
            <Plus className="mr-1 h-4 w-4" /> Nova coluna
          </Button>
        </div>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar no inbox"
          className="pl-9"
        />
      </div>

      {convs === null ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {columnList.map((col) => {
            const items = filtered.filter(
              (c) =>
                (c.column_id ?? null) === col.id ||
                (col.id === null && c.column_id && !cols.some((x) => x.id === c.column_id)),
            );
            return (
              <div
                key={col.id ?? "outros"}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => drop(col.id)}
                className="flex w-72 shrink-0 flex-col rounded-xl bg-muted/60"
              >
                <div
                  className="flex items-center gap-2 rounded-t-xl px-3 py-2.5 text-sm font-bold text-white"
                  style={{ background: col.color }}
                >
                  <span className="rounded-full bg-white/25 px-1.5 text-xs">{items.length}</span>
                  <span className="flex-1 truncate">{col.name}</span>
                  {col.id && (
                    <>
                      <button onClick={() => setEdit(col as Column)} aria-label="Editar coluna">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => removeCol(col as Column)} aria-label="Excluir coluna">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
                <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto p-2">
                  {items.map((c) => (
                    <Link
                      key={c.id}
                      to="/admin/social/chat"
                      search={{ c: c.id }}
                      draggable
                      onDragStart={() => setDragging(c.id)}
                      className="rounded-lg border bg-card p-2.5 text-sm shadow-sm hover:border-accent"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-semibold">
                          {c.ss_contacts ? displayName(c.ss_contacts) : "Contato"}
                        </p>
                        {c.unread > 0 && (
                          <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
                            {c.unread}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {c.last_message_preview}
                      </p>
                    </Link>
                  ))}
                  {!items.length && (
                    <p className="p-3 text-center text-xs text-muted-foreground">Vazio</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edit?.id ? "Editar coluna" : "Nova coluna"}</DialogTitle>
            <DialogDescription>
              Descreva quando uma conversa deve cair aqui. A IA usa esse texto para classificar.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              value={edit?.name ?? ""}
              onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              placeholder="Ex.: Quer ser franqueado"
            />
            <input
              type="color"
              value={edit?.color ?? "#394f3e"}
              onChange={(e) => setEdit({ ...edit, color: e.target.value })}
              className="h-10 w-12 rounded border"
              aria-label="Cor"
            />
          </div>
          <Textarea
            rows={3}
            value={edit?.criteria ?? ""}
            onChange={(e) => setEdit({ ...edit, criteria: e.target.value })}
            placeholder="Ex.: pessoa pergunta sobre investimento, taxa de franquia ou abrir uma unidade"
          />
          <Button onClick={saveCol}>Salvar</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!suggested} onOpenChange={(v) => !v && setSuggested(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Colunas sugeridas pela IA</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {(suggested ?? []).map((s, i) => (
              <div key={i} className="rounded-lg border p-2.5">
                <p className="font-semibold">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.criteria}</p>
              </div>
            ))}
          </div>
          <Button onClick={applySuggested}>Criar essas colunas</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
