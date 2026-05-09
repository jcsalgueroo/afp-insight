import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useDashboard } from "@/lib/dashboard-store";
import { MONTHS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function formatMonth(m: string) {
  const [y, mo] = m.split("-");
  const d = new Date(Number(y), Number(mo) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function TopNav() {
  const { date, setDate, blkOnly, setBlkOnly } = useDashboard();

  return (
    <header className="bg-nav text-nav-foreground h-14 flex items-center px-6 gap-6 border-b border-black">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 bg-primary" />
        <span className="font-semibold tracking-tight text-sm uppercase">
          AFP Portfolio Intelligence
        </span>
      </div>

      <div className="flex-1" />

      {/* Date selector */}
      <Popover>
        <PopoverTrigger className="flex items-center gap-2 text-xs uppercase tracking-wide border border-white/20 px-3 py-1.5 hover:bg-white/10 rounded-sm">
          <span className="text-white/60">As of</span>
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
        <span className="text-xs uppercase tracking-wide text-white/60">BlackRock Only</span>
        <Switch checked={blkOnly} onCheckedChange={setBlkOnly} />
      </div>
    </header>
  );
}