import { useState } from "react";
import { Check, ChevronDown, Menu, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useDashboard } from "@/lib/dashboard-store";
import { MONTHS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { SidebarNav } from "@/components/shell/Sidebar";
import { useDataLoader } from "@/lib/data-loader";

function formatMonth(m: string) {
  if (!m) return "—";
  const [y, mo] = m.split("-");
  const d = new Date(Number(y), Number(mo) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatAsOf(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TopNav() {
  const { date, setDate } = useDashboard();
  const [navOpen, setNavOpen] = useState(false);
  const { dataAsOf, source, status, load } = useDataLoader();
  const refreshing = status === "loading";

  const handleRefresh = async () => {
    try {
      await load();
      toast.success("Data refreshed from source");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Couldn't refresh from source", { description: msg });
    }
  };

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

      {/* Data as of badge + refresh */}
      <div
        className="hidden sm:flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/60 border border-white/20 px-2 py-1.5 rounded-sm"
        title={`Snapshot generated ${formatAsOf(dataAsOf)} • source: ${source}`}
      >
        <span>Data as of</span>
        <span className="text-white font-medium normal-case tracking-normal">
          {formatAsOf(dataAsOf)}
        </span>
        {source === "live" && (
          <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-positive" />
        )}
      </div>
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        title="Refresh from source (Google Sheets)"
        className="inline-flex items-center justify-center h-8 w-8 rounded-sm border border-white/20 hover:bg-white/10 disabled:opacity-50"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
      </button>

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

    </header>
  );
}