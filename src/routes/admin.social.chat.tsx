import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Search,
  Send,
  Star,
  CheckCheck,
  Paperclip,
  Loader2,
  ArrowLeft,
  Bot,
  User,
  Info,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { sdb, callFn, displayName, within24h, uid } from "@/lib/social/api";
import { ContactPanel } from "@/components/social/ContactPanel";

export const Route = createFileRoute("/admin/social/chat")({
  validateSearch: (s: Record<string, unknown>): { c?: string } => ({
    c: typeof s.c === "string" ? s.c : undefined,
  }),
  component: Chat,
});

type Conv = {
  id: string;
  contact_id: string;
  status: "open" | "done";
  starred: boolean;
  unread: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  ss_contacts: {
    id: string;
    name: string | null;
    username: string | null;
    avatar_url: string | null;
    last_inbound_at: string | null;
  } | null;
};
type Msg = {
  id: string;
  direction: "in" | "out";
  sent_by: "contact" | "automation" | "human";
  content: {
    text?: string;
    attachment?: {
      type: string;
      url?: string;
      payload?: {
        url?: string;
        template_type?: string;
        text?: string;
        elements?: { title: string }[];
      };
    };
  };
  error: string | null;
  created_at: string;
};

function messageText(m: Msg) {
  if (m.content.text) return m.content.text;
  const a = m.content.attachment;
  if (a?.payload?.template_type === "button") return a.payload.text ?? "[botões]";
  if (a?.payload?.template_type === "generic")
    return `[cartões] ${a.payload.elements?.map((e) => e.title).join(" · ") ?? ""}`;
  return null;
}

function Chat() {
  const search = Route.useSearch();
  const [convs, setConvs] = useState<Conv[] | null>(null);
  const [filter, setFilter] = useState<"open" | "done" | "starred" | "unread">("open");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<string | null>(search.c ?? null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [shortcuts, setShortcuts] = useState<{ shortcut: string; text: string }[]>([]);
  const [infoOpen, setInfoOpen] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const activeRef = useRef<string | null>(active);

  const loadConvs = async () => {
    const { data, error } = await sdb
      .from("ss_conversations")
      .select("*, ss_contacts(id, name, username, avatar_url, last_inbound_at)")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(300);
    if (error) toast.error(error.message);
    setConvs((data ?? []) as Conv[]);
  };

  const loadMsgs = async (id: string) => {
    const { data } = await sdb
      .from("ss_messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at")
      .limit(500);
    setMsgs((data ?? []) as Msg[]);
    await sdb.from("ss_conversations").update({ unread: 0 }).eq("id", id);
    setTimeout(() => bottom.current?.scrollIntoView(), 50);
  };

  useEffect(() => {
    loadConvs();
    sdb
      .from("ss_shortcuts")
      .select("shortcut, text")
      .order("shortcut")
      .then(({ data }) => setShortcuts(data ?? []));
    const ch = supabase
      .channel(`ss-chat-${uid()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ss_conversations" }, () =>
        loadConvs(),
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ss_messages" }, (p) => {
        const m = p.new as Msg & { conversation_id: string };
        setMsgs((cur) =>
          activeRef.current === m.conversation_id && !cur.some((x) => x.id === m.id)
            ? [...cur, m]
            : cur,
        );
        setTimeout(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), 50);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  useEffect(() => {
    activeRef.current = active;
    if (active) loadMsgs(active);
  }, [active]);

  const visible = useMemo(() => {
    const term = q.toLowerCase();
    return (convs ?? [])
      .filter((c) =>
        filter === "starred" ? c.starred : filter === "unread" ? c.unread > 0 : c.status === filter,
      )
      .filter(
        (c) =>
          !term ||
          `${c.ss_contacts?.name ?? ""} ${c.ss_contacts?.username ?? ""} ${c.last_message_preview ?? ""}`
            .toLowerCase()
            .includes(term),
      );
  }, [convs, filter, q]);

  const conv = convs?.find((c) => c.id === active) ?? null;
  const canReply = within24h(conv?.ss_contacts?.last_inbound_at ?? null);

  const send = async (attachment?: { type: string; url: string }) => {
    if (!active || (!text.trim() && !attachment)) return;
    setSending(true);
    try {
      await callFn("ss-engine", {
        action: "send",
        conversation_id: active,
        text: attachment ? "" : text,
        attachment,
      });
      if (!attachment) setText("");
      loadMsgs(active);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não enviou");
    } finally {
      setSending(false);
    }
  };

  const upload = async (f: File) => {
    const type = f.type.startsWith("image/")
      ? "image"
      : f.type.startsWith("video/")
        ? "video"
        : f.type.startsWith("audio/")
          ? "audio"
          : "file";
    const path = `chat/${uid("f")}.${f.name.split(".").pop()}`;
    const { error } = await supabase.storage
      .from("social-midia")
      .upload(path, f, { contentType: f.type });
    if (error) return toast.error(error.message);
    await send({
      type,
      url: supabase.storage.from("social-midia").getPublicUrl(path).data.publicUrl,
    });
  };

  const patchConv = async (p: Partial<Conv>) => {
    if (!conv) return;
    await sdb.from("ss_conversations").update(p).eq("id", conv.id);
    loadConvs();
  };

  const slash = text.startsWith("/")
    ? shortcuts.filter((s) => s.shortcut.startsWith(text.slice(1).toLowerCase()))
    : [];

  return (
    <div className="flex h-[calc(100dvh-11rem)] overflow-hidden rounded-xl border bg-card">
      {/* lista */}
      <aside className={`${active ? "hidden md:flex" : "flex"} w-full flex-col border-r md:w-80`}>
        <div className="space-y-2 border-b p-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar conversas"
              className="pl-9"
            />
          </div>
          <div className="flex gap-1 text-xs">
            {(
              [
                ["open", "Abertas"],
                ["unread", "Não lidas"],
                ["starred", "Salvas"],
                ["done", "Concluídas"],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`rounded-full px-2.5 py-1 font-medium ${filter === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {convs === null ? (
            <Loader2 className="mx-auto mt-10 h-5 w-5 animate-spin" />
          ) : visible.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma conversa aqui.</p>
          ) : (
            visible.map((c) => (
              <button
                key={c.id}
                onClick={() => setActive(c.id)}
                className={`flex w-full items-center gap-3 border-b px-3 py-3 text-left hover:bg-muted/60 ${active === c.id ? "bg-muted" : ""}`}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={c.ss_contacts?.avatar_url ?? undefined} />
                  <AvatarFallback>
                    {(c.ss_contacts?.username ?? "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">
                      {c.ss_contacts ? displayName(c.ss_contacts) : "Contato"}
                    </p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {c.last_message_at
                        ? new Date(c.last_message_at).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{c.last_message_preview}</p>
                </div>
                {c.unread > 0 && (
                  <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
                    {c.unread}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </aside>

      {/* conversa */}
      <section className={`${active ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
        {!conv ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Escolha uma conversa
          </div>
        ) : (
          <>
            <header className="flex items-center gap-2 border-b px-3 py-2">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setActive(null)}
                aria-label="Voltar"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <p className="flex-1 truncate font-semibold">
                {conv.ss_contacts ? displayName(conv.ss_contacts) : "Contato"}
              </p>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => patchConv({ starred: !conv.starred })}
                aria-label="Salvar conversa"
              >
                <Star className={`h-4 w-4 ${conv.starred ? "fill-accent text-accent" : ""}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => patchConv({ status: conv.status === "open" ? "done" : "open" })}
              >
                {conv.status === "open" ? (
                  <>
                    <CheckCheck className="mr-1 h-4 w-4" /> Concluir
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-1 h-4 w-4" /> Reabrir
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="xl:hidden"
                onClick={() => setInfoOpen(true)}
                aria-label="Contato"
              >
                <Info className="h-4 w-4" />
              </Button>
            </header>
            <div className="flex-1 space-y-2 overflow-y-auto bg-muted/30 p-4">
              {msgs.map((m) => {
                const t = messageText(m);
                const url = m.content.attachment?.url ?? m.content.attachment?.payload?.url;
                return (
                  <div
                    key={m.id}
                    className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${m.direction === "out" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-card"} ${m.error ? "border border-destructive" : ""}`}
                    >
                      {t && <p className="whitespace-pre-wrap break-words">{t}</p>}
                      {!t &&
                        url &&
                        (m.content.attachment?.type === "image" ||
                        m.content.attachment?.type === "story_mention" ? (
                          <img src={url} alt="" className="max-h-60 rounded-lg" />
                        ) : (
                          <a href={url} target="_blank" rel="noreferrer" className="underline">
                            [{m.content.attachment?.type}]
                          </a>
                        ))}
                      {!t && !url && <p className="italic opacity-70">[mídia]</p>}
                      <p
                        className={`mt-1 flex items-center gap-1 text-[10px] ${m.direction === "out" ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                      >
                        {m.sent_by === "automation" && <Bot className="h-3 w-3" />}
                        {m.sent_by === "human" && <User className="h-3 w-3" />}
                        {new Date(m.created_at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {m.error && (
                          <span className="text-destructive"> · não enviada: {m.error}</span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottom} />
            </div>
            <footer className="relative border-t p-3">
              {slash.length > 0 && (
                <div className="absolute bottom-full left-3 mb-1 w-72 rounded-lg border bg-popover p-1 shadow-lg">
                  {slash.map((s) => (
                    <button
                      key={s.shortcut}
                      onClick={() => setText(s.text)}
                      className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      <b>/{s.shortcut}</b>{" "}
                      <span className="text-muted-foreground">{s.text.slice(0, 40)}</span>
                    </button>
                  ))}
                </div>
              )}
              {!canReply && (
                <p className="mb-2 text-xs text-muted-foreground">
                  Mais de 24h desde a última mensagem dessa pessoa: o Instagram só libera responder
                  quando ela escrever de novo.
                </p>
              )}
              <div className="flex items-end gap-2">
                <label
                  className={`cursor-pointer rounded-md p-2 hover:bg-muted ${!canReply ? "pointer-events-none opacity-40" : ""}`}
                  aria-label="Anexar"
                >
                  <Paperclip className="h-4 w-4" />
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,video/*,audio/*,application/pdf"
                    onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
                  />
                </label>
                <Textarea
                  rows={1}
                  value={text}
                  disabled={!canReply}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Escreva... (digite / para atalhos)"
                  className="max-h-40 min-h-10 resize-none"
                />
                <Button
                  onClick={() => send()}
                  disabled={!canReply || sending || !text.trim()}
                  size="icon"
                  aria-label="Enviar"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </footer>
          </>
        )}
      </section>

      {conv && (
        <aside className="hidden w-80 overflow-y-auto border-l xl:block">
          <ContactPanel contactId={conv.contact_id} onChanged={loadConvs} />
        </aside>
      )}
      <Sheet open={infoOpen} onOpenChange={setInfoOpen}>
        <SheetContent className="overflow-y-auto p-0">
          {conv && <ContactPanel contactId={conv.contact_id} onChanged={loadConvs} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
