import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import lavouraLogo from "@/assets/lavoura-logo.png";

const ADMIN_EMAIL = "lavanderialavoura2025@gmail.com";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Acesso — Lavoura" }] }),
  component: LoginPage,
});

async function redirectByRole(
  navigate: ReturnType<typeof useNavigate>,
  userId: string,
  email: string | undefined,
) {
  if (email === ADMIN_EMAIL) {
    navigate({ to: "/admin" });
    return true;
  }

  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "franqueado")
    .maybeSingle();

  if (data) {
    navigate({ to: "/app" });
    return true;
  }

  return false;
}

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [loadingReset, setLoadingReset] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (user) redirectByRole(navigate, user.id, user.email);
    });
  }, [navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }

    const ok = data.user ? await redirectByRole(navigate, data.user.id, data.user.email) : false;
    setLoading(false);
    if (!ok) {
      await supabase.auth.signOut();
      toast.error("Acesso restrito. Fale com a franqueadora caso precise de acesso.");
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/admin`,
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
    }
  };

  const handleReset = async () => {
    if (!resetEmail.trim()) return toast.error("Informe o e-mail.");
    setLoadingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/app`,
    });
    setLoadingReset(false);
    if (error) return toast.error(error.message);
    toast.success("Link enviado! Verifique seu e-mail.");
    setShowReset(false);
    setResetEmail("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <img src={lavouraLogo} alt="Lavoura" className="mx-auto mb-3 h-14 w-auto" />
          <CardTitle>Acesso ao Sistema Lavoura</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailLogin} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setShowReset(true);
                  }}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  Esqueceu sua senha?
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              Entrar
            </Button>
          </form>
          <div className="relative text-center">
            <span className="bg-card relative z-10 px-2 text-xs text-muted-foreground">ou</span>
            <div className="absolute left-0 right-0 top-1/2 -z-0 border-t border-border" />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogle}
            disabled={loading}
          >
            Entrar com Google
          </Button>
          <div className="text-center text-sm">
            <Link to="/" className="text-muted-foreground hover:text-primary">
              Voltar ao cadastro
            </Link>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showReset} onOpenChange={setShowReset}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription>
              Informe seu e-mail e enviaremos um link para redefinir sua senha.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input
              type="email"
              placeholder="seu@email.com"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleReset(); }}
              autoFocus
            />
            <Button onClick={handleReset} className="w-full" disabled={loadingReset}>
              {loadingReset ? "Enviando..." : "Enviar link"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
