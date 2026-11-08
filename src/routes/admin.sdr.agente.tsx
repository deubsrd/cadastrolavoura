import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Copy, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sdrDb } from "@/lib/sdr/api";

export const Route = createFileRoute("/admin/sdr/agente")({
  component: Agente,
});

type Config = {
  ia_ligada: boolean;
  mensagem_abertura: string;
  instrucoes: string;
  base_conhecimento: string;
  cidades_plano: string;
  sdr_whatsapp: string | null;
  closer_email: string | null;
};

const WEBHOOK_URL = "https://vmaniutkhisiktjrgswd.supabase.co/functions/v1/wa-webhook";

const BASE_SUGERIDA = `Investimento total estimado (COF): R$ 171.292,36 no modelo de 3 conjuntos de máquinas ou R$ 231.092,36 no modelo de 5 conjuntos.
Taxa inicial de franquia: R$ 25.900,00.
Royalties: 6% sobre o faturamento bruto mensal.
Fundo de propaganda: isento, com investimento mínimo de R$ 1.800/mês em marketing local.
Ponto: de 15 a 60 m², em bairros de classe média e média-baixa com alta densidade de moradores.
Diferenciais da loja: autosserviço aberto 24h, café, coworking, espaço kids, cestos grandes.
Suporte: análise de ponto, acompanhamento de obra, treinamento, Lavoura Tips e Central do Franqueado.
A COF é enviada depois da reunião de apresentação, e precisa chegar pelo menos 10 dias antes de qualquer assinatura ou pagamento.`;

function Agente() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    sdrDb
      .from("sdr_config")
      .select("*")
      .eq("id", true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setCfg(
          (data as Config) ?? {
            ia_ligada: true,
            mensagem_abertura: "",
            instrucoes: "",
            base_conhecimento: "",
            cidades_plano: "",
            sdr_whatsapp: null,
            closer_email: null,
          },
        );
      });
  }, []);

  if (!cfg) return <Loader2 className="mx-auto mt-10 h-5 w-5 animate-spin" />;

  const set = (p: Partial<Config>) => setCfg({ ...cfg, ...p });

  const save = async () => {
    setSaving(true);
    const { error } = await sdrDb.from("sdr_config").upsert({ id: true, ...cfg });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Configuração salva");
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Agente de IA</CardTitle>
            <CardDescription>
              Desligado, as mensagens continuam chegando nas Conversas, mas ninguém responde
              automaticamente.
            </CardDescription>
          </div>
          <Switch checked={cfg.ia_ligada} onCheckedChange={(v) => set({ ia_ligada: v })} />
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roteiro</CardTitle>
          <CardDescription>
            O filtro de 5 perguntas e as notas seguem a Estratégia Agrotóxicos e já estão no agente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Primeira mensagem</p>
            <Textarea
              rows={3}
              value={cfg.mensagem_abertura}
              onChange={(e) => set({ mensagem_abertura: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Use {"{nome}"} para o nome do perfil do WhatsApp.
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Cidades do plano de expansão (valem 2 pontos)</p>
            <Input
              value={cfg.cidades_plano}
              onChange={(e) => set({ cidades_plano: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Instruções extras</p>
            <Textarea
              rows={4}
              value={cfg.instrucoes}
              onChange={(e) => set({ instrucoes: e.target.value })}
              placeholder="Ex.: chame o lead pelo primeiro nome; se perguntar de financiamento, cite o BNDES..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Base de conhecimento</CardTitle>
          <CardDescription>
            É a única fonte de números que a IA pode usar. Faturamento e retorno ficam de fora: só
            na reunião e na COF.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            rows={12}
            value={cfg.base_conhecimento}
            onChange={(e) => set({ base_conhecimento: e.target.value })}
          />
          {!cfg.base_conhecimento.trim() && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => set({ base_conhecimento: BASE_SUGERIDA })}
            >
              Preencher com os dados da COF
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Time (fase 2)</CardTitle>
          <CardDescription>
            Usado nos alertas de lead A/B e no agendamento automático, que chegam na próxima fase.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">WhatsApp do SDR humano</p>
            <Input
              value={cfg.sdr_whatsapp ?? ""}
              onChange={(e) => set({ sdr_whatsapp: e.target.value || null })}
              placeholder="5595999999999"
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">E-mail Google do closer</p>
            <Input
              value={cfg.closer_email ?? ""}
              onChange={(e) => set({ closer_email: e.target.value || null })}
              placeholder="consultor@gmail.com"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conexão com a Meta</CardTitle>
          <CardDescription>
            No app Lavoura Social Selling → WhatsApp → Configuração, cole este endereço como URL de
            callback e assine o campo "messages".
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input readOnly value={WEBHOOK_URL} />
          <Button
            variant="outline"
            size="icon"
            aria-label="Copiar"
            onClick={() => {
              navigator.clipboard.writeText(WEBHOOK_URL);
              toast.success("Copiado");
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 flex justify-end bg-background/80 py-3 backdrop-blur">
        <Button onClick={save} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-1 h-4 w-4" />
          )}
          Salvar
        </Button>
      </div>
    </div>
  );
}
