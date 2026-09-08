import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Wand2, ImageIcon, ExternalLink, Download, Link2 } from "lucide-react";

function sanitizeFileName(name: string): string {
  const semAcentos = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return semAcentos.replace(/[^a-zA-Z0-9._-]/g, "_");
}

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
  const [briefing, setBriefing] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [loadingStep, setLoadingStep] = useState<
    "idle" | "gerando" | "refinando" | "importando" | "exportando"
  >("idle");
  const [post, setPost] = useState<GeneratedPost | null>(null);

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

    const { data, error: signError } = await supabase.storage
      .from("marketing-posts")
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    if (signError || !data) throw signError ?? new Error("Falha ao preparar a foto.");
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Gerador de posts</h1>
        <Button variant="outline" size="sm" onClick={handleConectarCanva}>
          <Link2 className="mr-2 h-4 w-4" /> Conectar Canva
        </Button>
      </div>

      {!post && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Novo post</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
