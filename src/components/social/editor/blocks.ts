/* eslint-disable @typescript-eslint/no-explicit-any -- dados dos blocos são JSON livre vindo do grafo */
import {
  MessageCircle,
  Tags,
  Clock,
  GitBranch,
  Split,
  PlayCircle,
  PauseCircle,
  Calculator,
  PenLine,
  Globe,
  Sheet,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { MsgItem } from "@/lib/social/api";

export type BlockDef = {
  type: string;
  label: string;
  description: string;
  icon: LucideIcon;
  advanced?: boolean;
  initial: () => Record<string, unknown>;
};

export const BLOCKS: BlockDef[] = [
  {
    type: "message",
    label: "Mensagem",
    description: "Texto, botões, pergunta, cartões e mídia",
    icon: MessageCircle,
    initial: () => ({ items: [] as MsgItem[] }),
  },
  {
    type: "tags",
    label: "Etiquetas",
    description: "Adicionar ou remover etiquetas",
    icon: Tags,
    initial: () => ({ add: [], remove: [] }),
  },
  {
    type: "wait",
    label: "Aguardar",
    description: "Esperar minutos, horas ou dias",
    icon: Clock,
    initial: () => ({ amount: 1, unit: "hours" }),
  },
  {
    type: "condition",
    label: "Condicional",
    description: "Seguir por Sim ou Não",
    icon: GitBranch,
    initial: () => ({ match: "all", rules: [] }),
  },
  {
    type: "split",
    label: "Distribuir",
    description: "Teste A/B com pesos",
    icon: Split,
    initial: () => ({
      branches: [
        { id: "a", weight: 50 },
        { id: "b", weight: 50 },
      ],
    }),
  },
  {
    type: "ai",
    label: "Peça à IA",
    description: "Resposta gerada pela IA no tom da Lavoura",
    icon: Sparkles,
    initial: () => ({ prompt: "", send: true }),
  },
  {
    type: "start_workflow",
    label: "Iniciar automação",
    description: "Dispara outra automação",
    icon: PlayCircle,
    advanced: true,
    initial: () => ({ workflowId: "" }),
  },
  {
    type: "pause_workflows",
    label: "Pausar automações",
    description: "Pausa automações para este contato",
    icon: PauseCircle,
    advanced: true,
    initial: () => ({ minutes: 60 }),
  },
  {
    type: "math",
    label: "Matemática",
    description: "Calcula e salva num campo",
    icon: Calculator,
    advanced: true,
    initial: () => ({ field: "", expression: "" }),
  },
  {
    type: "custom_field",
    label: "Campo personalizado",
    description: "Salva um valor no contato",
    icon: PenLine,
    advanced: true,
    initial: () => ({ field: "", value: "" }),
  },
  {
    type: "http",
    label: "Requisição HTTP",
    description: "Envia para CRM, Z-API, n8n...",
    icon: Globe,
    advanced: true,
    initial: () => ({ method: "POST", url: "", headers: [], body: "" }),
  },
  {
    type: "sheets",
    label: "Google Sheets",
    description: "Adiciona uma linha na planilha",
    icon: Sheet,
    advanced: true,
    initial: () => ({ webhookUrl: "", columns: [{ name: "instagram", value: "{{username}}" }] }),
  },
];

export const BLOCK_BY_TYPE: Record<string, { label: string; icon: LucideIcon }> = {
  trigger: { label: "Gatilho", icon: Zap },
  ...Object.fromEntries(BLOCKS.map((b) => [b.type, { label: b.label, icon: b.icon }])),
};

export const ITEM_LABEL: Record<MsgItem["kind"], string> = {
  text: "Mensagem",
  question: "Pergunta",
  cards: "Cartões",
  wait: "Aguardar",
  image: "Imagem",
  video: "Vídeo",
  audio: "Áudio",
  file: "PDF",
};

/** Saídas de cada nó: id do handle + rótulo exibido. */
export function outputsOf(
  type: string,
  data: Record<string, any>,
): { id: string; label?: string }[] {
  switch (type) {
    case "condition":
      return [
        { id: "yes", label: "Sim" },
        { id: "no", label: "Não" },
      ];
    case "split":
      return (data.branches ?? []).map((b: { id: string; weight: number }) => ({
        id: b.id,
        label: `${b.id.toUpperCase()} · ${b.weight}%`,
      }));
    case "http":
    case "sheets":
      return [
        { id: "ok", label: "Sucesso" },
        { id: "error", label: "Erro" },
      ];
    case "message": {
      const items: MsgItem[] = data.items ?? [];
      const btns: { id: string; label?: string }[] = [];
      for (const it of items) {
        if (it.kind === "text")
          for (const b of it.buttons ?? [])
            if (b.type === "next") btns.push({ id: `btn:${b.id}`, label: b.label || "Botão" });
        if (it.kind === "cards")
          for (const c of it.cards)
            for (const b of c.buttons ?? [])
              if (b.type === "next") btns.push({ id: `btn:${b.id}`, label: b.label || "Botão" });
      }
      return btns.length ? btns : [{ id: "next" }];
    }
    default:
      return [{ id: "next" }];
  }
}
