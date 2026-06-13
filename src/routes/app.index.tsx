import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFranqueado } from "@/hooks/use-franqueado";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye, Building2 } from "lucide-react";

const TIPO_LABEL: Record<string, string> = {
  cof: "COF (Circular de Oferta de Franquia)",
  pre_contrato: "Pré-contrato",
  contrato: "Contrato",
  planta_obra: "Planta / Prancha da obra",
  outros: "Outros",
};

type Documento = {
  id: string;
  tipo: string;
  nome: string;
  storage_path: string;
  arquivado: boolean;
  versao: number;
  created_at: string;
};

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Minha Unidade — Sistema Lavoura" }] }),
  component: MinhaUnidade,
});

function MinhaUnidade() {
  const { loading, socio, unidade, unidadeId } = useFranqueado();
  const [docs, setDocs] = useState<Documento[]>([]);

  useEffect(() => {
    if (!unidadeId) return;
    supabase
      .from("unidade_documentos")
      .select("id, tipo, nome, storage_path, arquivado, versao, created_at")
      .eq("unidade_id", unidadeId)
      .eq("arquivado", false)
      .order("created_at", { ascending: false })
      .then(({ data }) => setDocs((data as Documento[]) ?? []));
  }, [unidadeId]);

  const open = async (doc: Documento) => {
    const { data, error } = await supabase.storage
      .from("unidade-documentos")
      .createSignedUrl(doc.storage_path, 60 * 5);
    if (!error && data) window.open(data.signedUrl, "_blank");
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }

  if (!unidade) {
    return (
      <div className="text-sm text-muted-foreground">
        Não encontramos uma unidade vinculada ao seu acesso. Fale com a franqueadora.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Minha Unidade</h1>
        <p className="text-sm text-muted-foreground">
          Dados cadastrais e documentos da sua unidade Lavoura.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <CardTitle>
            Unidade {unidade.numero}
            {unidade.nome ? ` — ${unidade.nome}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Endereço</p>
            <p className="font-medium">{unidade.endereco || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">CNPJ</p>
            <p className="font-medium">{unidade.cnpj || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Status</p>
            <Badge variant={unidade.ativo ? "default" : "secondary"}>
              {unidade.ativo ? "Ativa" : "Em implantação"}
            </Badge>
          </div>
          {socio && (
            <div>
              <p className="text-muted-foreground">Sócio responsável</p>
              <p className="font-medium">{socio.nome_completo}</p>
              <p className="text-xs text-muted-foreground">
                {socio.email} · {socio.telefone}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documentos da unidade</CardTitle>
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum documento disponível ainda.</p>
          ) : (
            <div className="space-y-2">
              {docs.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-md border border-border p-3"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{d.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {TIPO_LABEL[d.tipo] ?? d.tipo} · v{d.versao}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => open(d)}>
                    <Eye className="mr-1.5 h-4 w-4" /> Abrir
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
