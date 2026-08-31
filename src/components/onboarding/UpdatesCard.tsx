import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Megaphone, X } from "lucide-react";
import type { SistemaUpdate } from "@/lib/sistema-updates";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

export function UpdatesCard({
  updates,
  onDismiss,
}: {
  updates: SistemaUpdate[];
  onDismiss: () => void;
}) {
  if (updates.length === 0) return null;

  return (
    <Card className="border-accent/30 bg-accent/5">
      <CardContent className="flex gap-4 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Megaphone className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              Novidades no Sistema Lavoura
            </h3>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dispensar novidades"
              title="Dispensar"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 space-y-3">
            {updates.map((u) => (
              <div key={u.id}>
                <p className="text-sm font-medium text-foreground">{u.titulo}</p>
                <p className="text-sm text-muted-foreground">{u.descricao}</p>
                <p className="mt-0.5 text-xs text-muted-foreground/70">{formatDate(u.publicadoEm)}</p>
              </div>
            ))}
          </div>
          <Button size="sm" variant="outline" className="mt-3" onClick={onDismiss}>
            Ok, entendi
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
