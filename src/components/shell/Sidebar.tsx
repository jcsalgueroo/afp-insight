import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, PieChart, TrendingUp, Table2, DollarSign, Target, Globe, Sparkles, LineChart, Crosshair, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "System Summary", icon: LayoutDashboard },
  { to: "/afp", label: "AFP Deep Dive", icon: PieChart },
  { to: "/manager", label: "Manager Deep Dive", icon: Users },
  { to: "/flows", label: "Flows Intelligence", icon: TrendingUp },
  { to: "/performance", label: "Performance Analytics", icon: LineChart },
  { to: "/revenue", label: "Revenue & Fees Analytics", icon: DollarSign },
  { to: "/penetration", label: "Product Penetration", icon: Target },
  { to: "/ucits", label: "UCITS Snapshot", icon: Globe },
  { to: "/new-products", label: "New Products", icon: Sparkles },
  { to: "/targets", label: "Targets", icon: Crosshair },
  { to: "/securities", label: "Security Detail", icon: Table2 },
] as const;

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="py-4">
        {items.map((it) => {
          const active = path === it.to;
          return (
            <Link
              key={it.to}
              to={it.to}
              onClick={() => onNavigate?.()}
              className={cn(
                "flex items-center gap-3 px-5 py-2.5 text-sm border-l-2 transition-colors",
                active
                  ? "border-primary text-foreground font-semibold bg-white"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-white/60",
              )}
            >
              <it.icon className="h-4 w-4" />
              <span>{it.label}</span>
            </Link>
          );
        })}
      <div className="px-5 mt-8 text-[10px] uppercase tracking-wider text-muted-foreground">
        Institutional Distribution
      </div>
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:block w-56 shrink-0 bg-surface-alt border-r border-border min-h-[calc(100vh-3.5rem)]">
      <SidebarNav />
    </aside>
  );
}