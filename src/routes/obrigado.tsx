import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/obrigado")({
  head: () => ({ meta: [{ title: "Cadastro enviado — \n" }] }),
  component: ThanksPage,
});

function ThanksPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: "var(--gradient-accent)" }}>
          <CheckCircle2 className="h-8 w-8 text-accent-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Cadastro enviado com sucesso
        </h1>
        <p className="mt-2 text-muted-foreground">
          Recebemos seus dados. A equipe {"\n"} entrará em contato em breve.
        </p>
        <div className="mt-8 flex items-center justify-center gap-2 text-primary">
          <Sprout className="h-5 w-5" />
          <span className="font-semibold">{"\n"}</span>
        </div>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/">Novo cadastro</Link>
        </Button>
      </div>
    </div>
  );
}