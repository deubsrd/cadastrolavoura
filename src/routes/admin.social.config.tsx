/* eslint-disable @typescript-eslint/no-explicit-any -- dados dos blocos são JSON livre vindo do grafo */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Instagram,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sdb, callFn, type Tag, type CustomField } from "@/lib/social/api";

const TABS = [
  "canais",
  "ranking",
  "etiquetas",
  "campos",
  "bloqueios",
  "atalhos",
  "iniciadores",
  "variaveis",
  "ia",
] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute("/admin/social/config")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab; ig?: string; msg?: string } => ({
    tab: (TABS as readonly string[]).includes(String(s.tab)) ? (s.tab as Tab) : undefined,
    ig: typeof s.ig === "string" ? s.ig : undefined,
    msg: typeof s.msg === "string" ? s.msg : undefined,
  }),
  component: Config,
});

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";

function Config() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const tab = search.tab ?? "canais";

  useEffect(() => {
    if (search.ig === "ok") toast.success("Instagram conectado!");
    if (search.ig === "erro") toast.error(`Não conectou: ${search.msg ?? "erro"}`);
    if (search.ig === "cancelado") toast("Conexão cancelada.");
  }, [search.ig, search.msg]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold tracking-tight text-primary">Configurações</h1>
      <Tabs
        value={tab}
        onValueChange={(v) => navigate({ to: "/admin/social/config", search: { tab: v as Tab } })}
      >
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="canais">Canais</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          <TabsTrigger value="etiquetas">Etiquetas</TabsTrigger>
          <TabsTrigger value="campos">Campos</TabsTrigger>
          <TabsTrigger value="bloqueios">Bloqueios</TabsTrigger>
          <TabsTrigger value="atalhos">Atalhos de chat</TabsTrigger>
          <TabsTrigger value="iniciadores">Iniciadores de conversa</TabsTrigger>
          <TabsTrigger value="variaveis">Variáveis</TabsTrigger>
          <TabsTrigger value="ia">IA</TabsTrigger>
        </TabsList>
        <div className="mt-4">
          <TabsContent value="canais">
            <Canais />
          </TabsContent>
          <TabsContent value="ranking">
            <RankingCfg />
          </TabsContent>
          <TabsContent value="etiquetas">
            <Etiquetas />
          </TabsContent>
          <TabsContent value="campos">
            <Campos />
          </TabsContent>
          <TabsContent value="bloqueios">
            <Bloqueios />
          </TabsContent>
          <TabsContent value="atalhos">
            <Atalhos />
          </TabsContent>
          <TabsContent value="iniciadores">
            <Iniciadores />
          </TabsContent>
          <TabsContent value="variaveis">
            <Variaveis />
          </TabsContent>
          <TabsContent value="ia">
            <IACfg />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// ------------------------------------------------------------------ canais
type Channel = {
  id: string;
  username: string | null;
  name: string | null;
  avatar_url: string | null;
  status: string;
  token_expires_at: string | null;
};

function Canais() {
  const [chs, setChs] = useState<Channel[] | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () =>
    sdb
      .from("ss_channels")
      .select("id, username, name, avatar_url, status, token_expires_at")
      .eq("kind", "instagram")
      .order("updated_at", { ascending: false })
      .then(({ data }) => setChs((data ?? []) as Channel[]));
  useEffect(() => {
    load();
  }, []);

  const connect = async () => {
    setBusy(true);
    try {
      const { url } = await callFn<{ url: string }>("ig-oauth", { action: "start" });
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
      setBusy(false);
    }
  };
  const disconnect = async (id: string) => {
    if (!window.confirm("Desconectar? As automações param de receber eventos.")) return;
    await callFn("ig-oauth", { action: "disconnect", channel_id: id });
    load();
  };
  const copy = (t: string) => {
    navigator.clipboard.writeText(t);
    toast.success("Copiado");
  };
  const webhook = `${SUPABASE_URL}/functions/v1/ig-webhook`;
  const callback = `${SUPABASE_URL}/functions/v1/ig-oauth`;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5 text-accent" /> Instagram
          </CardTitle>
          <CardDescription>
            Conta profissional (empresa ou criador) da Lavoura, conectada pelo login oficial do
            Instagram.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {chs === null ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            chs
              .filter((c) => c.status !== "disconnected")
              .map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt="" className="h-10 w-10 rounded-full" />
                  ) : (
                    <Instagram className="h-10 w-10 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">@{c.username}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      {c.status === "connected" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                      )}
                      {c.status === "connected" ? "Conectado" : "Token expirado: reconecte"}
                      {c.token_expires_at &&
                        ` · renova sozinho antes de ${new Date(c.token_expires_at).toLocaleDateString("pt-BR")}`}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={connect}>
                    <RefreshCw className="mr-1 h-4 w-4" /> Reconectar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => disconnect(c.id)}>
                    Desconectar
                  </Button>
                </div>
              ))
          )}
          {chs && !chs.some((c) => c.status !== "disconnected") && (
            <Button onClick={connect} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Instagram className="mr-1 h-4 w-4" />
              )}{" "}
              Conectar Instagram
            </Button>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Endereços para o app da Meta</CardTitle>
          <CardDescription>
            Use no painel developers.facebook.com → seu app → Instagram → Configuração da API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {[
            ["URL de callback (Webhooks)", webhook],
            ["URL de redirecionamento OAuth", callback],
          ].map(([l, v]) => (
            <div key={l}>
              <Label className="text-xs">{l}</Label>
              <div className="flex gap-2">
                <Input readOnly value={v} className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => copy(v)} aria-label="Copiar">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Campos de webhook a assinar: comments, live_comments, messages, messaging_postbacks.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ------------------------------------------------------------------ ranking
const POINT_LABELS: Record<string, [string, string]> = {
  comment: ["Comentário", "Comentário em uma publicação"],
  story_reply: ["Resposta a story", "Resposta do contato a um story"],
  story_mention: ["Menção em story", "O contato menciona o perfil no story dele"],
  live_comment: ["Comentário em live", "Comentário durante uma transmissão"],
  dm: ["Mensagem direta", "Mensagem enviada na DM"],
};

function useSettings() {
  const [s, setS] = useState<Record<string, any> | null>(null);
  useEffect(() => {
    sdb
      .from("ss_settings")
      .select("*")
      .single()
      .then(({ data }) => setS(data));
  }, []);
  const save = async (patch: Record<string, unknown>) => {
    const { error } = await sdb
      .from("ss_settings")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", true);
    if (error) return toast.error(error.message);
    setS((cur) => ({ ...(cur ?? {}), ...patch }));
    toast.success("Salvo");
  };
  return { s, setS, save };
}

function RankingCfg() {
  const { s, setS, save } = useSettings();
  if (!s) return <Loader2 className="h-5 w-5 animate-spin" />;
  const pts = s.score_points ?? {};
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pontuação por tipo de interação</CardTitle>
        <CardDescription>
          De 0 a 10 pontos. A pontuação do contato é a soma de tudo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(POINT_LABELS).map(([k, [l, d]]) => (
          <div key={k} className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium">{l}</p>
              <p className="text-xs text-muted-foreground">{d}</p>
            </div>
            <Input
              type="number"
              min={0}
              max={10}
              className="w-20"
              value={pts[k] ?? 0}
              onChange={(e) =>
                setS({
                  ...s,
                  score_points: {
                    ...pts,
                    [k]: Math.min(10, Math.max(0, Number(e.target.value) || 0)),
                  },
                })
              }
            />
          </div>
        ))}
        <Button onClick={() => save({ score_points: s.score_points })}>Salvar configurações</Button>
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------------ CRUDs simples
function Etiquetas() {
  const [tags, setTags] = useState<(Tag & { ss_contact_tags: { count: number }[] })[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#e17c4c");
  const load = () =>
    sdb
      .from("ss_tags")
      .select("*, ss_contact_tags(count)")
      .order("name")
      .then(({ data }) => setTags(data ?? []));
  useEffect(() => {
    load();
  }, []);
  const add = async () => {
    if (!name.trim()) return;
    const { error } = await sdb.from("ss_tags").insert({ name: name.trim(), color });
    if (error)
      return toast.error(
        error.message.includes("duplicate")
          ? "Já existe uma etiqueta com esse nome."
          : error.message,
      );
    setName("");
    load();
  };
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nova etiqueta (ex.: Lead franquia)"
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-12 rounded border"
            aria-label="Cor"
          />
          <Button onClick={add}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {tags.map((t) => (
          <div key={t.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
            <input
              type="color"
              value={t.color}
              onChange={async (e) => {
                await sdb.from("ss_tags").update({ color: e.target.value }).eq("id", t.id);
                load();
              }}
              className="h-7 w-8 rounded border"
              aria-label="Cor"
            />
            <span className="flex-1 text-sm font-medium">{t.name}</span>
            <span className="text-xs text-muted-foreground">
              {t.ss_contact_tags?.[0]?.count ?? 0} contatos
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                if (window.confirm(`Excluir "${t.name}"?`)) {
                  await sdb.from("ss_tags").delete().eq("id", t.id);
                  load();
                }
              }}
              aria-label="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Campos() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [label, setLabel] = useState("");
  const [type, setType] = useState("text");
  const load = () =>
    sdb
      .from("ss_custom_fields")
      .select("*")
      .order("label")
      .then(({ data }) => setFields((data ?? []) as CustomField[]));
  useEffect(() => {
    load();
  }, []);
  const add = async () => {
    if (!label.trim()) return;
    const key = label
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    const { error } = await sdb.from("ss_custom_fields").insert({ key, label: label.trim(), type });
    if (error) return toast.error(error.message);
    setLabel("");
    load();
  };
  return (
    <Card>
      <CardHeader>
        <CardDescription>
          Campos extras do contato, preenchidos por Perguntas, HTTP ou à mão. Use no texto como{" "}
          {"{{campo.chave}}"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Nome do campo (ex.: Cidade)"
          />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                ["text", "Texto"],
                ["number", "Número"],
                ["date", "Data"],
                ["email", "E-mail"],
                ["phone", "Telefone"],
                ["boolean", "Sim/Não"],
              ].map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={add}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {fields.map((f) => (
          <div key={f.id} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
            <span className="flex-1 font-medium">{f.label}</span>
            <code className="text-xs text-muted-foreground">{`{{campo.${f.key}}}`}</code>
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                if (
                  window.confirm(
                    `Excluir o campo "${f.label}"? Os valores já salvos nos contatos ficam.`,
                  )
                ) {
                  await sdb.from("ss_custom_fields").delete().eq("id", f.id);
                  load();
                }
              }}
              aria-label="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Bloqueios() {
  const { s, setS, save } = useSettings();
  const [blocked, setBlocked] = useState<
    { id: string; username: string | null; name: string | null }[]
  >([]);
  const load = () =>
    sdb
      .from("ss_contacts")
      .select("id, username, name")
      .eq("blocked", true)
      .order("username")
      .then(({ data }) => setBlocked(data ?? []));
  useEffect(() => {
    load();
  }, []);
  if (!s) return <Loader2 className="h-5 w-5 animate-spin" />;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Palavras bloqueadas</CardTitle>
          <CardDescription>
            Mensagens ou comentários com estas palavras nunca disparam automação (ex.: reclamações,
            palavrões). Uma por linha.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={5}
            value={(s.blocked_words ?? []).join("\n")}
            onChange={(e) => setS({ ...s, blocked_words: e.target.value.split("\n") })}
          />
          <Button
            onClick={() =>
              save({
                blocked_words: (s.blocked_words ?? []).map((w: string) => w.trim()).filter(Boolean),
              })
            }
          >
            Salvar
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contatos bloqueados ({blocked.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {blocked.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
            >
              <span>{b.name ?? `@${b.username}`}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await sdb.from("ss_contacts").update({ blocked: false }).eq("id", b.id);
                  load();
                }}
              >
                Desbloquear
              </Button>
            </div>
          ))}
          {!blocked.length && (
            <p className="text-sm text-muted-foreground">
              Ninguém bloqueado. Bloqueie pelo painel do contato.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Atalhos() {
  const [rows, setRows] = useState<{ id: string; shortcut: string; text: string }[]>([]);
  const [sc, setSc] = useState("");
  const [tx, setTx] = useState("");
  const load = () =>
    sdb
      .from("ss_shortcuts")
      .select("*")
      .order("shortcut")
      .then(({ data }) => setRows(data ?? []));
  useEffect(() => {
    load();
  }, []);
  const add = async () => {
    const shortcut = sc.trim().replace(/^\//, "").toLowerCase();
    if (!shortcut || !tx.trim()) return;
    const { error } = await sdb.from("ss_shortcuts").insert({ shortcut, text: tx.trim() });
    if (error) return toast.error(error.message);
    setSc("");
    setTx("");
    load();
  };
  return (
    <Card>
      <CardHeader>
        <CardDescription>
          No chat, digite / + atalho para inserir o texto (ex.: /endereco).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-[160px_1fr_auto]">
          <Input value={sc} onChange={(e) => setSc(e.target.value)} placeholder="/atalho" />
          <Input value={tx} onChange={(e) => setTx(e.target.value)} placeholder="Texto completo" />
          <Button onClick={add}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {rows.map((r) => (
          <div key={r.id} className="flex items-start gap-3 rounded-lg border px-3 py-2 text-sm">
            <b className="w-32 shrink-0">/{r.shortcut}</b>
            <span className="flex-1 whitespace-pre-wrap text-muted-foreground">{r.text}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                await sdb.from("ss_shortcuts").delete().eq("id", r.id);
                load();
              }}
              aria-label="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Iniciadores() {
  const [rows, setRows] = useState<{ id: string; question: string; workflow_id: string | null }[]>(
    [],
  );
  const [wfs, setWfs] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const [{ data }, { data: w }] = await Promise.all([
      sdb.from("ss_ice_breakers").select("*").order("position"),
      sdb.from("ss_workflows").select("id, name").order("name"),
    ]);
    setRows(data ?? []);
    setWfs(w ?? []);
  };
  useEffect(() => {
    load();
  }, []);
  const publish = async () => {
    setBusy(true);
    try {
      for (const [i, r] of rows.entries())
        await sdb
          .from("ss_ice_breakers")
          .update({ question: r.question, workflow_id: r.workflow_id, position: i })
          .eq("id", r.id);
      await callFn("ss-engine", { action: "ice_breakers" });
      toast.success("Publicado no Instagram");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Perguntas que aparecem quando alguém abre a DM pela 1ª vez
        </CardTitle>
        <CardDescription>
          Até 4. Cada uma pode iniciar uma automação (que fica ativa).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((r, i) => (
          <div
            key={r.id}
            className="grid gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_220px_auto]"
          >
            <Input
              value={r.question}
              maxLength={80}
              onChange={(e) =>
                setRows(rows.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))
              }
              placeholder="Ex.: Como funciona a lavanderia?"
            />
            <Select
              value={r.workflow_id ?? "none"}
              onValueChange={(v) =>
                setRows(
                  rows.map((x, j) =>
                    j === i ? { ...x, workflow_id: v === "none" ? null : v } : x,
                  ),
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem automação</SelectItem>
                {wfs.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                await sdb.from("ss_ice_breakers").delete().eq("id", r.id);
                load();
              }}
              aria-label="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <div className="flex gap-2">
          {rows.length < 4 && (
            <Button
              variant="outline"
              onClick={async () => {
                await sdb.from("ss_ice_breakers").insert({ question: "", position: rows.length });
                load();
              }}
            >
              <Plus className="mr-1 h-4 w-4" /> Pergunta
            </Button>
          )}
          <Button onClick={publish} disabled={busy}>
            {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Publicar no Instagram
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Variaveis() {
  const [rows, setRows] = useState<{ id: string; key: string; value: string }[]>([]);
  const [k, setK] = useState("");
  const [v, setV] = useState("");
  const load = () =>
    sdb
      .from("ss_variables")
      .select("*")
      .order("key")
      .then(({ data }) => setRows(data ?? []));
  useEffect(() => {
    load();
  }, []);
  const add = async () => {
    const key = k
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_");
    if (!key) return;
    const { error } = await sdb.from("ss_variables").insert({ key, value: v });
    if (error) return toast.error(error.message);
    setK("");
    setV("");
    load();
  };
  return (
    <Card>
      <CardHeader>
        <CardDescription>
          Valores usados em várias automações. Mude aqui e todas atualizam. Use {"{{var.chave}}"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-[180px_1fr_auto]">
          <Input
            value={k}
            onChange={(e) => setK(e.target.value)}
            placeholder="chave (ex.: link_site)"
          />
          <Input value={v} onChange={(e) => setV(e.target.value)} placeholder="valor" />
          <Button onClick={add}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {rows.map((r) => (
          <div key={r.id} className="grid items-center gap-2 sm:grid-cols-[180px_1fr_auto]">
            <code className="text-sm">{`{{var.${r.key}}}`}</code>
            <Input
              defaultValue={r.value}
              onBlur={async (e) => {
                if (e.target.value !== r.value) {
                  await sdb.from("ss_variables").update({ value: e.target.value }).eq("id", r.id);
                  toast.success("Salvo");
                }
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                await sdb.from("ss_variables").delete().eq("id", r.id);
                load();
              }}
              aria-label="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function IACfg() {
  const { s, setS, save } = useSettings();
  if (!s) return <Loader2 className="h-5 w-5 animate-spin" />;
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          <Label>Tom de voz da IA</Label>
          <Textarea
            rows={4}
            value={s.ai_tone}
            onChange={(e) => setS({ ...s, ai_tone: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Vale para respostas geradas, bloco "Peça à IA" e o Assistente.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Minutos economizados por mensagem automática</Label>
          <Input
            type="number"
            step="0.5"
            min={0}
            className="w-28"
            value={s.minutes_saved_per_reply}
            onChange={(e) => setS({ ...s, minutes_saved_per_reply: Number(e.target.value) })}
          />
          <p className="text-xs text-muted-foreground">
            Usado no indicador "Tempo economizado" do painel.
          </p>
        </div>
        <Button
          onClick={() =>
            save({ ai_tone: s.ai_tone, minutes_saved_per_reply: s.minutes_saved_per_reply })
          }
        >
          Salvar
        </Button>
      </CardContent>
    </Card>
  );
}
