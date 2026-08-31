import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Send, Plus, MessageCircleQuestion } from "lucide-react";

export const Route = createFileRoute("/admin/duvidas")({
  head: () => ({ meta: [{ title: "Dúvidas do chat — Lavoura" }] }),
  component: AdminDuvidas,
});

type Pendente = {
  id: string;
  pergunta: string;
  created_at: string;
  socio: { nome_completo: string } | null;
  unidade: { numero: string } | null;
};

type Conhecimento = {
  id: string;
  pergunta: string;
  resposta: string;
  created_at: string;
};

function AdminDuvidas() {
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [loadingPendentes, setLoadingPendentes] = useState(true);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState<string | null>(null);

  const [conhecimento, setConhecimento] = useState<Conhecimento[]>([]);
  const [loadingConhecimento, setLoadingConhecimento] = useState(true);
  const [novaPergunta, setNovaPergunta] = useState("");
  const [novaResposta, setNovaResposta] = useState("");
  const [salvandoNova, setSalvandoNova] = useState(false);

  const loadPendentes = async () => {
    setLoadingPendentes(true);
    const { data } = await supabase
      .from("chat_duvidas_pendentes")
      .select("id, pergunta, created_at, socio:socios(nome_completo), unidade:unidades(numero)")
      .eq("status", "pendente")
      .order("created_at", { ascending: true });
    setPendentes((data as unknown as Pendente[]) ?? []);
    setLoadingPendentes(false);
  };

  const loadConhecimento = async () => {
    setLoadingConhecimento(true);
    const { data } = await supabase
      .from("chat_conhecimento")
      .select("id, pergunta, resposta, created_at")
      .order("created_at", { ascending: false });
    setConhecimento((data as Conhecimento[]) ?? []);
    setLoadingConhecimento(false);
  };

  useEffect(() => {
    loadPendentes();
    loadConhecimento();
  }, []);

  const responder = async (item: Pendente) => {
    const resposta = (respostas[item.id] ?? "").trim();
    if (!resposta) {
      toast.error("Escreva uma resposta antes de enviar.");
      return;
    }
    setEnviando(item.id);

    const { error: upErr } = await supabase
      .from("chat_duvidas_pendentes")
      .update({ status: "respondida", resposta, respondida_em: new Date().toISOString() })
      .eq("id", item.id);

    if (upErr) {
      setEnviando(null);
      toast.error("Erro ao salvar resposta.");
      return;
    }

    const { error: insErr } = await supabase
      .from("chat_conhecimento")
      .insert({ pergunta: item.pergunta, resposta });

    setEnviando(null);

    if (insErr) {
      toast.error("Resposta salva, mas houve erro ao ensinar ao chat.");
    } else {
      toast.success("Respondido — o chat já vai usar essa resposta a partir de agora.");
    }

    setPendentes((prev) => prev.filter((p) => p.id !== item.id));
    loadConhecimento();
  };

  const adicionarConhecimento = async () => {
    if (!novaPergunta.trim() || !novaResposta.trim()) {
      toast.error("Preencha a pergunta e a resposta.");
      return;
    }
    setSalvandoNova(true);
    const { error } = await supabase
      .from("chat_conhecimento")
      .insert({ pergunta: novaPergunta.trim(), resposta: novaResposta.trim() });
    setSalvandoNova(false);
    if (error) {
      toast.error("Erro ao salvar.");
      return;
    }
    setNovaPergunta("");
    setNovaResposta("");
    toast.success("Adicionado à base de conhecimento.");
    loadConhecimento();
  };

  const removerConhecimento = async (id: string) => {
    const { error } = await supabase.from("chat_conhecimento").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover.");
      return;
    }
    setConhecimento((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageCircleQuestion className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dúvidas do chat</h1>
          <p className="text-sm text-muted-foreground">
            Perguntas que o assistente de tira-dúvidas não soube responder, e a base de
            conhecimento que ele usa para responder.
          </p>
        </div>
      </div>

      <Tabs defaultValue="pendentes">
        <TabsList>
          <TabsTrigger value="pendentes">
            Pendentes
            {pendentes.length > 0 && (
              <Badge variant="destructive" className="ml-1.5">
                {pendentes.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="conhecimento">Base de conhecimento</TabsTrigger>
        </TabsList>

        <TabsContent value="pendentes" className="space-y-3">
          {loadingPendentes ? (
            <div className="space-y-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : pendentes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma dúvida pendente — o chat está respondendo tudo sozinho por enquanto.
            </p>
          ) : (
            pendentes.map((item) => (
              <Card key={item.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {item.unidade && <Badge variant="secondary">Unidade {item.unidade.numero}</Badge>}
                    {item.socio && <span>{item.socio.nome_completo}</span>}
                    <span>
                      {new Date(item.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{item.pergunta}</p>
                  <Textarea
                    placeholder="Escreva a resposta que o chat deve dar a partir de agora…"
                    value={respostas[item.id] ?? ""}
                    onChange={(e) =>
                      setRespostas((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    className="min-h-20 text-sm"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => responder(item)}
                      disabled={enviando === item.id}
                    >
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      {enviando === item.id ? "Salvando…" : "Responder e ensinar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="conhecimento" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adicionar manualmente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Pergunta (ex: Posso usar amaciante de outra marca?)"
                value={novaPergunta}
                onChange={(e) => setNovaPergunta(e.target.value)}
              />
              <Textarea
                placeholder="Resposta"
                value={novaResposta}
                onChange={(e) => setNovaResposta(e.target.value)}
                className="min-h-20 text-sm"
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={adicionarConhecimento} disabled={salvandoNova}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {salvandoNova ? "Salvando…" : "Adicionar"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                O que o chat já sabe ({conhecimento.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              {loadingConhecimento ? (
                <div className="space-y-2 p-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : conhecimento.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">
                  Nada ensinado ainda — o chat responde só com o Manual de Operações.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pergunta</TableHead>
                      <TableHead>Resposta</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conhecimento.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="max-w-xs align-top font-medium">
                          {c.pergunta}
                        </TableCell>
                        <TableCell className="max-w-md align-top text-sm text-muted-foreground">
                          {c.resposta}
                        </TableCell>
                        <TableCell className="text-right align-top">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removerConhecimento(c.id)}
                            title="Remover"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
