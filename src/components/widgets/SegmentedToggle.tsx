import { cn } from "@/lib/utils";

interface Props<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "xs";
}

export function SegmentedToggle<T extends string>({ options, value, onChange, size = "sm" }: Props<T>) {
  return (
    <div className="inline-flex border border-border rounded-sm overflow-hidden text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "uppercase tracking-wide transition-colors",
            size === "xs" ? "px-2 py-1" : "px-3 py-1.5",
            value === o.value
              ? "bg-primary text-primary-foreground"
              : "bg-white text-foreground hover:bg-muted",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}