import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    </div>
  );
}
