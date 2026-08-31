import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import type { TourStep } from "@/lib/onboarding-tour";

type Rect = { top: number; left: number; width: number; height: number };

function findVisibleTarget(dataTour: string): Rect | null {
  const candidates = document.querySelectorAll<HTMLElement>(`[data-tour="${dataTour}"]`);
  for (const el of candidates) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      return { top: r.top, left: r.left, width: r.width, height: r.height };
    }
  }
  return null;
}

const PAD = 8;

export function GuidedTour({
  steps,
  onFinish,
}: {
  steps: TourStep[];
  onFinish: () => void;
}) {
  // index -1 = tela de boas-vindas, sem elemento destacado
  const [index, setIndex] = useState(-1);
  const [rect, setRect] = useState<Rect | null>(null);

  const step = index >= 0 ? steps[index] : null;
  const isLast = index === steps.length - 1;

  useEffect(() => {
    if (!step) {
      setRect(null);
      return;
    }
    const measure = () => setRect(findVisibleTarget(step.target));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [step]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFinish();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onFinish]);

  const cardStyle = useMemo(() => {
    if (!rect) {
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" } as const;
    }
    const cardWidth = 320;
    const cardMaxHeight = 220;
    const spaceRight = window.innerWidth - (rect.left + rect.width);
    if (spaceRight > cardWidth + 32) {
      return {
        top: Math.max(16, Math.min(rect.top, window.innerHeight - cardMaxHeight)),
        left: rect.left + rect.width + 20,
      } as const;
    }
    return {
      top: Math.min(window.innerHeight - 220, rect.top + rect.height + 16),
      left: Math.max(16, Math.min(rect.left, window.innerWidth - cardWidth - 16)),
    } as const;
  }, [rect]);

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="fixed rounded-xl transition-all duration-300 ease-out"
        style={
          rect
            ? {
                top: rect.top - PAD,
                left: rect.left - PAD,
                width: rect.width + PAD * 2,
                height: rect.height + PAD * 2,
                boxShadow: "0 0 0 9999px rgba(15, 23, 20, 0.65)",
                pointerEvents: "none",
              }
            : { inset: 0, background: "rgba(15, 23, 20, 0.65)", pointerEvents: "none" }
        }
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={step ? step.title : "Bem-vindo ao Sistema Lavoura"}
        className="fixed z-[101] w-80 rounded-xl border border-border bg-card p-5 shadow-lg transition-all duration-300 ease-out"
        style={cardStyle}
      >
        <button
          type="button"
          onClick={onFinish}
          aria-label="Pular tour"
          title="Pular tour"
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {step ? (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              Passo {index + 1} de {steps.length}
            </p>
            <h3 className="mt-1.5 text-base font-semibold text-foreground">{step.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{step.description}</p>
          </>
        ) : (
          <>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-base font-semibold text-foreground">
              Bem-vindo ao Sistema Lavoura
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Vamos te mostrar rapidinho onde encontrar cada coisa por aqui. Leva menos de um
              minuto.
            </p>
          </>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={onFinish} className="text-muted-foreground">
            Pular
          </Button>
          <div className="flex gap-2">
            {index >= 0 && (
              <Button variant="outline" size="sm" onClick={() => setIndex((i) => i - 1)}>
                Voltar
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => (isLast ? onFinish() : setIndex((i) => i + 1))}
            >
              {step === null ? "Começar tour" : isLast ? "Concluir" : "Próximo"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
