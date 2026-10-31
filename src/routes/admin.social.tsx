import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Sparkles,
  Workflow,
  MessageSquareQuote,
  LayoutTemplate,
  MessagesSquare,
  Inbox,
  Users,
  Trophy,
  Settings,
} from "lucide-react";

export const Route = createFileRoute("/admin/social")({
  head: () => ({ meta: [{ title: "Social Selling — Admin" }] }),
  component: SocialLayout,
});

const TABS = [
  { to: "/admin/social", label: "Geral", icon: LayoutDashboard, exact: true },
  { to: "/admin/social/assistente", label: "Assistente", icon: Sparkles },
  { to: "/admin/social/automacoes", label: "Automações", icon: Workflow },
  { to: "/admin/social/respostas", label: "Respostas", icon: MessageSquareQuote },
  { to: "/admin/social/templates", label: "Templates", icon: LayoutTemplate },
  { to: "/admin/social/chat", label: "Chat", icon: MessagesSquare },
  { to: "/admin/social/inbox", label: "Inbox", icon: Inbox },
  { to: "/admin/social/contatos", label: "Contatos", icon: Users },
  { to: "/admin/social/ranking", label: "Ranking", icon: Trophy },
  { to: "/admin/social/config", label: "Configurações", icon: Settings },
] as const;

function SocialLayout() {
  const { pathname } = useLocation();
  // O editor de automação usa a tela inteira, sem as abas
  const inEditor = /^\/admin\/social\/automacoes\/[^/]+/.test(pathname);
  if (inEditor) return <Outlet />;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1" aria-label="Social Selling">
        {TABS.map(({ to, label, icon: Icon, ...rest }) => {
          const active =
            "exact" in rest ? pathname === to || pathname === `${to}/` : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
