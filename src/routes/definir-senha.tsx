// Tela que captura o link de convite (convidar-socio) e o de "esqueceu
// senha" (resetPasswordForEmail) — os dois redirecionam pra cá com uma
// sessão temporária de recovery. Sem esta tela, o Supabase processa o
// token e loga a pessoa, mas ela nunca é solicitada a criar uma senha —
// só sobra o Google como forma de entrar depois.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import lavouraLogo from "@/assets/lavoura-logo.png";

const ADMIN_EMAIL = "lavanderialavoura2025@gmail.com";

export const Route = createFileRoute("/definir-senha")({
  head: () => ({ meta: [{ title: "Definir senha — Lavoura" }] }),
  component: DefinirSenhaPage,
});

function DefinirSenhaPage() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmar) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    toast.success("Senha definida! Você já pode entrar com e-mail e senha da próxima vez.");

    if (user?.email === ADMIN_EMAIL) {
      navigate({ to: "/admin" });
      return;
    }
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user?.id ?? "")
      .eq("role", "franqueado")
      .maybeSingle();

    setLoading(false);
    navigate({ to: role ? "/app" : "/" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <img src={lavouraLogo} alt="Lavoura" className="mx-auto mb-3 h-14 w-auto" />
          <CardTitle>Defina sua senha</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="senha">Nova senha</Label>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                minLength={6}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmar">Confirmar senha</Label>
              <Input
                id="confirmar"
                type="password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Salvando..." : "Salvar senha e entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
