import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Search,
  Download,
  Tag as TagIcon,
  Ban,
  Send,
  Loader2,
  Bookmark,
  X,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { sdb, callFn, displayName, within24h, type Contact, type Tag } from "@/lib/social/api";
import { ContactPanel } from "@/components/social/ContactPanel";

export const Route = createFileRoute("/admin/social/contatos")({
  component: Contatos,
});

type Filters = { q: string; tag: string; has: string; follows: string; window: string };
const EMPTY: Filters = { q: "", tag: "all", has: "all", follows: "all", window: "all" };
const SAVED_KEY = "ss-contatos-filtros";

function readSaved(): { name: string; f: Filters }[] {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function Contatos() {
  const [rows, setRows] = useState<Contact[] | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [f, setF] = useState<Filters>(EMPTY);
  const [saved, setSaved] = useState<{ name: string; f: Filters }[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const [dmOpen, setDmOpen] = useState(false);
  const [dmText, setDmText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data, error }, { data: t }] = await Promise.all([
      sdb
        .from("ss_contacts")
        .select("*, ss_contact_tags(tag_id)")
        .order("last_interaction_at", { ascending: false, nullsFirst: false })
        .limit(5000),
      sdb.from("ss_tags").select("*").order("name"),
    ]);
    if (error) toast.error(error.message);
    setRows((data ?? []) as Contact[]);
    setTags((t ?? []) as Tag[]);
  };
  useEffect(() => {
    load();
    setSaved(readSaved());
  }, []);

  const visible = useMemo(() => {
    const term = f.q.toLowerCase();
    return (rows ?? []).filter((c) => {
      if (
        term &&
        !`${c.name ?? ""} ${c.username ?? ""} ${c.email ?? ""} ${c.whatsapp ?? ""}`
          .toLowerCase()
          .includes(term)
      )
        return false;
      if (f.tag !== "all" && !(c.ss_contact_tags ?? []).some((t) => t.tag_id === f.tag))
        return false;
      if (f.has === "whatsapp" && !c.whatsapp) return false;
      if (f.has === "email" && !c.email) return false;
      if (f.follows === "yes" && c.follows_business !== true) return false;
      if (f.follows === "no" && c.follows_business !== false) return false;
      if (f.window === "open" && !within24h(c.last_inbound_at)) return false;
      if (f.window === "blocked" && !c.blocked) return false;
      return true;
    });
  }, [rows, f]);

  const tagName = (id: string) => tags.find((t) => t.id === id);
  const ids = [...sel];
  const allChecked = visible.length > 0 && visible.every((c) => sel.has(c.id));

  const saveFilter = () => {
    const name = window.prompt("Nome do filtro salvo");
    if (!name?.trim()) return;
    const next = [...saved.filter((s) => s.name !== name), { name: name.trim(), f }];
    setSaved(next);
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    } catch {
      /* armazenamento indisponível */
    }
  };

  const bulkTag = async (tagId: string, add: boolean) => {
    if (add)
      await sdb
        .from("ss_contact_tags")
        .upsert(ids.map((id) => ({ contact_id: id, tag_id: tagId })));
    else await sdb.from("ss_contact_tags").delete().in("contact_id", ids).eq("tag_id", tagId);
    toast.success(`${ids.length} contato(s) atualizados`);
    load();
  };

  const bulkBlock = async (blocked: boolean) => {
    await sdb.from("ss_contacts").update({ blocked }).in("id", ids);
    load();
  };

  const bulkDelete = async () => {
    if (
      !window.confirm(
        `Excluir ${ids.length} contato(s) e as conversas deles? Não dá para desfazer.`,
      )
    )
      return;
    await sdb.from("ss_contacts").delete().in("id", ids);
    setSel(new Set());
    load();
  };

  const exportCsv = () => {
    const list = ids.length ? visible.filter((c) => sel.has(c.id)) : visible;
    const head = [
      "nome",
      "instagram",
      "whatsapp",
      "email",
      "pontos",
      "segue",
      "etiquetas",
      "ultima_interacao",
      "criado_em",
    ];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = list.map((c) =>
      [
        c.name,
        c.username ? `@${c.username}` : "",
        c.whatsapp,
        c.email,
        c.score,
        c.follows_business == null ? "" : c.follows_business ? "sim" : "não",
        (c.ss_contact_tags ?? [])
          .map((t) => tagName(t.tag_id)?.name)
          .filter(Boolean)
          .join(", "),
        c.last_interaction_at,
        c.created_at,
      ]
        .map(esc)
        .join(";"),
    );
    const blob = new Blob(["﻿" + [head.join(";"), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `contatos-instagram-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const bulkDm = async () => {
    setBusy(true);
    try {
      const r = await callFn<{ sent: number; skipped: number }>("ss-engine", {
        action: "bulk_send",
        contact_ids: ids,
        text: dmText,
      });
      toast.success(
        `Enviado para ${r.sent}. ${r.skipped ? `${r.skipped} fora da janela de 24h.` : ""}`,
      );
      setDmOpen(false);
      setDmText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  const inWindow = visible.filter((c) => sel.has(c.id) && within24h(c.last_inbound_at)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-primary">
          Contatos{" "}
          <span className="text-base font-medium text-muted-foreground">({visible.length})</span>
        </h1>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="mr-1 h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={f.q}
            onChange={(e) => setF({ ...f, q: e.target.value })}
            placeholder="Nome, @, e-mail ou WhatsApp"
            className="pl-9"
          />
        </div>
        <Select value={f.tag} onValueChange={(tag) => setF({ ...f, tag })}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas etiquetas</SelectItem>
            {tags.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={f.has} onValueChange={(has) => setF({ ...f, has })}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Com ou sem dados</SelectItem>
            <SelectItem value="whatsapp">Com WhatsApp</SelectItem>
            <SelectItem value="email">Com e-mail</SelectItem>
          </SelectContent>
        </Select>
        <Select value={f.follows} onValueChange={(follows) => setF({ ...f, follows })}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Segue ou não</SelectItem>
            <SelectItem value="yes">Segue</SelectItem>
            <SelectItem value="no">Não segue</SelectItem>
          </SelectContent>
        </Select>
        <Select value={f.window} onValueChange={(window) => setF({ ...f, window })}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="open">Janela 24h aberta</SelectItem>
            <SelectItem value="blocked">Bloqueados</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={saveFilter}>
          <Bookmark className="mr-1 h-4 w-4" /> Salvar filtro
        </Button>
      </div>
      {saved.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {saved.map((s) => (
            <span
              key={s.name}
              className="inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs"
            >
              <button onClick={() => setF(s.f)} className="font-medium">
                {s.name}
              </button>
              <button
                aria-label="Apagar filtro"
                onClick={() => {
                  const n = saved.filter((x) => x.name !== s.name);
                  setSaved(n);
                  try {
                    localStorage.setItem(SAVED_KEY, JSON.stringify(n));
                  } catch {
                    /* */
                  }
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {sel.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground">
          <span className="font-semibold">{sel.size} selecionado(s)</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="secondary">
                <TagIcon className="mr-1 h-4 w-4" /> Etiquetas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Adicionar</DropdownMenuLabel>
              {tags.map((t) => (
                <DropdownMenuItem key={`a${t.id}`} onClick={() => bulkTag(t.id, true)}>
                  {t.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Remover</DropdownMenuLabel>
              {tags.map((t) => (
                <DropdownMenuItem key={`r${t.id}`} onClick={() => bulkTag(t.id, false)}>
                  {t.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="secondary" onClick={() => setDmOpen(true)}>
            <Send className="mr-1 h-4 w-4" /> Mandar DM
          </Button>
          <Button size="sm" variant="secondary" onClick={() => bulkBlock(true)}>
            <Ban className="mr-1 h-4 w-4" /> Bloquear
          </Button>
          <Button size="sm" variant="secondary" onClick={() => bulkBlock(false)}>
            Desbloquear
          </Button>
          <Button size="sm" variant="secondary" onClick={bulkDelete}>
            <Trash2 className="mr-1 h-4 w-4" /> Excluir
          </Button>
          <button className="ml-auto underline" onClick={() => setSel(new Set())}>
            Limpar
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allChecked}
                  onCheckedChange={(v) => setSel(v ? new Set(visible.map((c) => c.id)) : new Set())}
                  aria-label="Selecionar todos"
                />
              </TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Etiquetas</TableHead>
              <TableHead className="text-right">Pontos</TableHead>
              <TableHead>Última interação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows === null ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </TableCell>
              </TableRow>
            ) : visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum contato. Eles aparecem aqui quando alguém interage com o Instagram.
                </TableCell>
              </TableRow>
            ) : (
              visible.slice(0, 500).map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => setOpen(c.id)}>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={sel.has(c.id)}
                      onCheckedChange={(v) => {
                        const n = new Set(sel);
                        if (v) n.add(c.id);
                        else n.delete(c.id);
                        setSel(n);
                      }}
                      aria-label="Selecionar"
                    />
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{displayName(c)}</p>
                    {c.name && c.username && (
                      <p className="text-xs text-muted-foreground">@{c.username}</p>
                    )}
                    {c.blocked && (
                      <Badge variant="destructive" className="mt-1">
                        Bloqueado
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{c.whatsapp ?? "—"}</TableCell>
                  <TableCell className="text-sm">{c.email ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(c.ss_contact_tags ?? []).map((t) => {
                        const tag = tagName(t.tag_id);
                        return tag ? (
                          <span
                            key={t.tag_id}
                            className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                            style={{ background: tag.color }}
                          >
                            {tag.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{c.score}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.last_interaction_at
                      ? new Date(c.last_interaction_at).toLocaleString("pt-BR")
                      : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {visible.length > 500 && (
          <p className="p-3 text-center text-xs text-muted-foreground">
            Mostrando 500 de {visible.length}. Refine os filtros ou exporte o CSV.
          </p>
        )}
      </div>

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent className="overflow-y-auto p-0">
          {open && <ContactPanel contactId={open} onChanged={load} />}
        </SheetContent>
      </Sheet>

      <Dialog open={dmOpen} onOpenChange={setDmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mandar DM para {sel.size} contato(s)</DialogTitle>
            <DialogDescription>
              O Instagram só permite para quem escreveu nas últimas 24h: {inWindow} de {sel.size}{" "}
              estão dentro da janela. Os demais são pulados.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            value={dmText}
            onChange={(e) => setDmText(e.target.value)}
            placeholder="Mensagem"
          />
          <Button onClick={bulkDm} disabled={busy || !dmText.trim() || !inWindow}>
            {busy ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-1 h-4 w-4" />
            )}{" "}
            Enviar
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
