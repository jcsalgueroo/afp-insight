import { useState } from "react";
import { Check, ChevronDown, Menu } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useDashboard } from "@/lib/dashboard-store";
import { MONTHS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { SidebarNav } from "@/components/shell/Sidebar";

function formatMonth(m: string) {
  if (!m) return "—";
  const [y, mo] = m.split("-");
  const d = new Date(Number(y), Number(mo) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function TopNav() {
  const { date, setDate, blkOnly, setBlkOnly } = useDashboard();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <header className="bg-nav text-nav-foreground h-14 flex items-center px-3 sm:px-6 gap-3 sm:gap-6 border-b border-black">
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetTrigger asChild>
          <button
            aria-label="Open menu"
            className="md:hidden inline-flex items-center justify-center h-8 w-8 rounded-sm hover:bg-white/10"
          >
            <Menu className="h-5 w-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64 bg-surface-alt">
          <div className="h-14 flex items-center px-5 border-b border-border">
            <span className="font-semibold tracking-tight text-sm uppercase text-foreground">
              AFP Portfolio
            </span>
          </div>
          <SidebarNav onNavigate={() => setNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-2 min-w-0">
        <div className="h-6 w-6 bg-primary shrink-0" />
        <span className="font-semibold tracking-tight text-sm uppercase truncate">
          <span className="hidden sm:inline">AFP Portfolio Intelligence</span>
          <span className="sm:hidden">AFP</span>
        </span>
      </div>

      <div className="flex-1" />

      {/* Date selector */}
      <Popover>
        <PopoverTrigger className="flex items-center gap-2 text-xs uppercase tracking-wide border border-white/20 px-2 sm:px-3 py-1.5 hover:bg-white/10 rounded-sm whitespace-nowrap">
          <span className="text-white/60 hidden sm:inline">As of</span>
          <span className="font-medium">{formatMonth(date)}</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-44 p-1 max-h-72 overflow-auto">
          {[...MONTHS].reverse().map((m) => (
            <button
              key={m}
              onClick={() => setDate(m)}
              className={cn(
                "w-full text-left px-2 py-1.5 text-xs hover:bg-muted rounded-sm flex items-center justify-between",
                m === date && "bg-muted",
              )}
            >
              {formatMonth(m)}
              {m === date && <Check className="h-3 w-3 text-primary" />}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {/* BLK Only toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-white/60 whitespace-nowrap">
          <span className="hidden sm:inline">BlackRock Only</span>
          <span className="sm:hidden">BLK</span>
        </span>
        <Switch checked={blkOnly} onCheckedChange={setBlkOnly} />
      </div>
    </header>
  );
}