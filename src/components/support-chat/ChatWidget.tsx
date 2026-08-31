import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatDuvidas } from "@/hooks/use-chat-duvidas";

const SUGESTOES = [
  "O que fazer quando aparece o erro UE?",
  "Como faço a limpeza do filtro da bomba?",
  "Qual a dose certa de detergente e amaciante?",
];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, sending, error, sendMessage } = useChatDuvidas();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const submit = (text: string) => {
    if (!text.trim() || sending) return;
    sendMessage(text);
    setInput("");
  };

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Tira-dúvidas Lavoura"
          className="fixed bottom-24 right-4 z-50 flex h-[min(560px,70vh)] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg sm:bottom-24 sm:right-6"
        >
          <div className="flex items-center justify-between border-b border-border bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-semibold">Tira-dúvidas Lavoura</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar chat"
              title="Fechar"
              className="text-primary-foreground/80 hover:text-primary-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <ScrollArea className="flex-1 px-4 py-3">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Pergunte sobre operação do dia a dia, uso das máquinas, erros no visor ou
                  manutenção. Alguns exemplos:
                </p>
                <div className="flex flex-col gap-1.5">
                  {SUGESTOES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => submit(s)}
                      className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-left text-xs text-foreground hover:bg-secondary"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground",
                      )}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground">
                      Digitando…
                    </div>
                  </div>
                )}
                {error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}
              </div>
            )}
            <div ref={bottomRef} />
          </ScrollArea>

          <div className="flex items-end gap-2 border-t border-border p-3">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(input);
                }
              }}
              placeholder="Digite sua dúvida…"
              className="min-h-9 resize-none text-sm"
              rows={1}
            />
            <Button
              type="button"
              size="icon"
              onClick={() => submit(input)}
              disabled={sending || !input.trim()}
              aria-label="Enviar pergunta"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Button
        type="button"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fechar chat de dúvidas" : "Abrir chat de dúvidas"}
        className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg sm:bottom-6 sm:right-6"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </Button>
    </>
  );
}
