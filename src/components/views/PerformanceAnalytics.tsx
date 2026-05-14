import { useEffect, useMemo, useState } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
  LineChart,
  Line,
} from "recharts";
import {
  AFPS,
  CATEGORIES,
  CHART_COLORS,
  afpColor,
  categoryAssetClass,
  getAssetClassWeightVsPerf,
  getCategoryAfpBubbles,
  getCategoryDispersion,
  getCumulativePerformanceSeries,
  type AFP,
  type Category,
} from "@/lib/mock-data";
import { formatUSD } from "@/lib/mock-data";
import { useDashboard } from "@/lib/dashboard-store";
import { SegmentedToggle } from "@/components/widgets/SegmentedToggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const AC_TOGGLE = [
  { value: "Equity" as const, label: "Equity" },
  { value: "Fixed Income" as const, label: "Fixed Income" },
] as const;

type AssetClass = "Equity" | "Fixed Income";

type HoldingsPayload = {
  group?: string;
  cat?: string;
  weight?: number;
  ytd?: number;
  topHoldings?: { name: string; aum: number }[];
};

function HoldingsTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: HoldingsPayload }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-popover border border-border rounded-md shadow-md p-3 text-xs min-w-[220px]">
      <div className="font-semibold">{p.group}</div>
      {p.cat && <div className="text-muted-foreground">{p.cat}</div>}
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5">
        <span className="text-muted-foreground">Weight</span>
        <span className="text-right tabular-nums">{p.weight != null ? `${p.weight.toFixed(2)}%` : "—"}</span>
        <span className="text-muted-foreground">YTD Perf</span>
        <span className="text-right tabular-nums">{p.ytd != null ? `${p.ytd.toFixed(2)}%` : "—"}</span>
      </div>
      {p.topHoldings && p.topHoldings.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Top 5 by AUM</div>
          <ul className="space-y-0.5">
            {p.topHoldings.map((h, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="truncate max-w-[160px]">{h.name}</span>
                <span className="tabular-nums text-muted-foreground">{formatUSD(h.aum, { compact: true })}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SimpleTooltip({ active, payload, weightLabel = "Weight" }: { active?: boolean; payload?: Array<{ payload: HoldingsPayload }>; weightLabel?: string }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-popover border border-border rounded-md shadow-md p-3 text-xs min-w-[180px]">
      <div className="font-semibold">{p.group}</div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5">
        <span className="text-muted-foreground">{weightLabel}</span>
        <span className="text-right tabular-nums">{p.weight != null ? `${p.weight.toFixed(2)}%` : "—"}</span>
        <span className="text-muted-foreground">YTD Perf</span>
        <span className="text-right tabular-nums">{p.ytd != null ? `${p.ytd.toFixed(2)}%` : "—"}</span>
      </div>
    </div>
  );
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
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-border flex-wrap">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">{right}</div>
      </div>
      <div className="p-3 sm:p-5 flex-1">{children}</div>
    </div>
  );
}

export function PerformanceAnalytics() {
  const { date } = useDashboard();

  // 1) Cumulative performance line chart (Dec 2025 = 100 → latest)
  const cumSeries = useMemo(() => getCumulativePerformanceSeries(), []);
  const cumLines: ("System" | AFP)[] = ["System", ...AFPS];

  // 2) Category × AFP scatter
  const [catAc, setCatAc] = useState<AssetClass>("Equity");
  const [catAfp, setCatAfp] = useState<"All" | AFP>("All");
  const catBubbles = useMemo(() => getCategoryAfpBubbles(date, catAc), [date, catAc]);
  const catGrouped = useMemo(() => {
    const groups: ("System" | AFP)[] = ["System", ...AFPS];
    return groups
      .filter((g) => g === "System" || catAfp === "All" || g === catAfp)
      .map((g) => ({
        name: g,
        data: catBubbles
          .filter((b) => b.group === g)
          .map((b) => ({
            x: b.weight * 100,
            y: b.ytdPerf,
            z: Math.max(b.aum, 1),
            cat: b.category,
            group: b.group,
            weight: b.weight * 100,
            ytd: b.ytdPerf,
            topHoldings: b.topHoldings,
          })),
      }));
  }, [catBubbles, catAfp]);

  // 3) Asset-class scatter
  const [acAc, setAcAc] = useState<AssetClass>("Equity");
  const acData = useMemo(() => getAssetClassWeightVsPerf(date, acAc), [date, acAc]);
  const acGrouped = useMemo(
    () =>
      acData.map((p) => ({
        name: p.group,
        data: [{ x: p.weight * 100, y: p.ytdPerf, group: p.group, weight: p.weight * 100, ytd: p.ytdPerf }],
      })),
    [acData],
  );

  // 4) Category dispersion vs system
  const [dispAc, setDispAc] = useState<AssetClass>("Equity");
  const dispCategories = useMemo(
    () => CATEGORIES.filter((c) => categoryAssetClass(c) === dispAc),
    [dispAc],
  );
  const [dispCat, setDispCat] = useState<Category>(dispCategories[0] ?? CATEGORIES[0] ?? "");
  useEffect(() => {
    if (!dispCategories.includes(dispCat) && dispCategories[0]) {
      setDispCat(dispCategories[0]);
    }
  }, [dispCategories, dispCat]);
  const disp = useMemo(
    () => getCategoryDispersion(date, dispAc, dispCat),
    [date, dispAc, dispCat],
  );
  const dispGrouped = useMemo(
    () =>
      disp.points.map((p) => ({
        name: p.group,
        data: [{
          x: p.weight * 100,
          y: p.ytdPerf,
          group: p.group,
          cat: dispCat,
          weight: p.weight * 100,
          ytd: p.ytdPerf,
          topHoldings: p.topHoldings,
        }],
      })),
    [disp, dispCat],
  );

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Performance Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Portfolio performance, positioning and cross-sectional dispersion across AFPs.
        </p>
      </div>

      {/* 1) Cumulative performance index */}
      <CardShell
        title="Cumulative Performance Index"
        subtitle="Base 100 at Dec 2025 · One line per AFP plus AUM-weighted System"
      >
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cumSeries} margin={{ top: 10, right: 16, left: 10, bottom: 16 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} />
              <XAxis dataKey="month" stroke="#999" fontSize={11} />
              <YAxis
                stroke="#999"
                fontSize={11}
                domain={["auto", "auto"]}
                tickFormatter={(v) => Number(v).toFixed(1)}
              />
              <Tooltip
                formatter={(v: number | string) =>
                  typeof v === "number" ? v.toFixed(2) : v
                }
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {cumLines.map((g) => (
                <Line
                  key={g}
                  type="monotone"
                  dataKey={g}
                  name={g}
                  stroke={afpColor(g)}
                  strokeWidth={g === "System" ? 2.5 : 1.75}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardShell>

      {/* 2 & 3 side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2) Category bubbles per AFP */}
        <CardShell
          title="Category Positioning by AFP"
          subtitle="X = portfolio weight (%) · Y = YTD Perf (%) · Bubble = Category"
          right={
            <>
              <SegmentedToggle options={AC_TOGGLE} value={catAc} onChange={setCatAc} />
              <Select
                value={catAfp}
                onValueChange={(v) => setCatAfp(v as "All" | AFP)}
              >
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue placeholder="AFP" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All AFPs</SelectItem>
                  {AFPS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          }
        >
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 16, left: 10, bottom: 16 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Weight"
                  stroke="#999"
                  fontSize={11}
                  tickFormatter={(v) => `${v.toFixed(1)}%`}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="YTD Perf"
                  stroke="#999"
                  fontSize={11}
                  tickFormatter={(v) => `${v.toFixed(1)}%`}
                />
                <ZAxis type="number" dataKey="z" range={[60, 600]} />
                <ReferenceLine y={0} stroke="#999" />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<HoldingsTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {catGrouped.map((g) => (
                  <Scatter
                    key={g.name}
                    name={g.name}
                    data={g.data}
                    fill={afpColor(g.name as AFP | "System")}
                    fillOpacity={g.name === "System" ? 0.85 : 0.6}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </CardShell>

        {/* 3) Asset-class scatter */}
        <CardShell
          title="Asset-Class Weight vs Performance"
          subtitle="One bubble per AFP + System · X = AC weight · Y = AC YTD Perf"
          right={<SegmentedToggle options={AC_TOGGLE} value={acAc} onChange={setAcAc} />}
        >
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 16, left: 10, bottom: 16 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Weight"
                  stroke="#999"
                  fontSize={11}
                  tickFormatter={(v) => `${v.toFixed(1)}%`}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="YTD Perf"
                  stroke="#999"
                  fontSize={11}
                  tickFormatter={(v) => `${v.toFixed(1)}%`}
                />
                <ZAxis range={[180, 180]} />
                <ReferenceLine y={0} stroke="#999" />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<SimpleTooltip weightLabel={`${acAc} weight`} />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {acGrouped.map((g) => (
                  <Scatter
                    key={g.name}
                    name={g.name}
                    data={g.data}
                    fill={afpColor(g.name as AFP | "System")}
                    fillOpacity={g.name === "System" ? 0.9 : 0.7}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </CardShell>
      </div>

      {/* 4) Category dispersion vs System */}
      <CardShell
        title="Category Dispersion vs System"
        subtitle="System reference lines mark systemwide weight & YTD perf for the selected category"
        right={
          <>
            <SegmentedToggle options={AC_TOGGLE} value={dispAc} onChange={setDispAc} />
            <Select value={dispCat} onValueChange={(v) => setDispCat(v as Category)}>
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {dispCategories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      >
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 16, left: 10, bottom: 16 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} />
              <XAxis
                type="number"
                dataKey="x"
                name="Weight"
                stroke="#999"
                fontSize={11}
                tickFormatter={(v) => `${v.toFixed(1)}%`}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="YTD Perf"
                stroke="#999"
                fontSize={11}
                tickFormatter={(v) => `${v.toFixed(1)}%`}
              />
              <ZAxis range={[180, 180]} />
              <ReferenceLine
                x={disp.systemWeight * 100}
                stroke={CHART_COLORS.blk}
                strokeDasharray="4 4"
                label={{ value: "System weight", fontSize: 10, fill: "#666", position: "top" }}
              />
              <ReferenceLine
                y={disp.systemYtd}
                stroke={CHART_COLORS.blk}
                strokeDasharray="4 4"
                label={{ value: "System YTD", fontSize: 10, fill: "#666", position: "right" }}
              />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<HoldingsTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {dispGrouped.map((g) => (
                <Scatter
                  key={g.name}
                  name={g.name}
                  data={g.data}
                  fill={afpColor(g.name as AFP | "System")}
                  fillOpacity={g.name === "System" ? 0.9 : 0.75}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardShell>
    </div>
  );
}
