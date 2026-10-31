/* eslint-disable @typescript-eslint/no-explicit-any -- dados dos blocos são JSON livre vindo do grafo */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Loader2,
  Upload,
  Link2,
  MessageCircle,
  HelpCircle,
  LayoutGrid,
  Clock,
  Image,
  Video,
  Music,
  FileText,
  ImageOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import {
  callFn,
  uid,
  sdb,
  KEYWORD_MODES,
  TRIGGER_LABELS,
  IG_HANDLE_FIELDS,
  type Btn,
  type MsgItem,
  type Tag,
  type CustomField,
  type TriggerData,
  type TriggerKind,
} from "@/lib/social/api";
import { BLOCK_BY_TYPE, ITEM_LABEL } from "./blocks";

export type EditorRefs = {
  tags: Tag[];
  fields: CustomField[];
  replyLists: { id: string; name: string }[];
  workflows: { id: string; name: string }[];
  reloadRefs: () => void;
};

type Props = {
  node: { id: string; type: string; data: Record<string, any> };
  refs: EditorRefs;
  onChange: (data: Record<string, any>) => void;
  onDelete: () => void;
  onClose: () => void;
};

const VARS_HINT =
  "Variáveis: {{primeiro_nome}} {{nome}} {{username}} {{comentario}} {{whatsapp}} {{email}} {{campo.x}} {{var.x}}";

// ------------------------------------------------------------------ helpers de UI
function ChipsInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [text, setText] = useState("");
  const add = () => {
    const parts = text
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length) onChange([...value, ...parts.filter((p) => !value.includes(p))]);
    setText("");
  };
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {value.map((k) => (
          <span
            key={k}
            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-primary"
          >
            {k}
            <button
              onClick={() => onChange(value.filter((x) => x !== k))}
              aria-label={`Remover ${k}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder={placeholder}
      />
    </div>
  );
}

function FieldSelect({
  value,
  onChange,
  refs,
  allowCore = true,
}: {
  value: string;
  onChange: (v: string) => void;
  refs: EditorRefs;
  allowCore?: boolean;
}) {
  const createField = async () => {
    const label = window.prompt("Nome do novo campo (ex.: Cidade)");
    if (!label?.trim()) return;
    const key = label
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    const { error } = await sdb.from("ss_custom_fields").insert({ key, label: label.trim() });
    if (error && !error.message.includes("duplicate")) return toast.error(error.message);
    refs.reloadRefs();
    onChange(key);
  };
  return (
    <div className="flex gap-2">
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Escolha o campo" />
        </SelectTrigger>
        <SelectContent>
          {allowCore &&
            IG_HANDLE_FIELDS.map((f) => (
              <SelectItem key={f.key} value={f.key}>
                {f.label}
              </SelectItem>
            ))}
          {refs.fields.map((f) => (
            <SelectItem key={f.key} value={f.key}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={createField}
        aria-label="Novo campo"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

async function uploadMedia(file: File) {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${new Date().toISOString().slice(0, 7)}/${uid("m")}.${ext}`;
  const { error } = await supabase.storage
    .from("social-midia")
    .upload(path, file, { contentType: file.type });
  if (error) throw error;
  return supabase.storage.from("social-midia").getPublicUrl(path).data.publicUrl;
}

function ButtonsEditor({ buttons, onChange }: { buttons: Btn[]; onChange: (b: Btn[]) => void }) {
  return (
    <div className="space-y-2">
      {buttons.map((b, i) => (
        <div key={b.id} className="space-y-2 rounded-lg border bg-muted/40 p-2">
          <div className="flex gap-2">
            <Input
              value={b.label}
              maxLength={20}
              placeholder="Texto do botão (até 20)"
              onChange={(e) =>
                onChange(buttons.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
              }
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onChange(buttons.filter((_, j) => j !== i))}
              aria-label="Remover botão"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Select
            value={b.type}
            onValueChange={(v) =>
              onChange(buttons.map((x, j) => (j === i ? { ...x, type: v as Btn["type"] } : x)))
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="url">Abre um link (rastreado)</SelectItem>
              <SelectItem value="next">Continua o fluxo (cria uma saída)</SelectItem>
            </SelectContent>
          </Select>
          {b.type === "url" && (
            <Input
              value={b.url ?? ""}
              placeholder="https://..."
              onChange={(e) =>
                onChange(buttons.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))
              }
            />
          )}
        </div>
      ))}
      {buttons.length < 3 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange([...buttons, { id: uid("b"), label: "", type: "url", url: "" }])}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Botão
        </Button>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Gatilho
type Media = {
  id: string;
  caption?: string;
  thumbnail_url?: string;
  media_url?: string;
  media_type: string;
  timestamp: string;
};

function TriggerPanel({
  data,
  onChange,
  refs,
}: {
  data: TriggerData;
  onChange: (d: TriggerData) => void;
  refs: EditorRefs;
}) {
  const set = (p: Partial<TriggerData>) => onChange({ ...data, ...p });
  const [media, setMedia] = useState<Media[] | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const hasComment = data.types.includes("comment") || data.types.includes("live_comment");

  const loadMedia = async () => {
    setLoadingMedia(true);
    try {
      const r = await callFn<{ media: Media[] }>("ss-engine", { action: "media" });
      setMedia(r.media);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao buscar posts");
    } finally {
      setLoadingMedia(false);
    }
  };
  useEffect(() => {
    if (data.postScope === "specific" && media === null && hasComment) loadMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.postScope, hasComment]);

  const genReplies = async () => {
    const example = data.publicReplies.find((r) => r.trim());
    if (!example) return toast.error("Escreva 1 resposta para a IA aprender o tom.");
    setAiBusy(true);
    try {
      const r = await callFn<{ replies: string[] }>("ss-ai", {
        action: "public_replies",
        example,
        n: 5,
      });
      set({ publicReplies: [...data.publicReplies.filter((x) => x.trim()), ...r.replies] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <Label className="text-sm font-bold">O que inicia esta automação?</Label>
        {(Object.keys(TRIGGER_LABELS) as TriggerKind[]).map((k) => (
          <label key={k} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
            <Checkbox
              checked={data.types.includes(k)}
              onCheckedChange={(v) =>
                set({ types: v ? [...data.types, k] : data.types.filter((x) => x !== k) })
              }
            />
            {TRIGGER_LABELS[k]}
          </label>
        ))}
      </section>

      <section className="space-y-2">
        <Label className="text-sm font-bold">Palavras-chave</Label>
        <Select
          value={data.keywordMode}
          onValueChange={(v) => set({ keywordMode: v as TriggerData["keywordMode"] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KEYWORD_MODES.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {data.keywordMode !== "any" && (
          <ChipsInput
            value={data.keywords}
            onChange={(keywords) => set({ keywords })}
            placeholder="Digite e Enter (ex.: link, quero)"
          />
        )}
        <p className="pt-1 text-xs text-muted-foreground">Ignorar quando contiver:</p>
        <ChipsInput
          value={data.excludeKeywords ?? []}
          onChange={(excludeKeywords) => set({ excludeKeywords })}
          placeholder="Opcional"
        />
        <p className="text-xs text-muted-foreground">Sem acento e sem diferença de maiúsculas.</p>
      </section>

      {hasComment && (
        <section className="space-y-2">
          <Label className="text-sm font-bold">Em quais posts ou reels?</Label>
          <RadioGroup
            value={data.postScope}
            onValueChange={(v) =>
              set({
                postScope: v as TriggerData["postScope"],
                nextAfter: v === "next" ? new Date().toISOString() : data.nextAfter,
              })
            }
          >
            {[
              { v: "any", l: "Qualquer post" },
              { v: "specific", l: "Post específico" },
              { v: "next", l: "Meu próximo post" },
            ].map((o) => (
              <label key={o.v} className="flex items-center gap-2 text-sm">
                <RadioGroupItem value={o.v} /> {o.l}
              </label>
            ))}
          </RadioGroup>
          {data.postScope === "specific" && (
            <div>
              {loadingMedia ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {(media ?? []).map((m) => {
                    const on = data.mediaIds.includes(m.id);
                    const src =
                      m.thumbnail_url ?? (m.media_type !== "VIDEO" ? m.media_url : undefined);
                    return (
                      <button
                        key={m.id}
                        onClick={() =>
                          set({
                            mediaIds: on
                              ? data.mediaIds.filter((x) => x !== m.id)
                              : [...data.mediaIds, m.id],
                          })
                        }
                        className={`relative aspect-square overflow-hidden rounded-md border-2 ${on ? "border-accent" : "border-transparent"}`}
                        title={m.caption ?? ""}
                      >
                        {src ? (
                          <img src={src} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <ImageOff className="m-auto h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                    );
                  })}
                  {media?.length === 0 && (
                    <p className="col-span-3 text-xs text-muted-foreground">
                      Nenhum post encontrado.
                    </p>
                  )}
                </div>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {data.mediaIds.length} selecionado(s)
              </p>
            </div>
          )}
          {data.postScope === "next" && (
            <p className="text-xs text-muted-foreground">
              Vale para o primeiro post publicado depois de ativar a automação.
            </p>
          )}
        </section>
      )}

      {hasComment && (
        <section className="space-y-2">
          <Label className="text-sm font-bold">Resposta pública no comentário</Label>
          <p className="text-xs text-muted-foreground">
            Uma delas é sorteada a cada comentário (parece menos robô).
          </p>
          {data.publicReplies.map((r, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={r}
                onChange={(e) =>
                  set({
                    publicReplies: data.publicReplies.map((x, j) => (j === i ? e.target.value : x)),
                  })
                }
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => set({ publicReplies: data.publicReplies.filter((_, j) => j !== i) })}
                aria-label="Remover"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => set({ publicReplies: [...data.publicReplies, ""] })}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Resposta
            </Button>
            <Button variant="outline" size="sm" onClick={genReplies} disabled={aiBusy}>
              {aiBusy ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-3.5 w-3.5" />
              )}{" "}
              Gerar com IA
            </Button>
          </div>
          {refs.replyLists.length > 0 && (
            <Select
              value={data.replyListId ?? "none"}
              onValueChange={(v) => set({ replyListId: v === "none" ? null : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Ou use uma lista de respostas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Usar as respostas acima</SelectItem>
                {refs.replyLists.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    Lista: {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </section>
      )}

      <label className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
        <span>Disparar só uma vez por pessoa{hasComment ? " (por post)" : ""}</span>
        <Switch checked={data.onlyOnce} onCheckedChange={(onlyOnce) => set({ onlyOnce })} />
      </label>
    </div>
  );
}

// ------------------------------------------------------------------ Mensagem
const NEW_ITEMS: { kind: MsgItem["kind"]; icon: typeof MessageCircle; make: () => MsgItem }[] = [
  { kind: "text", icon: MessageCircle, make: () => ({ kind: "text", text: "", buttons: [] }) },
  {
    kind: "question",
    icon: HelpCircle,
    make: () => ({ kind: "question", text: "", field: "", validate: "text", quickReplies: [] }),
  },
  {
    kind: "cards",
    icon: LayoutGrid,
    make: () => ({
      kind: "cards",
      cards: [{ title: "", subtitle: "", imageUrl: "", buttons: [] }],
    }),
  },
  { kind: "wait", icon: Clock, make: () => ({ kind: "wait", seconds: 3 }) },
  { kind: "image", icon: Image, make: () => ({ kind: "image", url: "" }) },
  { kind: "video", icon: Video, make: () => ({ kind: "video", url: "" }) },
  { kind: "audio", icon: Music, make: () => ({ kind: "audio", url: "" }) },
  { kind: "file", icon: FileText, make: () => ({ kind: "file", url: "" }) },
];

function MediaInput({
  value,
  onChange,
  accept,
}: {
  value: string;
  onChange: (v: string) => void;
  accept: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://... ou envie um arquivo"
      />
      <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-accent">
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}{" "}
        Enviar arquivo (até 25 MB)
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > 25 * 1024 * 1024) return toast.error("Arquivo maior que 25 MB.");
            setBusy(true);
            try {
              onChange(await uploadMedia(f));
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Falha no upload");
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
    </div>
  );
}

function ItemEditor({
  item,
  onChange,
  refs,
}: {
  item: MsgItem;
  onChange: (i: MsgItem) => void;
  refs: EditorRefs;
}) {
  switch (item.kind) {
    case "text":
      return (
        <div className="space-y-2">
          <Textarea
            rows={4}
            maxLength={1000}
            value={item.text}
            onChange={(e) => onChange({ ...item, text: e.target.value })}
            placeholder="Oi, {{primeiro_nome}}! ..."
          />
          <ButtonsEditor
            buttons={item.buttons ?? []}
            onChange={(buttons) => onChange({ ...item, buttons })}
          />
        </div>
      );
    case "question":
      return (
        <div className="space-y-2">
          <Textarea
            rows={3}
            value={item.text}
            onChange={(e) => onChange({ ...item, text: e.target.value })}
            placeholder="Qual seu WhatsApp com DDD?"
          />
          <Label className="text-xs">Salvar resposta em</Label>
          <FieldSelect
            value={item.field}
            onChange={(field) =>
              onChange({
                ...item,
                field,
                validate:
                  field === "email" ? "email" : field === "whatsapp" ? "phone" : item.validate,
              })
            }
            refs={refs}
          />
          <Label className="text-xs">Validar como</Label>
          <Select
            value={item.validate ?? "text"}
            onValueChange={(v) => onChange({ ...item, validate: v as "text" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Texto livre</SelectItem>
              <SelectItem value="email">E-mail</SelectItem>
              <SelectItem value="phone">Telefone / WhatsApp</SelectItem>
              <SelectItem value="number">Número</SelectItem>
            </SelectContent>
          </Select>
          <Label className="text-xs">Respostas rápidas (opcional)</Label>
          <ChipsInput
            value={item.quickReplies ?? []}
            onChange={(quickReplies) => onChange({ ...item, quickReplies })}
            placeholder="Ex.: Sim, Não"
          />
          <Input
            value={item.retryText ?? ""}
            onChange={(e) => onChange({ ...item, retryText: e.target.value })}
            placeholder="Mensagem se a resposta for inválida (opcional)"
          />
        </div>
      );
    case "cards":
      return (
        <div className="space-y-3">
          {item.cards.map((c, i) => {
            const setCard = (p: Partial<typeof c>) =>
              onChange({
                ...item,
                cards: item.cards.map((x, j) => (j === i ? { ...x, ...p } : x)),
              });
            return (
              <div key={i} className="space-y-2 rounded-lg border p-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  Cartão {i + 1}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() =>
                      onChange({ ...item, cards: item.cards.filter((_, j) => j !== i) })
                    }
                    aria-label="Remover cartão"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Input
                  value={c.title}
                  maxLength={80}
                  placeholder="Título"
                  onChange={(e) => setCard({ title: e.target.value })}
                />
                <Input
                  value={c.subtitle ?? ""}
                  maxLength={80}
                  placeholder="Subtítulo"
                  onChange={(e) => setCard({ subtitle: e.target.value })}
                />
                <MediaInput
                  value={c.imageUrl ?? ""}
                  onChange={(imageUrl) => setCard({ imageUrl })}
                  accept="image/*"
                />
                <ButtonsEditor
                  buttons={c.buttons ?? []}
                  onChange={(buttons) => setCard({ buttons })}
                />
              </div>
            );
          })}
          {item.cards.length < 10 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onChange({ ...item, cards: [...item.cards, { title: "", buttons: [] }] })
              }
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Cartão
            </Button>
          )}
        </div>
      );
    case "wait":
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={86400}
            className="w-28"
            value={item.seconds}
            onChange={(e) => onChange({ ...item, seconds: Number(e.target.value) || 1 })}
          />
          <span className="text-sm text-muted-foreground">segundos (simula digitação)</span>
        </div>
      );
    default:
      return (
        <MediaInput
          value={item.url}
          onChange={(url) => onChange({ ...item, url })}
          accept={
            item.kind === "image"
              ? "image/*"
              : item.kind === "video"
                ? "video/*"
                : item.kind === "audio"
                  ? "audio/*"
                  : "application/pdf"
          }
        />
      );
  }
}

function MessagePanel({
  data,
  onChange,
  refs,
}: {
  data: { items: MsgItem[] };
  onChange: (d: { items: MsgItem[] }) => void;
  refs: EditorRefs;
}) {
  const items = data.items ?? [];
  const setItems = (next: MsgItem[]) => onChange({ ...data, items: next });
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  };
  return (
    <div className="space-y-4">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border bg-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-primary">
              {ITEM_LABEL[it.kind]}
            </span>
            <div className="flex">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => move(i, -1)}
                aria-label="Subir"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => move(i, 1)}
                aria-label="Descer"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setItems(items.filter((_, j) => j !== i))}
                aria-label="Remover"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <ItemEditor
            item={it}
            refs={refs}
            onChange={(n) => setItems(items.map((x, j) => (j === i ? n : x)))}
          />
        </div>
      ))}
      <div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Adicionar ao bloco</p>
        <div className="grid grid-cols-4 gap-1.5">
          {NEW_ITEMS.map(({ kind, icon: Icon, make }) => (
            <button
              key={kind}
              onClick={() => setItems([...items, make()])}
              className="flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[11px] font-medium hover:border-accent hover:bg-accent/5"
            >
              <Icon className="h-4 w-4 text-accent" /> {ITEM_LABEL[kind]}
            </button>
          ))}
        </div>
      </div>
      <p className="rounded-lg bg-muted p-2.5 text-xs text-muted-foreground">
        Regra do Instagram: depois de um <b>comentário</b>, só 1 mensagem sai antes de a pessoa
        responder. Coloque um botão "Continua o fluxo" na primeira mensagem e o resto no próximo
        bloco.
      </p>
    </div>
  );
}

// ------------------------------------------------------------------ Outros blocos
function TagsPanel({
  data,
  onChange,
  refs,
}: {
  data: { add: string[]; remove: string[] };
  onChange: (d: any) => void;
  refs: EditorRefs;
}) {
  const createTag = async () => {
    const name = window.prompt("Nome da etiqueta");
    if (!name?.trim()) return;
    const { error } = await sdb.from("ss_tags").insert({ name: name.trim() });
    if (error) return toast.error(error.message);
    refs.reloadRefs();
  };
  const toggle = (list: "add" | "remove", id: string) => {
    const cur: string[] = data[list] ?? [];
    onChange({ ...data, [list]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
  };
  return (
    <div className="space-y-5">
      {(["add", "remove"] as const).map((list) => (
        <section key={list} className="space-y-2">
          <Label className="text-sm font-bold">
            {list === "add" ? "Adicionar etiquetas" : "Remover etiquetas"}
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {refs.tags.map((t) => {
              const on = (data[list] ?? []).includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => toggle(list, t.id)}
                  className="rounded-full border px-2.5 py-1 text-xs font-medium"
                  style={
                    on ? { background: t.color, color: "#fdfdfd", borderColor: t.color } : undefined
                  }
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        </section>
      ))}
      <Button variant="outline" size="sm" onClick={createTag}>
        <Plus className="mr-1 h-3.5 w-3.5" /> Nova etiqueta
      </Button>
    </div>
  );
}

const COND_FIELDS = [
  { v: "follows", l: "Segue o perfil" },
  { v: "tag", l: "Etiqueta" },
  { v: "email", l: "E-mail" },
  { v: "whatsapp", l: "WhatsApp" },
  { v: "score", l: "Pontos (ranking)" },
];
const OPS = [
  { v: "eq", l: "é igual a" },
  { v: "neq", l: "é diferente de" },
  { v: "contains", l: "contém" },
  { v: "gt", l: "maior que" },
  { v: "lt", l: "menor que" },
  { v: "empty", l: "está vazio" },
  { v: "not_empty", l: "está preenchido" },
];

function ConditionPanel({
  data,
  onChange,
  refs,
}: {
  data: any;
  onChange: (d: any) => void;
  refs: EditorRefs;
}) {
  const rules: any[] = data.rules ?? [];
  const setRule = (i: number, p: any) =>
    onChange({ ...data, rules: rules.map((r, j) => (j === i ? { ...r, ...p } : r)) });
  return (
    <div className="space-y-4">
      <Select value={data.match ?? "all"} onValueChange={(match) => onChange({ ...data, match })}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as regras precisam valer</SelectItem>
          <SelectItem value="any">Basta uma regra valer</SelectItem>
        </SelectContent>
      </Select>
      {rules.map((r, i) => (
        <div key={i} className="space-y-2 rounded-lg border p-2">
          <div className="flex gap-2">
            <Select
              value={r.field}
              onValueChange={(field) =>
                setRule(i, {
                  field,
                  op: field === "follows" ? "eq" : field === "tag" ? "has" : "eq",
                  value: "",
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COND_FIELDS.map((f) => (
                  <SelectItem key={f.v} value={f.v}>
                    {f.l}
                  </SelectItem>
                ))}
                {refs.fields.map((f) => (
                  <SelectItem key={f.key} value={f.key}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onChange({ ...data, rules: rules.filter((_, j) => j !== i) })}
              aria-label="Remover regra"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          {r.field === "follows" ? (
            <Select value={r.op} onValueChange={(op) => setRule(i, { op })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eq">Segue</SelectItem>
                <SelectItem value="neq">Não segue</SelectItem>
              </SelectContent>
            </Select>
          ) : r.field === "tag" ? (
            <div className="flex gap-2">
              <Select value={r.op} onValueChange={(op) => setRule(i, { op })}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="has">tem</SelectItem>
                  <SelectItem value="not_has">não tem</SelectItem>
                </SelectContent>
              </Select>
              <Select value={r.value || undefined} onValueChange={(value) => setRule(i, { value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Etiqueta" />
                </SelectTrigger>
                <SelectContent>
                  {refs.tags.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex gap-2">
              <Select value={r.op} onValueChange={(op) => setRule(i, { op })}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPS.map((o) => (
                    <SelectItem key={o.v} value={o.v}>
                      {o.l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!["empty", "not_empty"].includes(r.op) && (
                <Input
                  value={r.value ?? ""}
                  onChange={(e) => setRule(i, { value: e.target.value })}
                  placeholder="valor"
                />
              )}
            </div>
          )}
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          onChange({ ...data, rules: [...rules, { field: "follows", op: "eq", value: "" }] })
        }
      >
        <Plus className="mr-1 h-3.5 w-3.5" /> Regra
      </Button>
      <p className="text-xs text-muted-foreground">
        "Segue o perfil" é conferido no Instagram na hora. Use para liberar o link só para
        seguidores.
      </p>
    </div>
  );
}

const SHEETS_SCRIPT = `function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  var headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  Object.keys(data).forEach(function (k) {
    if (headers.indexOf(k) === -1) { headers.push(k); sheet.getRange(1, headers.length).setValue(k); }
  });
  sheet.appendRow(headers.map(function (h) { return data[h] || ""; }));
  return ContentService.createTextOutput("ok");
}`;

function GenericPanel({
  type,
  data,
  onChange,
  refs,
}: {
  type: string;
  data: any;
  onChange: (d: any) => void;
  refs: EditorRefs;
}) {
  const set = (p: any) => onChange({ ...data, ...p });
  switch (type) {
    case "wait":
      return (
        <div className="flex gap-2">
          <Input
            type="number"
            min={1}
            className="w-24"
            value={data.amount}
            onChange={(e) => set({ amount: Number(e.target.value) || 1 })}
          />
          <Select value={data.unit} onValueChange={(unit) => set({ unit })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minutes">minutos</SelectItem>
              <SelectItem value="hours">horas</SelectItem>
              <SelectItem value="days">dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    case "split":
      return (
        <div className="space-y-2">
          {(data.branches ?? []).map((b: any, i: number) => (
            <div key={b.id} className="flex items-center gap-2">
              <span className="w-8 text-sm font-bold uppercase">{b.id}</span>
              <Input
                type="number"
                min={0}
                max={100}
                value={b.weight}
                onChange={(e) =>
                  set({
                    branches: data.branches.map((x: any, j: number) =>
                      j === i ? { ...x, weight: Number(e.target.value) } : x,
                    ),
                  })
                }
              />
              <span className="text-sm">%</span>
              {data.branches.length > 2 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    set({ branches: data.branches.filter((_: any, j: number) => j !== i) })
                  }
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {data.branches.length < 5 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                set({
                  branches: [...data.branches, { id: "abcde"[data.branches.length], weight: 0 }],
                })
              }
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Caminho
            </Button>
          )}
        </div>
      );
    case "start_workflow":
      return (
        <Select
          value={data.workflowId || undefined}
          onValueChange={(workflowId) => set({ workflowId })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Escolha a automação" />
          </SelectTrigger>
          <SelectContent>
            {refs.workflows.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "pause_workflows":
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            className="w-28"
            value={data.minutes}
            onChange={(e) => set({ minutes: Number(e.target.value) || 1 })}
          />
          <span className="text-sm text-muted-foreground">
            minutos sem automações para este contato (ex.: enquanto alguém do time atende)
          </span>
        </div>
      );
    case "math":
      return (
        <div className="space-y-2">
          <Label className="text-xs">Salvar em</Label>
          <FieldSelect
            value={data.field}
            onChange={(field) => set({ field })}
            refs={refs}
            allowCore={false}
          />
          <Label className="text-xs">Conta</Label>
          <Input
            value={data.expression}
            onChange={(e) => set({ expression: e.target.value })}
            placeholder="{{campo.pedidos}} + 1"
          />
          <p className="text-xs text-muted-foreground">
            Use + − * / e parênteses. Campos vazios valem 0.
          </p>
        </div>
      );
    case "custom_field":
      return (
        <div className="space-y-2">
          <Label className="text-xs">Campo</Label>
          <FieldSelect value={data.field} onChange={(field) => set({ field })} refs={refs} />
          <Label className="text-xs">Valor</Label>
          <Input
            value={data.value}
            onChange={(e) => set({ value: e.target.value })}
            placeholder="Ex.: reels-novembro"
          />
        </div>
      );
    case "http":
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Select value={data.method} onValueChange={(method) => set({ method })}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["GET", "POST", "PUT", "PATCH"].map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={data.url}
              onChange={(e) => set({ url: e.target.value })}
              placeholder="https://api..."
            />
          </div>
          <Label className="text-xs">Cabeçalhos</Label>
          {(data.headers ?? []).map((h: any, i: number) => (
            <div key={i} className="flex gap-2">
              <Input
                value={h.k}
                placeholder="Nome"
                onChange={(e) =>
                  set({
                    headers: data.headers.map((x: any, j: number) =>
                      j === i ? { ...x, k: e.target.value } : x,
                    ),
                  })
                }
              />
              <Input
                value={h.v}
                placeholder="Valor"
                onChange={(e) =>
                  set({
                    headers: data.headers.map((x: any, j: number) =>
                      j === i ? { ...x, v: e.target.value } : x,
                    ),
                  })
                }
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  set({ headers: data.headers.filter((_: any, j: number) => j !== i) })
                }
                aria-label="Remover"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => set({ headers: [...(data.headers ?? []), { k: "", v: "" }] })}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Cabeçalho
          </Button>
          {data.method !== "GET" && (
            <>
              <Label className="text-xs">Corpo (JSON)</Label>
              <Textarea
                rows={5}
                className="font-mono text-xs"
                value={data.body}
                onChange={(e) => set({ body: e.target.value })}
              />
            </>
          )}
          <Label className="text-xs">Salvar resposta em (opcional)</Label>
          <FieldSelect
            value={data.saveTo ?? ""}
            onChange={(saveTo) => set({ saveTo })}
            refs={refs}
            allowCore={false}
          />
          {data.saveTo && (
            <Input
              value={data.savePath ?? ""}
              onChange={(e) => set({ savePath: e.target.value })}
              placeholder="Caminho no JSON, ex.: data.id"
            />
          )}
          <p className="text-xs text-muted-foreground">
            Saídas: Sucesso (2xx) e Erro. Timeout de 15s.
          </p>
        </div>
      );
    case "sheets":
      return (
        <div className="space-y-2">
          <Label className="text-xs">URL do Web App (Apps Script)</Label>
          <Input
            value={data.webhookUrl}
            onChange={(e) => set({ webhookUrl: e.target.value })}
            placeholder="https://script.google.com/macros/s/.../exec"
          />
          <Label className="text-xs">Colunas</Label>
          {(data.columns ?? []).map((c: any, i: number) => (
            <div key={i} className="flex gap-2">
              <Input
                value={c.name}
                placeholder="Coluna"
                onChange={(e) =>
                  set({
                    columns: data.columns.map((x: any, j: number) =>
                      j === i ? { ...x, name: e.target.value } : x,
                    ),
                  })
                }
              />
              <Input
                value={c.value}
                placeholder="{{whatsapp}}"
                onChange={(e) =>
                  set({
                    columns: data.columns.map((x: any, j: number) =>
                      j === i ? { ...x, value: e.target.value } : x,
                    ),
                  })
                }
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  set({ columns: data.columns.filter((_: any, j: number) => j !== i) })
                }
                aria-label="Remover"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => set({ columns: [...(data.columns ?? []), { name: "", value: "" }] })}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Coluna
          </Button>
          <details className="rounded-lg bg-muted p-2 text-xs">
            <summary className="cursor-pointer font-semibold">
              Como ligar a planilha (2 min)
            </summary>
            <ol className="my-2 list-decimal space-y-1 pl-4">
              <li>Na planilha: Extensões → Apps Script, cole o código abaixo e salve.</li>
              <li>Implantar → Nova implantação → App da Web, acesso "Qualquer pessoa".</li>
              <li>Copie a URL que termina em /exec e cole aqui.</li>
            </ol>
            <pre className="overflow-x-auto whitespace-pre rounded bg-card p-2 font-mono text-[10px]">
              {SHEETS_SCRIPT}
            </pre>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(SHEETS_SCRIPT);
                toast.success("Código copiado");
              }}
            >
              Copiar código
            </Button>
          </details>
        </div>
      );
    case "ai":
      return (
        <div className="space-y-2">
          <Label className="text-xs">Instruções para a IA</Label>
          <Textarea
            rows={6}
            value={data.prompt}
            onChange={(e) => set({ prompt: e.target.value })}
            placeholder="Ex.: Responda dúvidas sobre como funciona a lavanderia. Se perguntarem preço, diga que varia por unidade e mande o site."
          />
          <label className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
            Enviar a resposta na DM
            <Switch checked={data.send !== false} onCheckedChange={(send) => set({ send })} />
          </label>
          <Label className="text-xs">Também salvar em (opcional)</Label>
          <FieldSelect
            value={data.saveTo ?? ""}
            onChange={(saveTo) => set({ saveTo })}
            refs={refs}
            allowCore={false}
          />
        </div>
      );
    default:
      return null;
  }
}

// ------------------------------------------------------------------ Painel
export function NodePanel({ node, refs, onChange, onDelete, onClose }: Props) {
  const meta = BLOCK_BY_TYPE[node.type];
  const Icon = meta?.icon ?? Link2;
  return (
    <aside className="flex h-full w-full flex-col border-l bg-background sm:w-[400px]">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Icon className="h-4 w-4 text-accent" />
        <Input
          value={node.data.title ?? ""}
          placeholder={meta?.label ?? node.type}
          onChange={(e) => onChange({ ...node.data, title: e.target.value })}
          className="h-8 border-none px-1 font-bold shadow-none focus-visible:ring-1"
        />
        {node.type !== "trigger" && (
          <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Excluir bloco">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4">
          {node.type === "trigger" ? (
            <TriggerPanel
              data={node.data as TriggerData}
              onChange={(d) => onChange({ ...d, title: node.data.title })}
              refs={refs}
            />
          ) : node.type === "message" ? (
            <MessagePanel
              data={node.data as { items: MsgItem[] }}
              onChange={onChange}
              refs={refs}
            />
          ) : node.type === "tags" ? (
            <TagsPanel data={node.data as any} onChange={onChange} refs={refs} />
          ) : node.type === "condition" ? (
            <ConditionPanel data={node.data} onChange={onChange} refs={refs} />
          ) : (
            <GenericPanel type={node.type} data={node.data} onChange={onChange} refs={refs} />
          )}
          <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground">{VARS_HINT}</p>
        </div>
      </ScrollArea>
    </aside>
  );
}
