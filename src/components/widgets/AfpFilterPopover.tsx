import { Check, ChevronDown, Filter } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AFPS, type AFP } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface Props {
  value: AFP[];
  onChange: (next: AFP[]) => void;
  label?: string;
}

export function AfpFilterPopover({ value, onChange, label = "AFPs" }: Props) {
  const toggle = (a: AFP) =>
    onChange(value.includes(a) ? value.filter((x) => x !== a) : [...value, a]);
  return (
    <Popover>
      <PopoverTrigger className="flex items-center gap-1.5 text-xs uppercase tracking-wide border border-border px-2.5 py-1 hover:bg-muted rounded-sm">
        <Filter className="h-3 w-3" />
        <span className="text-muted-foreground">{label}:</span>
        <span className="font-medium text-foreground">
          {value.length === 0 ? "All" : `${value.length}`}
        </span>
        <ChevronDown className="h-3 w-3" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        <button
          onClick={() => onChange([])}
          className={cn(
            "w-full text-left px-2 py-1.5 text-xs hover:bg-muted rounded-sm flex items-center justify-between border-b border-border mb-1",
          )}
        >
          <span>All AFPs</span>
          {value.length === 0 && <Check className="h-3 w-3 text-primary" />}
        </button>
        {AFPS.map((a) => (
          <button
            key={a}
            onClick={() => toggle(a)}
            className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted rounded-sm flex items-center justify-between"
          >
            <span>{a}</span>
            {value.includes(a) && <Check className="h-3 w-3 text-primary" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}