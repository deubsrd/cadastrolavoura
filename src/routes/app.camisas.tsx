import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFranqueado } from "@/hooks/use-franqueado";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shirt, Loader2, CheckCircle2, Clock } from "lucide-react";
import camisaLavoura from "@/assets/camisa-lavoura.png";

export const Route = createFileRoute("/app/camisas")({
  head: () => ({ meta: [{ title: "Camisas — Sistema Lavoura" }] }),
  component: CamisasPage,
});

const PRECO_UNITARIO = 65;
const TAMANHOS = ["PP", "P", "M", "G", "GG", "XG"] as const;
const GENEROS = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
] as const;

function chave(genero: string, tamanho: string) {
  return `${genero}:${tamanho}`;
}

type Pedido = {
  id: string;
  status: "pendente" | "atendido";
  created_at: string;
  camisa_pedido_itens: { tamanho: string; quantidade: number; genero: string }[];
};

function CamisasPage() {
  const { unidadeId, loading: loadingUnidade } = useFranqueado();
  const [quantidades, setQuantidades] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);

  const loadPedidos = async () => {
    setLoadingPedidos(true);
    const { data, error } = await supabase
      .from("camisa_pedidos")
      .select("id, status, created_at, camisa_pedido_itens(tamanho, quantidade, genero)")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setPedidos((data as Pedido[]) ?? []);
    setLoadingPedidos(false);
  };

  useEffect(() => {
    loadPedidos();
  }, []);

  const totalItens = GENEROS.reduce(
    (sum, g) =>
      sum + TAMANHOS.reduce((s, t) => s + (parseInt(quantidades[chave(g.value, t)] || "0", 10) || 0), 0),
    0,
  );
  const totalValor = totalItens * PRECO_UNITARIO;

  async function handleEnviar() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: socio } = await supabase
      .from("socios")
      .select("id")
      .eq("user_id", user?.id ?? "")
      .maybeSingle();

    if (!socio || !unidadeId) {
      toast.error("Não foi possível identificar seu cadastro de sócio/unidade.");
      return;
    }
    if (totalItens === 0) {
      toast.error("Preencha a quantidade de pelo menos um item.");
      return;
    }

    setEnviando(true);
    const { data: pedido, error: pedidoError } = await supabase
      .from("camisa_pedidos")
      .insert({ socio_id: socio.id, unidade_id: unidadeId })
      .select("id")
      .single();

    if (pedidoError || !pedido) {
      toast.error(pedidoError?.message ?? "Erro ao criar pedido.");
      setEnviando(false);
      return;
    }

    const itens = GENEROS.flatMap((g) =>
      TAMANHOS.filter((t) => (parseInt(quantidades[chave(g.value, t)] || "0", 10) || 0) > 0).map((t) => ({
        pedido_id: pedido.id,
        tamanho: t,
        genero: g.value,
        quantidade: parseInt(quantidades[chave(g.value, t)] || "0", 10),
      })),
    );

    const { error: itensError } = await supabase.from("camisa_pedido_itens").insert(itens);
    setEnviando(false);

    if (itensError) {
      toast.error(itensError.message);
      return;
    }

    toast.success("Pedido enviado! A franqueadora já pode ver e providenciar.");
    setQuantidades({});
    loadPedidos();
  }

  if (loadingUnidade) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Camisas da Lavoura</h1>
        <p className="text-sm text-muted-foreground">
          Peça as camisas da equipe da sua unidade. Preencha a quantidade por modelo e tamanho.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row">
          <img
            src={camisaLavoura}
            alt="Camisa da Lavoura"
            className="h-40 w-40 shrink-0 self-center rounded-lg border border-border object-cover sm:self-start"
          />
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Camisa polo oficial Lavoura</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              R$ {PRECO_UNITARIO.toFixed(2).replace(".", ",")}
              <span className="text-sm font-normal text-muted-foreground"> / unidade</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {GENEROS.map((g) => (
            <div key={g.value} className="space-y-2">
              <p className="text-sm font-medium text-foreground">{g.label}</p>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {TAMANHOS.map((t) => (
                  <div key={chave(g.value, t)} className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{t}</label>
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={quantidades[chave(g.value, t)] ?? ""}
                      onChange={(e) =>
                        setQuantidades((prev) => ({ ...prev, [chave(g.value, t)]: e.target.value }))
                      }
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between rounded-md bg-muted px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              {totalItens} {totalItens === 1 ? "camisa" : "camisas"}
            </span>
            <span className="font-semibold text-foreground">
              Total: R$ {totalValor.toFixed(2).replace(".", ",")}
            </span>
          </div>

          <Button onClick={handleEnviar} disabled={enviando || totalItens === 0}>
            {enviando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Shirt className="mr-2 h-4 w-4" />
            )}
            Enviar pedido
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Pedidos anteriores</h2>
        {loadingPedidos ? (
          <Skeleton className="h-24 w-full" />
        ) : pedidos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum pedido ainda.</p>
        ) : (
          pedidos.map((p) => {
            const qtd = p.camisa_pedido_itens.reduce((s, i) => s + i.quantidade, 0);
            const resumo = p.camisa_pedido_itens
              .map((i) => `${i.quantidade}× ${i.tamanho} (${i.genero === "feminino" ? "Fem" : "Masc"})`)
              .join(", ");
            return (
              <Card key={p.id}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-sm font-medium">{resumo}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      · {qtd} {qtd === 1 ? "camisa" : "camisas"} · R${" "}
                      {(qtd * PRECO_UNITARIO).toFixed(2).replace(".", ",")}
                    </p>
                  </div>
                  <Badge variant={p.status === "atendido" ? "outline" : "secondary"}>
                    {p.status === "atendido" ? (
                      <>
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Atendido
                      </>
                    ) : (
                      <>
                        <Clock className="mr-1 h-3 w-3" /> Pendente
                      </>
                    )}
                  </Badge>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
