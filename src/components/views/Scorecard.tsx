import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";
import { KpiCard } from "@/components/widgets/KpiCard";
import { useDashboard } from "@/lib/dashboard-store";
import {
  CHART_COLORS,
  formatUSD,
  getKPIs,
  getMarketShare,
  managerColor,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Metric = "AUM_USD" | "NNB_USD" | "RRR_USD";

export function Scorecard() {
  const { date, afps, blkOnly } = useDashboard();
  const filters = { date, afps, blkOnly };
  const k = getKPIs(filters);
  const [metric, setMetric] = useState<Metric>("AUM_USD");
  const ms = getMarketShare(filters, metric);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Executive Scorecard</h1>
        <p className="text-sm text-muted-foreground">BlackRock institutional position across AFP market.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="BLK RRR (Monthly)" value={formatUSD(k.rrr)} delta={k.rrrDelta} trend={k.trendRRR} />
        <KpiCard label="Total BLK AUM" value={formatUSD(k.aum)} delta={k.aumDelta} trend={k.trendAUM} />
        <KpiCard label="BLK YTD NNB" value={formatUSD(k.nnb)} delta={k.nnbDelta} trend={k.trendNNB} />
        <KpiCard label="BLK YTD NNBF" value={formatUSD(k.nnbf)} delta={k.nnbfDelta} trend={k.trendNNB} />
      </div>

      <div className="bg-card border border-border rounded-md shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide">Market Share — Top 5 Managers</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Share by selected metric across the AFP universe</p>
          </div>
          <div className="inline-flex border border-border rounded-sm overflow-hidden text-xs">
            {([
              ["AUM_USD", "AUM"],
              ["NNB_USD", "NNB"],
              ["RRR_USD", "RRR"],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setMetric(k)}
                className={cn(
                  "px-3 py-1.5 uppercase tracking-wide transition-colors",
                  metric === k ? "bg-primary text-primary-foreground" : "bg-white text-foreground hover:bg-muted",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={[ms.row]} stackOffset="expand" margin={{ left: 20, right: 20 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => `${Math.round(v * 100)}%`} stroke="#999" fontSize={11} />
              <YAxis type="category" dataKey="name" hide />
              <Tooltip
                formatter={(v: number, n) => [`${(v as number).toFixed(1)}%`, n]}
                contentStyle={{ fontSize: 12, border: "1px solid #E5E5E5", borderRadius: 4 }}
              />
              {ms.managers.map((m) => (
                <Bar key={m} dataKey={m} stackId="a" name={m}>
                  <Cell fill={managerColor(m)} />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap gap-4 px-5 pb-5 text-xs">
          {ms.managers.map((m) => (
            <div key={m} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm" style={{ background: managerColor(m) }} />
              <span className={m === "BlackRock" ? "font-semibold" : "text-muted-foreground"}>{m}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}