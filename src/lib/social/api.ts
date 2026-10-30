/* eslint-disable @typescript-eslint/no-explicit-any -- dados dos blocos são JSON livre vindo do grafo */
// Camada de dados do Social Selling (/admin/social).
// As tabelas ss_* ainda não estão no types.ts gerado do Supabase, então usamos
// o client sem tipos aqui e tipamos as linhas manualmente abaixo.
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const sdb = supabase as unknown as SupabaseClient<any, "public", any>;

export async function callFn<T = unknown>(
  fn: "ss-engine" | "ss-ai" | "ig-oauth",
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    // o corpo de erro das nossas functions vem como { error: "mensagem" }
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
  return data as T;
}

export type TriggerKind = "comment" | "dm" | "story_reply" | "story_mention" | "live_comment";

export const TRIGGER_LABELS: Record<TriggerKind, string> = {
  comment: "Comentário no feed ou reels",
  story_reply: "Resposta nos stories",
  dm: "Mensagem recebida",
  live_comment: "Comentário em live",
  story_mention: "Menção nos stories",
};

export const KEYWORD_MODES = [
  { value: "any", label: "Qualquer palavra" },
  { value: "exact", label: "Palavra ou frase exata" },
  { value: "contains", label: "A mensagem contém a palavra" },
  { value: "starts", label: "A palavra aparece no começo" },
] as const;

export type Btn = { id: string; label: string; type: "url" | "next"; url?: string };
export type MsgItem =
  | { kind: "text"; text: string; buttons?: Btn[] }
  | {
      kind: "question";
      text: string;
      field: string;
      validate?: "text" | "email" | "phone" | "number";
      quickReplies?: string[];
      retryText?: string;
    }
  | {
      kind: "cards";
      cards: { title: string; subtitle?: string; imageUrl?: string; buttons?: Btn[] }[];
    }
  | { kind: "wait"; seconds: number }
  | { kind: "image" | "video" | "audio" | "file"; url: string };

export type TriggerData = {
  types: TriggerKind[];
  keywordMode: "any" | "exact" | "contains" | "starts";
  keywords: string[];
  excludeKeywords?: string[];
  postScope: "any" | "specific" | "next";
  mediaIds: string[];
  nextAfter?: string;
  publicReplies: string[];
  replyListId?: string | null;
  onlyOnce: boolean;
};

export type FlowNode = {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
};
export type FlowEdge = { id: string; source: string; sourceHandle?: string | null; target: string };
export type FlowGraph = { nodes: FlowNode[]; edges: FlowEdge[] };

export type Workflow = {
  id: string;
  folder_id: string | null;
  name: string;
  status: "draft" | "active" | "paused";
  graph: FlowGraph;
  trigger_types: TriggerKind[];
  published_at: string | null;
  runs_count: number;
  created_at: string;
  updated_at: string;
};

export type Contact = {
  id: string;
  username: string | null;
  name: string | null;
  avatar_url: string | null;
  email: string | null;
  whatsapp: string | null;
  fields: Record<string, unknown>;
  score: number;
  follows_business: boolean | null;
  blocked: boolean;
  automation_paused_until: string | null;
  last_inbound_at: string | null;
  last_interaction_at: string | null;
  created_at: string;
  ss_contact_tags?: { tag_id: string }[];
};

export type Tag = { id: string; name: string; color: string };
export type CustomField = { id: string; key: string; label: string; type: string };

export const emptyTrigger = (): TriggerData => ({
  types: [],
  keywordMode: "any",
  keywords: [],
  excludeKeywords: [],
  postScope: "any",
  mediaIds: [],
  publicReplies: [],
  replyListId: null,
  onlyOnce: true,
});

export const emptyGraph = (): FlowGraph => ({
  nodes: [{ id: "trigger", type: "trigger", position: { x: 0, y: 120 }, data: emptyTrigger() }],
  edges: [],
});

export const uid = (p = "n") => `${p}${Math.random().toString(36).slice(2, 9)}`;

export function triggerTypes(g: FlowGraph): TriggerKind[] {
  return (g.nodes.find((n) => n.type === "trigger")?.data?.types ?? []) as TriggerKind[];
}

export function within24h(iso: string | null) {
  return !!iso && Date.now() - Date.parse(iso) < 24 * 3600_000;
}

export function displayName(c: Pick<Contact, "name" | "username">) {
  return c.name || (c.username ? `@${c.username}` : "Contato sem nome");
}

export const IG_HANDLE_FIELDS = [
  { key: "email", label: "E-mail" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "nome", label: "Nome" },
];

export async function createWorkflow(name: string, graph: FlowGraph = emptyGraph()) {
  const { data, error } = await sdb
    .from("ss_workflows")
    .insert({ name, graph, trigger_types: triggerTypes(graph), status: "draft" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}
