import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Search,
  Send,
  Loader2,
  ArrowLeft,
  Bot,
  User,
  Info,
  Hand,
  AlertTriangle,
  Check,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  sdrDb,
  callSdr,
  ETAPAS,
  ORIGENS,
  CRITERIOS,
  FAIXA_CLASS,
  etapaLabel,
  leadName,
  formatPhone,
  within24h,
  minutesBetween,
  type Lead,
  type SdrMessage,
} from "@/lib/sdr/api";

export const Route = createFileRoute("/admin/sdr/")({
  validateSearch: (s: Record<string, unknown>): { l?: string } => ({
    l: typeof s.l === "string" ? s.l : undefined,
  }),
  component: Conversas,
});

type Filtro = "todos" | "humano" | "nao_lidas" | "qualificados";

function Conversas() {
  const search = Route.useSearch();
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<string | null>(search.l ?? null);
  const [msgs, setMsgs] = useState<SdrMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const activeRef = useRef<string | null>(active);

  const loadLeads = async () => {
    const { data, error } = await sdrDb
      .from("sdr_leads")
      .select("*")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(300);
    if (error) toast.error(error.message);
    setLeads((data ?? []) as Lead[]);
  };

  const loadMsgs = async (id: string) => {
    const { data } = await sdrDb
      .from("sdr_messages")
      .select("*")
      .eq("lead_id", id)
      .order("created_at")
      .limit(500);
    setMsgs((data ?? []) as SdrMessage[]);
    await sdrDb.from("sdr_leads").update({ unread: 0 }).eq("id", id);
    setTimeout(() => bottom.current?.scrollIntoView(), 50);
  };

  useEffect(() => {
    loadLeads();
    const ch = supabase
      .channel(`sdr-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sdr_leads" }, () =>
        loadLeads(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "sdr_messages" }, (p) => {
        const m = p.new as SdrMessage;
        if (!m?.id || activeRef.current !== m.lead_id) return;
        setMsgs((cur) =>
          cur.some((x) => x.id === m.id) ? cur.map((x) => (x.id === m.id ? m : x)) : [...cur, m],
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
    return (leads ?? [])
      .filter((l) =>
        filtro === "humano"
          ? l.precisa_humano
          : filtro === "nao_lidas"
            ? l.unread > 0
            : filtro === "qualificados"
              ? l.faixa === "A" || l.faixa === "B"
              : true,
      )
      .filter(
        (l) =>
          !term ||
          `${leadName(l)} ${l.wa_id} ${l.cidade ?? ""} ${l.last_message_preview ?? ""}`
            .toLowerCase()
            .includes(term),
      );
  }, [leads, filtro, q]);

  const lead = leads?.find((l) => l.id === active) ?? null;
  const canReply = within24h(lead?.last_inbound_at ?? null);

  const send = async () => {
    if (!lead || !text.trim()) return;
    setSending(true);
    try {
      await callSdr({ action: "send", lead_id: lead.id, text });
      setText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não enviou");
    } finally {
      setSending(false);
    }
  };

  const setAi = async (ativa: boolean) => {
    if (!lead) return;
    try {
      await callSdr({ action: "set_ai", lead_id: lead.id, ativa });
      toast.success(ativa ? "Conversa devolvida à IA" : "Você assumiu a conversa");
      loadLeads();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

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
              placeholder="Buscar nome, telefone, cidade"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1 text-xs">
            {(
              [
                ["todos", "Todos"],
                ["humano", "Precisa humano"],
                ["nao_lidas", "Não lidas"],
                ["qualificados", "A e B"],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setFiltro(k)}
                className={`rounded-full px-2.5 py-1 font-medium ${filtro === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {leads === null ? (
            <Loader2 className="mx-auto mt-10 h-5 w-5 animate-spin" />
          ) : visible.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {leads.length === 0
                ? "Nenhum lead ainda. Quando alguém mandar mensagem para o número do WhatsApp, aparece aqui."
                : "Nenhuma conversa neste filtro."}
            </p>
          ) : (
            visible.map((l) => (
              <button
                key={l.id}
                onClick={() => setActive(l.id)}
                className={`flex w-full items-center gap-3 border-b px-3 py-3 text-left hover:bg-muted/60 ${active === l.id ? "bg-muted" : ""}`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${l.faixa ? FAIXA_CLASS[l.faixa] : "bg-muted text-muted-foreground"}`}
                  title={l.faixa ? `Lead ${l.faixa} · nota ${l.nota}` : "Ainda sem nota"}
                >
                  {l.faixa ?? "–"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{leadName(l)}</p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {l.last_message_at
                        ? new Date(l.last_message_at).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {l.precisa_humano && (
                      <AlertTriangle className="mr-1 inline h-3 w-3 text-destructive" />
                    )}
                    {l.last_message_preview}
                  </p>
                </div>
                {l.unread > 0 && (
                  <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
                    {l.unread}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </aside>

      {/* conversa */}
      <section className={`${active ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
        {!lead ? (
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
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{leadName(lead)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {etapaLabel(lead.etapa)} · {lead.ia_ativa ? "IA atendendo" : "Atendimento humano"}
                </p>
              </div>
              {lead.ia_ativa ? (
                <Button variant="outline" size="sm" onClick={() => setAi(false)}>
                  <Hand className="mr-1 h-4 w-4" /> Assumir
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAi(true)}
                  disabled={lead.opt_out}
                >
                  <Bot className="mr-1 h-4 w-4" /> Devolver à IA
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="xl:hidden"
                onClick={() => setInfoOpen(true)}
                aria-label="Dados do lead"
              >
                <Info className="h-4 w-4" />
              </Button>
            </header>

            {lead.precisa_humano && (
              <div className="flex items-start gap-2 border-b bg-destructive/10 px-4 py-2 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <span>{lead.motivo_humano ?? "Precisa de atendimento humano."}</span>
              </div>
            )}

            <div className="flex-1 space-y-2 overflow-y-auto bg-muted/30 p-4">
              {msgs.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${m.direction === "out" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-card"} ${m.status === "failed" ? "border border-destructive" : ""}`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p
                      className={`mt-1 flex items-center gap-1 text-[10px] ${m.direction === "out" ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                    >
                      {m.sent_by === "ia" && <Bot className="h-3 w-3" />}
                      {m.sent_by === "humano" && <User className="h-3 w-3" />}
                      {new Date(m.created_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {m.direction === "out" && m.status === "sent" && (
                        <Check className="h-3 w-3" />
                      )}
                      {m.direction === "out" &&
                        (m.status === "delivered" || m.status === "read") && (
                          <CheckCheck
                            className={`h-3 w-3 ${m.status === "read" ? "text-accent" : ""}`}
                          />
                        )}
                      {m.error && (
                        <span className="text-destructive"> · não enviada: {m.error}</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottom} />
            </div>

            <footer className="border-t p-3">
              {!canReply ? (
                <p className="mb-2 text-xs text-muted-foreground">
                  Mais de 24h desde a última mensagem do lead: o WhatsApp só libera texto livre
                  quando ele escrever de novo. (Templates de follow-up chegam na fase 3.)
                </p>
              ) : (
                lead.ia_ativa && (
                  <p className="mb-2 text-xs text-muted-foreground">
                    Ao enviar uma mensagem, você assume a conversa e a IA pausa neste lead.
                  </p>
                )
              )}
              <div className="flex items-end gap-2">
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
                  placeholder="Escreva..."
                  className="max-h-40 min-h-10 resize-none"
                />
                <Button
                  onClick={send}
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

      {lead && (
        <aside className="hidden w-80 overflow-y-auto border-l xl:block">
          <LeadPanel lead={lead} onChanged={loadLeads} />
        </aside>
      )}
      <Sheet open={infoOpen} onOpenChange={setInfoOpen}>
        <SheetContent className="overflow-y-auto p-0">
          {lead && <LeadPanel lead={lead} onChanged={loadLeads} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function LeadPanel({ lead, onChanged }: { lead: Lead; onChanged: () => void }) {
  const [form, setForm] = useState({
    nome: lead.nome ?? "",
    cidade: lead.cidade ?? "",
    bairro: lead.bairro ?? "",
    motivo_perda: lead.motivo_perda ?? "",
    observacoes: lead.observacoes ?? "",
  });
  useEffect(() => {
    setForm({
      nome: lead.nome ?? "",
      cidade: lead.cidade ?? "",
      bairro: lead.bairro ?? "",
      motivo_perda: lead.motivo_perda ?? "",
      observacoes: lead.observacoes ?? "",
    });
  }, [lead.id, lead.nome, lead.cidade, lead.bairro, lead.motivo_perda, lead.observacoes]);

  const patch = async (p: Partial<Lead>) => {
    const { error } = await sdrDb.from("sdr_leads").update(p).eq("id", lead.id);
    if (error) toast.error(error.message);
    else onChanged();
  };
  const saveText = (k: keyof typeof form) => {
    const v = form[k].trim() || null;
    if (v !== (lead[k] ?? null)) patch({ [k]: v } as Partial<Lead>);
  };

  const resposta1 = minutesBetween(lead.entrou_em, lead.primeiro_contato_em);
  const anuncio = lead.anuncio as { headline?: string; source_url?: string } | null;

  return (
    <div className="space-y-4 p-4">
      <div>
        <p className="font-semibold">{leadName(lead)}</p>
        <a
          href={`https://wa.me/${lead.wa_id}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-muted-foreground underline"
        >
          {formatPhone(lead.wa_id)}
        </a>
        {lead.opt_out && (
          <p className="mt-1 text-xs font-medium text-destructive">
            Pediu para não receber mensagens
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 rounded-lg border p-3">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ${lead.faixa ? FAIXA_CLASS[lead.faixa] : "bg-muted text-muted-foreground"}`}
        >
          {lead.faixa ?? "–"}
        </div>
        <div className="text-sm">
          <p className="font-semibold">
            {lead.nota !== null ? `Nota ${lead.nota} de 10` : "Filtro em andamento"}
          </p>
          <p className="text-xs text-muted-foreground">
            {Object.keys(lead.respostas ?? {}).length} de 5 respostas
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        {CRITERIOS.map((c) => {
          const r = lead.respostas?.[c.key];
          return (
            <div key={c.key} className="flex items-start justify-between gap-2 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{c.label}</p>
                <p className="text-xs text-muted-foreground">{r?.resposta ?? "—"}</p>
              </div>
              <span className="shrink-0 text-xs font-semibold">{r ? `${r.pontos} pts` : ""}</span>
            </div>
          );
        })}
      </div>

      <Campo label="Etapa do funil">
        <Select value={lead.etapa} onValueChange={(v) => patch({ etapa: v as Lead["etapa"] })}>
          <SelectTrigger>
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
      </Campo>

      <Campo label="Origem">
        <Select value={lead.origem} onValueChange={(v) => patch({ origem: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ORIGENS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {anuncio?.headline && (
          <p className="text-xs text-muted-foreground">Anúncio: {anuncio.headline}</p>
        )}
      </Campo>

      <Campo label="Nome">
        <Input
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          onBlur={() => saveText("nome")}
        />
      </Campo>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Cidade">
          <Input
            value={form.cidade}
            onChange={(e) => setForm({ ...form, cidade: e.target.value })}
            onBlur={() => saveText("cidade")}
          />
        </Campo>
        <Campo label="Bairro">
          <Input
            value={form.bairro}
            onChange={(e) => setForm({ ...form, bairro: e.target.value })}
            onBlur={() => saveText("bairro")}
          />
        </Campo>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-muted/60 p-2">
          <p className="text-muted-foreground">Entrou em</p>
          <p className="font-medium">
            {new Date(lead.entrou_em).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="rounded-lg bg-muted/60 p-2">
          <p className="text-muted-foreground">1ª resposta</p>
          <p className="font-medium">
            {resposta1 === null ? "—" : resposta1 < 1 ? "menos de 1 min" : `${resposta1} min`}
          </p>
        </div>
      </div>

      {(lead.etapa === "perdido" || lead.etapa === "nutricao") && (
        <Campo label="Motivo de perda">
          <Input
            value={form.motivo_perda}
            onChange={(e) => setForm({ ...form, motivo_perda: e.target.value })}
            onBlur={() => saveText("motivo_perda")}
            placeholder="Ex.: sem capital, cidade fora do plano"
          />
        </Campo>
      )}

      <Campo label="Observações">
        <Textarea
          rows={3}
          value={form.observacoes}
          onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
          onBlur={() => saveText("observacoes")}
        />
      </Campo>

      {lead.precisa_humano && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => patch({ precisa_humano: false })}
        >
          <Check className="mr-1 h-4 w-4" /> Marcar alerta como resolvido
        </Button>
      )}
    </div>
  );
}
