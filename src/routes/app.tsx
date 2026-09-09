import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Wallet, LifeBuoy, HardHat, TrendingUp, LogOut, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import lavouraLogo from "@/assets/lavoura-logo.png";
import { useFranqueado, FranqueadoProvider } from "@/hooks/use-franqueado";
import { useSocioAppState } from "@/hooks/use-socio-app-state";
import { GuidedTour } from "@/components/onboarding/GuidedTour";
import { ONBOARDING_TOUR_STEPS } from "@/lib/onboarding-tour";
import { ChatWidget } from "@/components/support-chat/ChatWidget";

const NAV_TOUR_TARGET: Record<string, string> = {
  "/app": "nav-unidade",
  "/app/financeiro": "nav-financeiro",
  "/app/central": "nav-central",
  "/app/obra": "nav-obra",
  "/app/progresso": "nav-progresso",
  "/app/marketing": "nav-marketing",
};

export const Route = createFileRoute("/app")({
  head: () => ({ meta: [{ title: "Sistema Lavoura" }] }),
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "ready" | "denied">("checking");

  useEffect(() => {
    const check = async (
      session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"],
    ) => {
      if (!session) {
        setStatus("denied");
        navigate({ to: "/" });
        return;
      }
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "franqueado")
        .maybeSingle();

      if (error || !data) {
        setStatus("denied");
        navigate({ to: "/" });
        return;
      }
      setStatus("ready");
    };

    // onAuthStateChange já dispara imediatamente com a sessão atual
    // (evento INITIAL_SESSION) — chamar getSession() de novo aqui disparava
    // a checagem de user_roles duas vezes a cada carregamento de página.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      check(session);
    });

    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <FranqueadoProvider>
      <AppLayoutContent />
    </FranqueadoProvider>
  );
}

function AppLayoutContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const { socio } = useFranqueado();
  const { loading: appStateLoading, tourCompleto, markTourCompleto } = useSocioAppState(
    socio?.id ?? null,
  );

  const navItem = (to: string, label: string, Icon: typeof Building2) => {
    const active = location.pathname === to;
    return (
      <Link
        to={to}
        data-tour={NAV_TOUR_TARGET[to]}
        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        }`}
      >
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 flex-col bg-sidebar p-4 md:flex">
        <div className="mb-8 px-2">
          <img src={lavouraLogo} alt="Lavoura" className="h-12 w-auto brightness-0 invert" />
        </div>
        <nav className="flex-1 space-y-1">
          {navItem("/app", "Minha Unidade", Building2)}
          {navItem("/app/financeiro", "Financeiro", Wallet)}
          {navItem("/app/central", "Central de Suporte", LifeBuoy)}
          {navItem("/app/obra", "Obra", HardHat)}
          {navItem("/app/progresso", "Progresso", TrendingUp)}
          {navItem("/app/marketing", "Marketing", Megaphone)}
        </nav>
        <Button
          variant="ghost"
          onClick={logout}
          className="justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        >
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </Button>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
          <img src={lavouraLogo} alt="Lavoura" className="h-9 w-auto" />
          <Button variant="ghost" size="sm" onClick={logout} aria-label="Sair">
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        <nav className="flex gap-2 overflow-x-auto border-b border-border bg-card px-4 py-2 md:hidden">
          <Link
            to="/app"
            data-tour="nav-unidade"
            className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm hover:bg-muted"
          >
            Minha Unidade
          </Link>
          <Link
            to="/app/financeiro"
            data-tour="nav-financeiro"
            className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm hover:bg-muted"
          >
            Financeiro
          </Link>
          <Link
            to="/app/central"
            data-tour="nav-central"
            className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm hover:bg-muted"
          >
            Central
          </Link>
          <Link
            to="/app/obra"
            data-tour="nav-obra"
            className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm hover:bg-muted"
          >
            Obra
          </Link>
          <Link
            to="/app/progresso"
            data-tour="nav-progresso"
            className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm hover:bg-muted"
          >
            Progresso
          </Link>
          <Link
            to="/app/marketing"
            data-tour="nav-marketing"
            className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm hover:bg-muted"
          >
            Marketing
          </Link>
        </nav>
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      {!appStateLoading && socio && !tourCompleto && (
        <GuidedTour steps={ONBOARDING_TOUR_STEPS} onFinish={markTourCompleto} />
      )}

      {socio && <ChatWidget />}
    </div>
  );
}
