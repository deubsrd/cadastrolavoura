import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function useChatDuvidas() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (pergunta: string) => {
      const trimmed = pergunta.trim();
      if (!trimmed || sending) return;

      setError(null);
      const historico = messages;
      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setSending(true);

      const { data, error: fnError } = await supabase.functions.invoke("chat-duvidas", {
        body: { pergunta: trimmed, historico },
      });

      setSending(false);

      if (fnError || data?.error) {
        setError(data?.error ?? fnError?.message ?? "Não foi possível enviar sua pergunta agora.");
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.resposta as string }]);
    },
    [messages, sending],
  );

  return { messages, sending, error, sendMessage };
}
