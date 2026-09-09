import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Monitor,
  Coffee,
  ScanFace,
  Headphones,
  LifeBuoy,
  DollarSign,
  BookOpen,
  PlayCircle,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/app/central")({
  head: () => ({ meta: [{ title: "Central de Suporte — Sistema Lavoura" }] }),
  component: Central,
});

const operationSystems = [
  {
    title: "Totem de Pagamento",
    description: "Gerencie pagamentos e ciclos das máquinas.",
    href: "https://lavoura.maxpan.com.br/",
    icon: Monitor,
  },
  {
    title: "Máquina de Café",
    description: "Controle e monitoramento do café.",
    href: "https://app.macpay.com.br/login",
    icon: Coffee,
  },
  {
    title: "Geladeira / Face ID",
    description: "Reconhecimento facial, controle de acesso e consumo da geladeira inteligente.",
    href: "https://touchpay.market/#/dashboard",
    icon: ScanFace,
  },
  {
    title: "Gestão Financeira",
    description: "Controle financeiro completo da sua franquia (aba Financeiro, aqui no sistema).",
    href: "/app/financeiro",
    icon: DollarSign,
  },
];

const trainingItems = [
  {
    title: "Manual de Operação",
    description: "Passo a passo completo para a operação diária da sua unidade.",
    href: "/manual-operacoes-lavoura.pdf",
    icon: BookOpen,
  },
];

type EtapaVideo = { numero: number; nome: string; video_url: string | null };

const supportItems = [
  {
    title: "Suporte Totem",
    description: "Problemas com pagamento ou máquinas.",
    icon: Headphones,
    links: [{ label: "Abrir WhatsApp", href: "https://wa.me/554896309300" }],
  },
  {
    title: "Suporte Face ID",
    description: "Problemas com liberação de acesso e reconhecimento facial.",
    icon: ScanFace,
    links: [{ label: "Abrir WhatsApp", href: "https://wa.me/552139006600" }],
  },
  {
    title: "Suporte Franquia",
    description: "Máquinas, dosadoras e demais dúvidas operacionais.",
    icon: LifeBuoy,
    links: [
      { label: "Contato 1", href: "https://wa.me/5592991176452" },
      { label: "Contato 2", href: "https://wa.me/554791401427" },
    ],
  },
];

function SectionCard({
  title,
  description,
  icon: Icon,
  href,
}: {
  title: string;
  description: string;
  icon: typeof Monitor;
  href: string;
}) {
  const isFile = /\.[a-z0-9]+$/i.test(href);
  const isInternal = href.startsWith("/") && !isFile;
  const isComingSoon = href === "#";

  return (
    <Card className={isComingSoon ? "opacity-60" : "transition-shadow hover:shadow-md"}>
      <CardContent className="p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="mt-3 text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <div className="mt-3">
          {isComingSoon ? (
            <Badge variant="secondary" className="text-xs uppercase tracking-wide">
              Em breve
            </Badge>
          ) : isInternal ? (
            <a href={href} className="text-sm font-medium text-primary hover:underline">
              Acessar
            </a>
          ) : (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Acessar <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function VideosTreinamentoCard() {
  const [etapas, setEtapas] = useState<EtapaVideo[] | null>(null);

  useEffect(() => {
    supabase
      .from("jornada_etapas")
      .select("numero, nome, video_url")
      .order("numero")
      .then(({ data }) => setEtapas((data as EtapaVideo[]) ?? []));
  }, []);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <PlayCircle className="h-5 w-5" />
        </div>
        <h3 className="mt-3 text-base font-semibold text-foreground">Vídeos de Treinamento</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Um vídeo curto por etapa da jornada, sobre abertura, fechamento e manutenção das máquinas.
        </p>
        <div className="mt-3 space-y-1.5">
          {etapas === null ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            etapas.map((etapa) => (
              <div
                key={etapa.numero}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2"
              >
                <span className="text-sm">
                  Etapa {etapa.numero} — {etapa.nome}
                </span>
                {etapa.video_url ? (
                  <a
                    href={etapa.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Assistir <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <Badge variant="secondary" className="text-xs uppercase tracking-wide">
                    Em breve
                  </Badge>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Central() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Central de Suporte</h1>
        <p className="text-sm text-muted-foreground">
          Sistemas, treinamentos e contatos para o dia a dia da sua unidade.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Suporte
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {supportItems.map((item) => (
            <Card key={item.title}>
              <CardContent className="p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-base font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.links.map((link) => (
                    <Button
                      key={link.href}
                      asChild
                      size="sm"
                      // WhatsApp's own brand green — intentionally outside the design-token
                      // palette so the button reads as WhatsApp, not as a themed action.
                      className="bg-[#25D366] text-white hover:bg-[#1ebe5d]"
                    >
                      <a href={link.href} target="_blank" rel="noopener noreferrer">
                        {link.label}
                      </a>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Sistemas da operação
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {operationSystems.map((s) => (
            <SectionCard key={s.title} {...s} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Treinamentos
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trainingItems.map((s) => (
            <SectionCard key={s.title} {...s} />
          ))}
          <VideosTreinamentoCard />
        </div>
      </section>
    </div>
  );
}
