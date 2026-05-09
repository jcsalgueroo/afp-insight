import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  ComposedChart,
  Line,
  Legend,
  AreaChart,
  Area,
  ReferenceLine,
  LabelList,
} from "recharts";
import {
  AFPS,
  brandColor,
  CHART_COLORS,
  formatBps,
  formatUSD,
  getAUMvsFee,
  getCategoryFlowBubbles,
  getNNBByManager,
  getScatter,
  getYtdByManagerSeries,
  managerColor,
  MANAGERS,
  type AFP,
  type Bucket,
  type Manager,
} from "@/lib/mock-data";
import { useDashboard } from "@/lib/dashboard-store";
import { AfpFilterPopover } from "@/components/widgets/AfpFilterPopover";
import { SegmentedToggle } from "@/components/widgets/SegmentedToggle";
import { cn } from "@/lib/utils";

const BUCKET_TOGGLE = [
  { value: "ETF" as Bucket, label: "ETF" },
  { value: "Mutual Fund" as Bucket, label: "MF" },
] as const;

const PERIOD_TOGGLE = [
  { value: "Month" as const, label: "Month" },
  { value: "YTD" as const, label: "YTD" },
] as const;

const tooltipStyle = { fontSize: 12, border: "1px solid #E5E5E5", borderRadius: 4 } as const;

function shortMonth(m: string) {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-US", { month: "short" });
}

function CardShell({
  title,
  subtitle,
  right,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-card border border-border rounded-md shadow-sm flex flex-col", className)}>
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border flex-wrap">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">{right}</div>
      </div>
      <div className="p-5 flex-1">{children}</div>
    </div>
  );
}

export function Flows() {
  const { date, blkOnly } = useDashboard();
  const afps: AFP[] = [];
  const filters = { date, afps, blkOnly };

  // Waterfall: stacked transparent base + delta
  const nnb = useMemo(() => {
    const raw = getNNBByManager(filters).sort((a, b) => b.NNB - a.NNB);
    let cumulative = 0;
    return raw.map((d) => {
      const start = d.NNB >= 0 ? cumulative : cumulative + d.NNB;
      const value = Math.abs(d.NNB);
      cumulative += d.NNB;
      return { Manager: d.Manager, base: start, value, raw: d.NNB };
    });
  }, [date, afps, blkOnly]);

  const scatter = useMemo(() => getScatter(filters), [date, afps, blkOnly]);
  const aumFee = useMemo(() => getAUMvsFee(filters), [date, afps, blkOnly]);

  // Group scatter by manager for legend
  const scatterByManager = MANAGERS.map((m) => ({
    manager: m,
    data: scatter.filter((s) => s.Manager === m),
  })).filter((s) => s.data.length > 0);

  // Moved-from-Scorecard state
  const [nnbBucket, setNnbBucket] = useState<Bucket>("ETF");
  const [nnbAfps, setNnbAfps] = useState<AFP[]>([]);
  const [nnbfBucket, setNnbfBucket] = useState<Bucket>("ETF");
  const [nnbfAfps, setNnbfAfps] = useState<AFP[]>([]);
  const [flowPeriod, setFlowPeriod] = useState<"Month" | "YTD">("Month");
  const [flowAfps, setFlowAfps] = useState<AFP[]>([]);

  const nnbSeries = useMemo(
    () => getYtdByManagerSeries({ date, afps: nnbAfps, blkOnly: false }, nnbBucket, "NNB"),
    [date, nnbAfps, nnbBucket],
  );
  const nnbfSeries = useMemo(
    () => getYtdByManagerSeries({ date, afps: nnbfAfps, blkOnly: false }, nnbfBucket, "NNBF"),
    [date, nnbfAfps, nnbfBucket],
  );
  const flowBubbles = useMemo(
    () => getCategoryFlowBubbles({ date, afps: [], blkOnly: false }, flowAfps, flowPeriod),
    [date, flowAfps, flowPeriod],
  );
  const flowChartData = useMemo(
    () =>
      flowBubbles.map((b) => ({
        x: b.etfNnb,
        y: b.mfNnb,
        z: b.iSharesShare == null ? 0 : Math.max(0.02, Math.abs(b.iSharesShare)) * 100,
        cat: b.category,
        share: b.iSharesShare,
      })),
    [flowBubbles],
  );
  void AFPS;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Flows Intelligence</h1>
        <p className="text-sm text-muted-foreground">Where money is moving and how it's priced.</p>
      </div>

      <div className="bg-card border border-border rounded-md shadow-sm">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold uppercase tracking-wide">NNB by Manager (Waterfall)</h2>
        </div>
        <div className="h-72 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={nnb}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="Manager" stroke="#999" fontSize={11} />
              <YAxis stroke="#999" fontSize={11} tickFormatter={(v) => formatUSD(v)} />
              <Tooltip
                cursor={{ fill: "#f5f5f5" }}
                formatter={(_v: number, _n: string, p: { payload?: { raw: number } }) =>
                  formatUSD(p.payload?.raw ?? 0)
                }
                contentStyle={{ fontSize: 12, border: "1px solid #E5E5E5", borderRadius: 4 }}
              />
              <Bar dataKey="base" stackId="a" fill="transparent" />
              <Bar dataKey="value" stackId="a">
                {nnb.map((d, i) => (
                  <Cell
                    key={i}
                    fill={
                      d.Manager === "BlackRock"
                        ? CHART_COLORS.blk
                        : d.raw >= 0
                          ? CHART_COLORS.positive
                          : CHART_COLORS.negative
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-md shadow-sm">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold uppercase tracking-wide">Performance vs Flows</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Bubble size = AUM</p>
          </div>
          <div className="h-80 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} />
                <XAxis
                  type="number"
                  dataKey="Perf"
                  name="YTD %"
                  stroke="#999"
                  fontSize={11}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  type="number"
                  dataKey="NNB"
                  name="NNB"
                  stroke="#999"
                  fontSize={11}
                  tickFormatter={(v) => formatUSD(v)}
                />
                <ZAxis type="number" dataKey="AUM" range={[40, 400]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{ fontSize: 12, border: "1px solid #E5E5E5", borderRadius: 4 }}
                  formatter={(v: number, n: string) =>
                    n === "Perf" ? `${v}%` : formatUSD(v)
                  }
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {scatterByManager.map((g) => (
                  <Scatter
                    key={g.manager}
                    name={g.manager}
                    data={g.data}
                    fill={managerColor(g.manager as Manager)}
                    fillOpacity={g.manager === "BlackRock" ? 0.85 : 0.6}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-md shadow-sm">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold uppercase tracking-wide">AUM vs Avg Fee by Manager</h2>
          </div>
          <div className="h-80 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={aumFee}>
                <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis dataKey="Manager" stroke="#999" fontSize={11} />
                <YAxis yAxisId="left" stroke="#999" fontSize={11} tickFormatter={(v) => formatUSD(v)} />
                <YAxis yAxisId="right" orientation="right" stroke="#999" fontSize={11} tickFormatter={(v) => `${v.toFixed(0)}`} />
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
    </div>
  );
}