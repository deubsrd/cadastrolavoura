import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFranqueado } from "@/hooks/use-franqueado";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Sparkles,
  Wand2,
  ImageIcon,
  ExternalLink,
  Download,
  Link2,
  CalendarDays,
  History,
  Plus,
  Trash2,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/app/marketing")({
  head: () => ({ meta: [{ title: "Marketing — Sistema Lavoura" }] }),
  component: MarketingPage,
});

const PILLAR_LABEL: Record<string, string> = {
  conhecer: "Conhecer",
  gostar: "Gostar",
  confiar: "Confiar",
  comprar: "Comprar",
};

const SUGESTOES: { pilar: string; titulo: string; texto: string }[] = [
  {
    pilar: "conhecer",
    titulo: "Apresentar a marca",
    texto:
      "Apresente a Lavoura pra quem ainda não conhece: como funciona o autosserviço e o que a unidade oferece.",
  },
  {
    pilar: "gostar",
    titulo: "Bastidores da unidade",
    texto: "Mostre os bastidores da unidade: o ambiente, a equipe, um momento do dia a dia.",
  },
  {
    pilar: "confiar",
    titulo: "Depoimento ou resultado",
    texto: "Compartilhe um depoimento de cliente ou um resultado que mostra a qualidade do serviço.",
  },
  {
    pilar: "comprar",
    titulo: "Chamada pra usar ou virar franqueado",
    texto:
      "Chame quem já conhece a Lavoura pra usar essa semana, ou quem tem interesse em virar franqueado.",
  },
];

type GeneratedPost = {
  briefing_id: string;
  post_id: string;
  pillar: string;
  headline: string;
  caption: string;
  hashtags: string[];
  image_url?: string;
  canva_edit_url?: string;
  final_image_url?: string;
};

async function invoke<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) throw new Error(error.message ?? "Falha ao chamar a função.");
  if (data?.error) throw new Error(data.error);
  return data as T;
}

function MarketingPage() {
  const [activeTab, setActiveTab] = useState("gerar");
  // Ponte entre a aba Calendário e a aba Gerar post: quando o franqueado
  // clica em "Gerar este post" num item do calendário, guardamos aqui pra
  // marcar aquele item como publicado assim que o post for gerado.
  const [calendarioPendente, setCalendarioPendente] = useState<{
    id: string;
    tema: string;
    pilar: string;
  } | null>(null);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Marketing</h1>
        <p className="text-sm text-muted-foreground">
          Gere posts para o Instagram, planeje o calendário editorial e veja o que já foi publicado.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="gerar">
            <Sparkles className="mr-1.5 h-4 w-4" /> Gerar post
          </TabsTrigger>
          <TabsTrigger value="calendario">
            <CalendarDays className="mr-1.5 h-4 w-4" /> Calendário
          </TabsTrigger>
          <TabsTrigger value="historico">
            <History className="mr-1.5 h-4 w-4" /> Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gerar" className="mt-4">
          <GerarPostTab
            prefill={calendarioPendente}
            onGerado={async () => {
              if (calendarioPendente) {
                await supabase
                  .from("marketing_calendario")
                  .update({ status: "publicado" })
                  .eq("id", calendarioPendente.id);
                setCalendarioPendente(null);
              }
            }}
          />
        </TabsContent>

        <TabsContent value="calendario" className="mt-4">
          <CalendarioTab
            onGerarPost={(entry) => {
              setCalendarioPendente(entry);
              setActiveTab("gerar");
            }}
          />
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <HistoricoTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba: Gerar post
// ---------------------------------------------------------------------------
function GerarPostTab({
  prefill,
  onGerado,
}: {
  prefill: { id: string; tema: string; pilar: string } | null;
  onGerado: () => void;
}) {
  const [briefing, setBriefing] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [loadingStep, setLoadingStep] = useState<
    "idle" | "gerando" | "refinando" | "importando" | "exportando"
  >("idle");
  const [post, setPost] = useState<GeneratedPost | null>(null);

  useEffect(() => {
    if (prefill) setBriefing(prefill.tema);
  }, [prefill]);

  function sanitizeFileName(name: string): string {
    const semAcentos = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return semAcentos.replace(/[^a-zA-Z0-9._-]/g, "_");
  }

  async function uploadPhoto(): Promise<string | null> {
    if (!photoFile) return null;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado.");

    const path = `${user.id}/${Date.now()}-${sanitizeFileName(photoFile.name)}`;
    const { error: uploadError } = await supabase.storage
      .from("marketing-posts")
      .upload(path, photoFile, { upsert: true });
    if (uploadError) throw uploadError;

    const { data, error: signedUrlError } = await supabase.storage
      .from("marketing-posts")
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    if (signedUrlError) throw signedUrlError;
    return data.signedUrl;
  }

  async function handleGerar() {
    if (!briefing.trim()) return;
    setLoadingStep("gerando");
    try {
      const photoUrl = await uploadPhoto();
      const gerado = await invoke<GeneratedPost>("gerar-legenda", {
        briefing_text: briefing,
        photo_url: photoUrl,
      });
      const arte = await invoke<{ image_url: string }>("renderizar-arte", {
        post_id: gerado.post_id,
      });
      setPost({ ...gerado, image_url: arte.image_url });
      setCaption(gerado.caption);
      await onGerado();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar o post.");
    } finally {
      setLoadingStep("idle");
    }
  }

  async function handleRefinarLegenda() {
    if (!post) return;
    setLoadingStep("refinando");
    try {
      const gerado = await invoke<GeneratedPost>("gerar-legenda", {
        briefing_text: briefing,
        briefing_id: post.briefing_id,
        post_id: post.post_id,
      });
      setPost({ ...post, ...gerado });
      setCaption(gerado.caption);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao refinar a legenda.");
    } finally {
      setLoadingStep("idle");
    }
  }

  async function handleAbrirNoCanva() {
    if (!post) return;
    setLoadingStep("importando");
    try {
      const resultado = await invoke<{ edit_url?: string; status?: string }>("canva-import", {
        post_id: post.post_id,
      });
      if (resultado.edit_url) {
        window.open(resultado.edit_url, "_blank");
        setPost({ ...post, canva_edit_url: resultado.edit_url });
      } else {
        toast.error(`Import ainda em andamento (status: ${resultado.status}). Tente de novo em instantes.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao abrir no Canva.");
    } finally {
      setLoadingStep("idle");
    }
  }

  async function handleAprovarEBaixar() {
    if (!post) return;
    setLoadingStep("exportando");
    try {
      const resultado = await invoke<{ final_image_url?: string; status?: string }>("canva-export", {
        post_id: post.post_id,
      });
      if (resultado.final_image_url) {
        setPost({ ...post, final_image_url: resultado.final_image_url });
        window.open(resultado.final_image_url, "_blank");
        toast.success("Post aprovado! PNG final pronto pra baixar.");
      } else {
        toast.error(`Export ainda em andamento (status: ${resultado.status}). Tente de novo em instantes.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao exportar do Canva.");
    } finally {
      setLoadingStep("idle");
    }
  }

  async function handleConectarCanva() {
    try {
      const { authorize_url } = await invoke<{ authorize_url: string }>("canva-oauth-init", {});
      window.location.href = authorize_url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao conectar o Canva.");
    }
  }

  function handleTrocarFoto() {
    setPost(null);
    setCaption("");
  }

  return (
    <div className="space-y-4">
      {!post && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Novo post</CardTitle>
            <Button variant="outline" size="sm" onClick={handleConectarCanva}>
              <Link2 className="mr-2 h-4 w-4" /> Conectar Canva
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {SUGESTOES.map((s) => (
                <button
                  key={s.titulo}
                  type="button"
                  onClick={() => setBriefing(s.texto)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {s.titulo}
                </button>
              ))}
            </div>

            <Textarea
              placeholder="Conte o que você quer divulgar (ex: nova unidade, promoção, resultado do mês...)"
              value={briefing}
              onChange={(e) => setBriefing(e.target.value)}
              rows={5}
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              className="text-sm text-muted-foreground"
            />
            <Button
              onClick={handleGerar}
              disabled={!briefing.trim() || loadingStep === "gerando"}
              className="w-full sm:w-auto"
            >
              {loadingStep === "gerando" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Gerar post
            </Button>
          </CardContent>
        </Card>
      )}

      {post && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Preview</CardTitle>
            <Badge variant={post.pillar === "comprar" ? "default" : "secondary"}>
              {PILLAR_LABEL[post.pillar] ?? post.pillar}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {(post.final_image_url ?? post.image_url) ? (
              <img
                src={post.final_image_url ?? post.image_url}
                alt="Arte gerada"
                className="w-full rounded-lg border border-border"
              />
            ) : (
              <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
                <ImageIcon className="mr-2 h-5 w-5" /> Renderizando arte...
              </div>
            )}

            <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={6} />

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleRefinarLegenda} disabled={loadingStep !== "idle"}>
                {loadingStep === "refinando" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Refinar legenda
              </Button>
              <Button variant="outline" size="sm" onClick={handleTrocarFoto} disabled={loadingStep !== "idle"}>
                Trocar foto
              </Button>
              <Button variant="outline" size="sm" onClick={handleAbrirNoCanva} disabled={loadingStep !== "idle"}>
                {loadingStep === "importando" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" />
                )}
                Abrir no Canva
              </Button>
              <Button size="sm" onClick={handleAprovarEBaixar} disabled={loadingStep !== "idle"}>
                {loadingStep === "exportando" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Aprovar e baixar PNG
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba: Calendário editorial
// ---------------------------------------------------------------------------
type CalendarioEntry = {
  id: string;
  mes: string;
  pilar: string;
  tema: string;
  status: "planejado" | "publicado";
};

function CalendarioTab({
  onGerarPost,
}: {
  onGerarPost: (entry: { id: string; tema: string; pilar: string }) => void;
}) {
  const { socio } = useFranqueado();
  const [entries, setEntries] = useState<CalendarioEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoMes, setNovoMes] = useState(() => new Date().toISOString().slice(0, 7)); // AAAA-MM
  const [novoPilar, setNovoPilar] = useState("conhecer");
  const [novoTema, setNovoTema] = useState("");
  const [salvando, setSalvando] = useState(false);

  const load = async () => {
    if (!socio) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("marketing_calendario")
      .select("id, mes, pilar, tema, status")
      .eq("socio_id", socio.id)
      .order("mes", { ascending: true });
    if (error) toast.error(error.message);
    setEntries((data as CalendarioEntry[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socio?.id]);

  async function handleAdicionar() {
    if (!socio || !novoTema.trim()) return;
    setSalvando(true);
    const { error } = await supabase.from("marketing_calendario").insert({
      socio_id: socio.id,
      mes: `${novoMes}-01`,
      pilar: novoPilar,
      tema: novoTema.trim(),
    });
    setSalvando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNovoTema("");
    load();
  }

  async function handleExcluir(id: string) {
    const { error } = await supabase.from("marketing_calendario").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleMarcarPublicado(id: string) {
    const { error } = await supabase
      .from("marketing_calendario")
      .update({ status: "publicado" })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status: "publicado" } : e)));
  }

  const grouped = entries.reduce<Record<string, CalendarioEntry[]>>((acc, e) => {
    (acc[e.mes] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Planejar novo tema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="month"
              value={novoMes}
              onChange={(e) => setNovoMes(e.target.value)}
            />
            <Select value={novoPilar} onValueChange={setNovoPilar}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PILLAR_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            placeholder="Tema ou ideia do post (ex: promoção de aniversário da unidade)"
            value={novoTema}
            onChange={(e) => setNovoTema(e.target.value)}
            rows={2}
          />
          <Button onClick={handleAdicionar} disabled={!novoTema.trim() || salvando} size="sm">
            {salvando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Adicionar ao calendário
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum tema planejado ainda. Adicione ideias acima pra organizar os próximos posts.
        </p>
      ) : (
        Object.entries(grouped).map(([mes, itens]) => (
          <div key={mes} className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              {new Date(`${mes}T00:00:00`).toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric",
              })}
            </h3>
            {itens.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant={entry.pilar === "comprar" ? "default" : "secondary"}>
                        {PILLAR_LABEL[entry.pilar] ?? entry.pilar}
                      </Badge>
                      {entry.status === "publicado" && (
                        <Badge variant="outline" className="text-success">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Publicado
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground">{entry.tema}</p>
                  </div>
                  <div className="flex gap-2">
                    {entry.status !== "publicado" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            onGerarPost({ id: entry.id, tema: entry.tema, pilar: entry.pilar })
                          }
                        >
                          Gerar este post
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleMarcarPublicado(entry.id)}
                        >
                          Marcar publicado
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => handleExcluir(entry.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba: Histórico
// ---------------------------------------------------------------------------
type HistoricoPost = {
  id: string;
  pillar: string;
  headline: string | null;
  caption: string | null;
  status: string;
  canva_edit_url: string | null;
  created_at: string;
  image_url: string | null;
  final_image_url: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  rendering: "Renderizando",
  imported_to_canva: "Importado no Canva",
  editing: "Editando no Canva",
  exporting: "Exportando",
  approved: "Aprovado",
  error: "Erro",
};

function HistoricoTab() {
  const [posts, setPosts] = useState<HistoricoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    invoke<{ posts: HistoricoPost[] }>("historico-posts", {})
      .then((r) => setPosts(r.posts))
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar histórico."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>;
  }

  if (posts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum post gerado ainda. Os posts que você criar na aba "Gerar post" aparecem aqui.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <Card key={post.id}>
          <CardContent className="flex gap-4 p-4">
            {post.final_image_url ?? post.image_url ? (
              <img
                src={post.final_image_url ?? post.image_url ?? undefined}
                alt={post.headline ?? "Post"}
                className="h-20 w-20 shrink-0 rounded-md border border-border object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
                <ImageIcon className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Badge variant={post.pillar === "comprar" ? "default" : "secondary"}>
                  {PILLAR_LABEL[post.pillar] ?? post.pillar}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {STATUS_LABEL[post.status] ?? post.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(post.created_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              {post.headline && <p className="text-sm font-medium">{post.headline}</p>}
              {post.caption && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{post.caption}</p>
              )}
              {post.canva_edit_url && (
                <a
                  href={post.canva_edit_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> Abrir no Canva
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
