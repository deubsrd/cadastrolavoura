/* eslint-disable @typescript-eslint/no-explicit-any -- tabelas sdr_* ainda não estão no types.ts gerado */
// Camada de dados do SDR IA no WhatsApp (/admin/sdr).
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const sdrDb = supabase as unknown as SupabaseClient<any, "public", any>;

export async function callSdr(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("sdr-engine", { body });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) msg = (await ctx.json()).error ?? msg;
    } catch {
      /* mantém a mensagem genérica */
    }
    throw new Error(msg);
  }
  if (data && typeof data === "object" && "error" in data && (data as { error?: string }).error) {
    throw new Error((data as { error: string }).error);
  }
  return data;
}

export type Etapa =
  | "novo"
  | "contato"
  | "qualificado"
  | "agendada"
  | "realizada"
  | "cof"
  | "dia_lavoura"
  | "contrato"
  | "nutricao"
  | "perdido";

// As 8 etapas do funil da Estratégia Agrotóxicos + nutrição e perdido
export const ETAPAS: { value: Etapa; label: string }[] = [
  { value: "novo", label: "Novo lead" },
  { value: "contato", label: "Contato feito" },
  { value: "qualificado", label: "Qualificado (A ou B)" },
  { value: "agendada", label: "Reunião agendada" },
  { value: "realizada", label: "Reunião realizada" },
  { value: "cof", label: "COF enviada" },
  { value: "dia_lavoura", label: "Dia Lavoura" },
  { value: "contrato", label: "Contrato assinado" },
  { value: "nutricao", label: "Nutrição" },
  { value: "perdido", label: "Perdido" },
];
export const etapaLabel = (e: string) => ETAPAS.find((x) => x.value === e)?.label ?? e;

export const ORIGENS = [
  { value: "anuncio", label: "Anúncio" },
  { value: "site", label: "Site" },
  { value: "instagram", label: "Instagram" },
  { value: "indicacao", label: "Indicação de franqueado" },
  { value: "portal", label: "Portal" },
  { value: "whatsapp", label: "WhatsApp direto" },
  { value: "outro", label: "Outro" },
] as const;

export const CRITERIOS = [
  { key: "orcamento", label: "Orçamento" },
  { key: "urgencia", label: "Urgência" },
  { key: "decisor", label: "Decisor" },
  { key: "praca", label: "Praça" },
  { key: "ponto", label: "Ponto" },
] as const;

export type Lead = {
  id: string;
  wa_id: string;
  nome: string | null;
  nome_perfil: string | null;
  origem: string;
  anuncio: Record<string, any> | null;
  cidade: string | null;
  bairro: string | null;
  etapa: Etapa;
  respostas: Record<string, { resposta: string; pontos: number }>;
  nota: number | null;
  faixa: "A" | "B" | "C" | null;
  ia_ativa: boolean;
  precisa_humano: boolean;
  motivo_humano: string | null;
  opt_out: boolean;
  motivo_perda: string | null;
  observacoes: string | null;
  entrou_em: string;
  primeiro_contato_em: string | null;
  qualificado_em: string | null;
  last_inbound_at: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread: number;
};

export type SdrMessage = {
  id: string;
  lead_id: string;
  direction: "in" | "out";
  sent_by: "lead" | "ia" | "humano" | "sistema";
  type: string;
  body: string | null;
  status: "sent" | "delivered" | "read" | "failed" | null;
  error: string | null;
  created_at: string;
};

export const leadName = (l: Pick<Lead, "nome" | "nome_perfil" | "wa_id">) =>
  l.nome || l.nome_perfil || formatPhone(l.wa_id);

export function formatPhone(waId: string) {
  const d = waId.replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) {
    const ddd = d.slice(2, 4);
    const n = d.slice(4);
    return `(${ddd}) ${n.slice(0, n.length - 4)}-${n.slice(-4)}`;
  }
  return `+${d}`;
}

export const within24h = (iso: string | null) =>
  !!iso && Date.now() - new Date(iso).getTime() < 24 * 3600 * 1000;

export function minutesBetween(a: string | null, b: string | null) {
  if (!a || !b) return null;
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000));
}

export const FAIXA_CLASS: Record<string, string> = {
  A: "bg-primary text-primary-foreground",
  B: "bg-accent text-accent-foreground",
  C: "bg-muted text-muted-foreground",
};
