import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  MessageCircle,
  MousePointerClick,
  Timer,
  UserPlus,
  ArrowRight,
  Instagram,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { sdb, createWorkflow } from "@/lib/social/api";
import { BUILTIN_TEMPLATES } from "@/lib/social/templates";

export const Route = createFileRoute("/admin/social/")({
  component: Geral,
});

type Period = "day" | "week" | "month";
type Dash = {
  auto_replies: number;
  link_clicks: number;
  new_contacts: number;
  minutes_saved: number;
  by_kind: Record<string, number>;
  by_day: { day: string; total: number }[];
  sentiment: Record<string, number>;
};

const PERIOD_DAYS: Record<Period, number> = { day: 1, week: 7, month: 30 };
const KIND_LABEL: Record<string, string> = {
  dm: "Mensagens diretas",
  comment: "Comentários",
  live_comment: "Comentários em lives",
  story_reply: "Respostas a stories",
  story_mention: "Menções em stories",
};

function fmtMinutes(m: number) {
  if (m < 60) return `${m}min`;
  return `${Math.floor(m / 60)}h${String(Math.round(m % 60)).padStart(2, "0")}`;
}

function Geral() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("week");
  const [dash, setDash] = useState<Dash | null>(null);
  const [channel, setChannel] = useState<{ username: string | null } | null | undefined>(undefined);
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    sdb
      .from("ss_channels")
      .select("username")
      .eq("status", "connected")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setChannel(data ?? null));
    sdb
      .from("ss_workflows")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .then(({ count }) => setActiveCount(count ?? 0));
  }, []);

  useEffect(() => {
    setDash(null);
    const to = new Date();
    const from = new Date(to.getTime() - PERIOD_DAYS[period] * 86_400_000);
    sdb
      .rpc("ss_dashboard", { _from: from.toISOString(), _to: to.toISOString() })
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setDash(
          (data as Dash) ?? {
            auto_replies: 0,
            link_clicks: 0,
            new_contacts: 0,
            minutes_saved: 0,
            by_kind: {},
            by_day: [],
            sentiment: {},
          },
        );
      });
  }, [period]);

  const startFrom = async (slug: string) => {
    const t = BUILTIN_TEMPLATES.find((x) => x.slug === slug)!;
    try {
      const id = await createWorkflow(t.name, t.graph());
      navigate({ to: "/admin/social/automacoes/$id", params: { id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar automação");
    }
  };

  const totalInteractions = Object.values(dash?.by_kind ?? {}).reduce((a, b) => a + b, 0);
  const sentimentTotal = Object.values(dash?.sentiment ?? {}).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-primary">Social Selling</h1>
          <p className="text-sm text-muted-foreground">
            {channel === undefined
              ? " "
              : channel
                ? `Conectado como @${channel.username}`
                : "Instagram ainda não conectado"}
            {channel
              ? ` · ${activeCount} automaç${activeCount === 1 ? "ão ativa" : "ões ativas"}`
              : ""}
          </p>
        </div>
        <div className="inline-flex rounded-full bg-muted p-1 text-sm">
          {(["day", "week", "month"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-full px-3 py-1 font-medium ${period === p ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
            >
              {p === "day" ? "Dia" : p === "week" ? "Semana" : "Mês"}
            </button>
          ))}
        </div>
      </div>

      {channel === null && (
        <Card className="border-accent/40 bg-accent/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="flex items-center gap-3">
              <Instagram className="h-6 w-6 text-accent" />
              <div>
                <p className="font-semibold">Conecte o Instagram da Lavoura para começar</p>
                <p className="text-sm text-muted-foreground">
                  Sem isso as automações não recebem comentários nem mensagens.
                </p>
              </div>
            </div>
            <Button asChild>
              <Link to="/admin/social/config">Conectar agora</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            icon: MessageCircle,
            label: "Mensagens enviadas por automações",
            value: dash?.auto_replies,
          },
          {
            icon: MousePointerClick,
            label: "Cliques em links das automações",
            value: dash?.link_clicks,
          },
          {
            icon: Timer,
            label: "Tempo economizado",
            value: dash ? fmtMinutes(dash.minutes_saved) : undefined,
          },
          { icon: UserPlus, label: "Novos contatos capturados", value: dash?.new_contacts },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <Icon className="mb-3 h-5 w-5 text-accent" />
              {value === undefined ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-extrabold text-primary">{value}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary">
            Escolha um objetivo e comece em minutos
          </h2>
          <Link
            to="/admin/social/templates"
            className="text-sm font-medium text-accent hover:underline"
          >
            Todos os templates
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BUILTIN_TEMPLATES.slice(0, 6).map((t) => (
            <button
              key={t.slug}
              onClick={() => startFrom(t.slug)}
              className="group rounded-xl border bg-card p-4 text-left shadow-[var(--shadow-card)] transition hover:border-accent"
            >
              <p className="font-semibold text-primary">{t.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t.goal}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent">
                Usar <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Interações por dia · total {totalInteractions}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {dash && dash.by_day.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dash.by_day.map((d) => ({
                    ...d,
                    label: d.day.slice(8, 10) + "/" + d.day.slice(5, 7),
                  }))}
                >
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    width={28}
                  />
                  <Tooltip cursor={{ fill: "var(--muted)" }} />
                  <Bar
                    dataKey="total"
                    name="Interações"
                    fill="var(--chart-1)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {dash ? (
                  "Ainda sem interações neste período."
                ) : (
                  <Skeleton className="h-full w-full" />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Interações recebidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {Object.entries(KIND_LABEL).map(([k, label]) => (
              <div key={k} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold">{dash?.by_kind?.[k] ?? 0}</span>
              </div>
            ))}
            <div className="pt-3">
              <p className="mb-2 text-sm font-semibold">Sentimento</p>
              {sentimentTotal ? (
                <>
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
                    {(["positivo", "neutro", "negativo"] as const).map((s) => (
                      <div
                        key={s}
                        style={{
                          width: `${((dash?.sentiment?.[s] ?? 0) / sentimentTotal) * 100}%`,
                          background:
                            s === "positivo"
                              ? "var(--success)"
                              : s === "neutro"
                                ? "var(--chart-4)"
                                : "var(--destructive)",
                        }}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>Positivo {dash?.sentiment?.positivo ?? 0}</span>
                    <span>Neutro {dash?.sentiment?.neutro ?? 0}</span>
                    <span>Negativo {dash?.sentiment?.negativo ?? 0}</span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  A IA classifica as interações a cada minuto.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
