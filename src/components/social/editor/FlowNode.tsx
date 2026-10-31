/* eslint-disable @typescript-eslint/no-explicit-any -- dados dos blocos são JSON livre vindo do grafo */
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AlertTriangle } from "lucide-react";
import { TRIGGER_LABELS, type MsgItem, type TriggerKind } from "@/lib/social/api";
import { BLOCK_BY_TYPE, ITEM_LABEL, outputsOf } from "./blocks";

function summary(type: string, data: Record<string, any>): string[] {
  switch (type) {
    case "trigger": {
      const t = (data.types ?? []) as TriggerKind[];
      if (!t.length) return ["Escolha o que inicia a automação"];
      const kw =
        data.keywordMode === "any" || !data.keywords?.length
          ? "Qualquer palavra"
          : `Palavras: ${data.keywords.join(", ")}`;
      return [...t.map((x) => TRIGGER_LABELS[x]), kw];
    }
    case "message": {
      const items: MsgItem[] = data.items ?? [];
      if (!items.length) return ["Adicione o conteúdo da mensagem"];
      return items.slice(0, 4).map((it) => {
        if (it.kind === "text" || it.kind === "question")
          return `${ITEM_LABEL[it.kind]}: ${it.text.slice(0, 40) || "…"}`;
        if (it.kind === "wait") return `Aguardar ${it.seconds}s`;
        if (it.kind === "cards") return `${it.cards.length} cartão(ões)`;
        return ITEM_LABEL[it.kind];
      });
    }
    case "wait":
      return [
        `${data.amount} ${data.unit === "days" ? "dia(s)" : data.unit === "hours" ? "hora(s)" : "minuto(s)"}`,
      ];
    case "condition":
      return [
        `${(data.rules ?? []).length} regra(s) · ${data.match === "any" ? "qualquer uma" : "todas"}`,
      ];
    case "tags":
      return [`+${(data.add ?? []).length} / −${(data.remove ?? []).length} etiquetas`];
    case "http":
      return [`${data.method ?? "POST"} ${(data.url ?? "").slice(0, 34) || "sem URL"}`];
    case "ai":
      return [(data.prompt ?? "").slice(0, 48) || "Defina as instruções"];
    case "custom_field":
    case "math":
      return [data.field ? `Campo: ${data.field}` : "Escolha o campo"];
    case "pause_workflows":
      return [`Por ${data.minutes} min`];
    default:
      return [];
  }
}

function problems(type: string, data: Record<string, any>) {
  if (type === "trigger" && !(data.types ?? []).length) return true;
  if (type === "message" && !(data.items ?? []).length) return true;
  if (type === "http" && !data.url) return true;
  if (type === "sheets" && !data.webhookUrl) return true;
  return false;
}

export function FlowNode({ type, data, selected }: NodeProps) {
  const d = data as Record<string, any>;
  const meta = BLOCK_BY_TYPE[type] ?? { label: type, icon: AlertTriangle };
  const Icon = meta.icon;
  const outs = outputsOf(type, d);
  const isTrigger = type === "trigger";

  return (
    <div
      className={`w-64 rounded-xl border-2 bg-card text-left shadow-[var(--shadow-card)] transition ${
        selected ? "border-accent" : "border-transparent"
      }`}
    >
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-3 !w-3 !border-2 !border-card !bg-primary"
        />
      )}
      <div
        className={`flex items-center gap-2 rounded-t-[10px] px-3 py-2 text-sm font-bold ${isTrigger ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}
      >
        <Icon className="h-4 w-4" />
        <span className="flex-1 truncate">{(d.title as string) || meta.label}</span>
        {problems(type, d) && <AlertTriangle className="h-4 w-4 text-accent" />}
      </div>
      <div className="space-y-1 px-3 py-2.5">
        {summary(type, d).map((s, i) => (
          <p key={i} className="truncate text-xs text-muted-foreground">
            {s}
          </p>
        ))}
      </div>
      <div className="space-y-1 border-t px-3 py-2">
        {outs.map((o) => (
          <div
            key={o.id}
            className="relative flex justify-end text-[11px] font-medium text-muted-foreground"
          >
            {o.label ?? "Próximo passo"}
            <Handle
              id={o.id}
              type="source"
              position={Position.Right}
              className="!-right-[19px] !h-3 !w-3 !border-2 !border-card !bg-accent"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
