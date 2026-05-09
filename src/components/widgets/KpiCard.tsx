import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { CHART_COLORS, formatPct } from "@/lib/mock-data";

interface Props {
  label: string;
  value: string;
  delta: number;
  trend: { m: string; v: number }[];
}

export function KpiCard({ label, value, delta, trend }: Props) {
  const positive = delta >= 0;
  return (
    <div className="bg-card border border-border rounded-md shadow-sm p-4 flex flex-col gap-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="text-2xl font-semibold tabular-nums leading-none">{value}</div>
        <div className="h-10 w-24 -mb-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={CHART_COLORS.blk}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div
        className={cn(
          "flex items-center gap-1 text-xs font-medium tabular-nums",
          positive ? "text-positive" : "text-negative",
        )}
      >
        {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
        {formatPct(Math.abs(delta), 2)}
        <span className="text-muted-foreground font-normal ml-1">vs last month</span>
      </div>
    </div>
  );
}