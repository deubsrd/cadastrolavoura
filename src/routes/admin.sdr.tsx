import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { MessagesSquare, Bot, KanbanSquare } from "lucide-react";

export const Route = createFileRoute("/admin/sdr")({
  head: () => ({ meta: [{ title: "SDR WhatsApp — Admin" }] }),
  component: SdrLayout,
});

const TABS = [
  { to: "/admin/sdr", label: "Conversas", icon: MessagesSquare, exact: true },
  { to: "/admin/sdr/pipeline", label: "Pipeline", icon: KanbanSquare },
  { to: "/admin/sdr/agente", label: "Agente", icon: Bot },
] as const;

function SdrLayout() {
  const { pathname } = useLocation();
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1" aria-label="SDR WhatsApp">
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
