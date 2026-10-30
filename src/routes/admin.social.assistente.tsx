import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Send,
  Loader2,
  Sparkles,
  Workflow as WorkflowIcon,
  Lightbulb,
  BarChart3,
  Inbox,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { callFn, createWorkflow, type FlowGraph } from "@/lib/social/api";

export const Route = createFileRoute("/admin/social/assistente")({
  component: Assistente,
});

type Msg = {
  role: "user" | "assistant";
  content: string;
  workflow?: { name: string; graph: FlowGraph } | null;
};

const STARTERS = [
  { icon: WorkflowIcon, label: "Criar automação", prompt: "Quero criar uma automação: " },
  {
    icon: Lightbulb,
    label: "Recomendar automação",
    prompt:
      "Olhando meu perfil e minhas automações, qual automação eu deveria criar agora e por quê?",
  },
  { icon: BarChart3, label: "Analisar meu perfil", prompt: "__analyze__" },
  {
    icon: Inbox,
    label: "Sugerir colunas de inbox",
    prompt: "Que colunas eu deveria ter no inbox para organizar as conversas da Lavoura?",
  },
];

const STORE_KEY = "ss-assistente-historico";

function Assistente() {
  const navigate = useNavigate();
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]");
    } catch {
      return [];
    }
  });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(msgs.slice(-30)));
    } catch {
      /* armazenamento indisponível */
    }
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const send = async (content: string) => {
    if (!content.trim() || busy) return;
    setText("");
    setBusy(true);
    if (content === "__analyze__") {
      setMsgs((m) => [...m, { role: "user", content: "Analise meu perfil" }]);
      try {
        const r = await callFn<{ text: string }>("ss-ai", { action: "analyze_profile" });
        setMsgs((m) => [...m, { role: "assistant", content: r.text }]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro");
      } finally {
        setBusy(false);
      }
      return;
    }
    const next = [...msgs, { role: "user" as const, content }];
    setMsgs(next);
    try {
      const r = await callFn<{ text: string; workflow: Msg["workflow"] }>("ss-ai", {
        action: "chat",
        messages: next.map(({ role, content }) => ({ role, content })),
      });
      setMsgs((m) => [...m, { role: "assistant", content: r.text, workflow: r.workflow }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
      setMsgs(msgs);
      setText(content);
    } finally {
      setBusy(false);
    }
  };

  const openWorkflow = async (w: NonNullable<Msg["workflow"]>) => {
    try {
      const id = await createWorkflow(w.name || "Automação do Assistente", w.graph);
      navigate({ to: "/admin/social/automacoes/$id", params: { id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="flex h-[calc(100dvh-11rem)] flex-col rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <p className="flex items-center gap-2 font-bold text-primary">
          <Sparkles className="h-4 w-4 text-accent" /> Assistente de Social Selling
        </p>
        {msgs.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setMsgs([])}>
            <RotateCcw className="mr-1 h-4 w-4" /> Nova conversa
          </Button>
        )}
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {msgs.length === 0 && (
          <div className="mx-auto max-w-xl py-8 text-center">
            <p className="text-lg font-bold text-primary">Como posso ajudar?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tire dúvidas, peça ideias ou crie automações conversando. Revise antes de ativar.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {STARTERS.map(({ icon: Icon, label, prompt }) => (
                <button
                  key={label}
                  onClick={() => (prompt.endsWith(": ") ? setText(prompt) : send(prompt))}
                  className="flex items-center gap-2 rounded-xl border p-3 text-left text-sm font-medium hover:border-accent hover:bg-accent/5"
                >
                  <Icon className="h-4 w-4 text-accent" /> {label}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.workflow && (
                <Button
                  size="sm"
                  className="mt-3 bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={() => openWorkflow(m.workflow!)}
                >
                  <WorkflowIcon className="mr-1 h-4 w-4" /> Abrir "{m.workflow.name}" no editor
                </Button>
              )}
            </div>
          </div>
        ))}
        {busy && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        <div ref={bottom} />
      </div>
      <div className="flex items-end gap-2 border-t p-3">
        <Textarea
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(text);
            }
          }}
          placeholder="Pergunte ou descreva a automação..."
          className="max-h-40 min-h-10 resize-none"
        />
        <Button
          size="icon"
          onClick={() => send(text)}
          disabled={busy || !text.trim()}
          aria-label="Enviar"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
