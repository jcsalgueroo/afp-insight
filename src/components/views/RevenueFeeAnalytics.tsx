import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ComposedChart,
  Line,
  Legend,
} from "recharts";
import {
  CHART_COLORS,
  formatBps,
  formatUSD,
  getAUMvsFee,
  managerColor,
  type Manager,
} from "@/lib/mock-data";
import { useDashboard } from "@/lib/dashboard-store";

export function RevenueFeeAnalytics() {
  const { date, blkOnly } = useDashboard();
  const aumFee = useMemo(
    () => getAUMvsFee({ date, afps: [], blkOnly }),
    [date, blkOnly],
  );
  void BarChart;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Revenue &amp; Fee Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Fee economics and revenue dynamics across managers.
        </p>
      </div>

      <div className="bg-card border border-border rounded-md shadow-sm">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            AUM vs Avg Fee by Manager
          </h2>
        </div>
        <div className="h-80 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={aumFee}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="Manager" stroke="#999" fontSize={11} />
              <YAxis yAxisId="left" stroke="#999" fontSize={11} tickFormatter={(v) => formatUSD(v)} />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#999"
                fontSize={11}
                tickFormatter={(v) => `${v.toFixed(0)}`}
              />
              <Tooltip
                formatter={(v: number, n: string) =>
                  n === "Fee_bps" ? formatBps(v) : formatUSD(v)
                }
                contentStyle={{ fontSize: 12, border: "1px solid #E5E5E5", borderRadius: 4 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="AUM" name="AUM">
                {aumFee.map((d, i) => (
                  <Cell key={i} fill={managerColor(d.Manager as Manager)} />
                ))}
              </Bar>
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="Fee_bps"
                stroke={CHART_COLORS.blkAlt}
                strokeWidth={2}
                dot={{ r: 3, fill: CHART_COLORS.blkAlt }}
                name="Avg Fee (bps)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}