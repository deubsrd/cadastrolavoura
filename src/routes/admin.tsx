import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Building2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import lavouraLogo from "@/assets/lavoura-logo.png";

const ADMIN_EMAIL = "lavanderialavoura2025@gmail.com";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Painel administrativo — \n" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session || session.user.email !== ADMIN_EMAIL) {
        navigate({ to: "/login" });
      } else {
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session || data.session.user.email !== ADMIN_EMAIL) {
        navigate({ to: "/login" });
      } else {
        setReady(true);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  const navItem = (to: string, label: string, Icon: typeof Users) => {
    const active = location.pathname === to || (to === "/admin" && location.pathname === "/admin");
    return (
      <Link to={to}
        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
          active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        }`}>
        <Icon className="h-4 w-4" />{label}
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
          {navItem("/admin", "Franqueados", Users)}
          {navItem("/admin/unidades", "Unidades", Building2)}
        </nav>
        <Button variant="ghost" onClick={logout}
          className="justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground">
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </Button>
      </aside>

      {/* Mobile top bar */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
          <img src={lavouraLogo} alt="Lavoura" className="h-9 w-auto" />
          <Button variant="ghost" size="sm" onClick={logout}><LogOut className="h-4 w-4" /></Button>
        </header>
        <nav className="flex gap-2 overflow-x-auto border-b border-border bg-card px-4 py-2 md:hidden">
          <Link to="/admin" className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm hover:bg-muted">Franqueados</Link>
          <Link to="/admin/unidades" className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm hover:bg-muted">Unidades</Link>
        </nav>
        <main className="flex-1 overflow-auto p-4 sm:p-6"><Outlet /></main>
      </div>
    </div>
  );
}