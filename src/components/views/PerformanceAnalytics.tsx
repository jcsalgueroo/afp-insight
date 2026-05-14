import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
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
  LabelList,
} from "recharts";
import {
  AFPS,
  CATEGORIES,
  CHART_COLORS,
  PORTFOLIO_TYPES,
  afpColor,
  getAssetClassWeightVsPerf,
  getCategoryAfpBubbles,
  getCategoryDispersion,
  getCumulativePerformanceSeries,
  type AFP,
  type Category,
  type PortfolioType,
} from "@/lib/mock-data";
import { useDashboard } from "@/lib/dashboard-store";
import { MultiSelectPopover } from "@/components/widgets/MultiSelectPopover";
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

const tooltipStyle = { fontSize: 12, border: "1px solid #E5E5E5", borderRadius: 4 } as const;

function shortMonth(m: string) {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
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

  // 1) Cumulative performance line
  const [portfolios, setPortfolios] = useState<PortfolioType[]>([]);
  const cumData = useMemo(
    () => getCumulativePerformanceSeries(portfolios, date),
    [portfolios, date],
  );
  const cumSeries: ("System" | AFP)[] = ["System", ...AFPS];

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
        data: [{ x: p.weight * 100, y: p.ytdPerf, group: p.group }],
      })),
    [acData],
  );

  // 4) Category dispersion vs system
  const [dispAc, setDispAc] = useState<AssetClass>("Equity");
  const [dispCat, setDispCat] = useState<Category>(CATEGORIES[0] ?? "");
  const disp = useMemo(
    () => getCategoryDispersion(date, dispAc, dispCat),
    [date, dispAc, dispCat],
  );
  const dispGrouped = useMemo(
    () =>
      disp.points.map((p) => ({
        name: p.group,
        data: [{ x: p.weight * 100, y: p.ytdPerf, group: p.group }],
      })),
    [disp],
  );

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Performance Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Portfolio performance, positioning and cross-sectional dispersion across AFPs.
        </p>
      </div>

      {/* 1) Cumulative line */}
      <CardShell
        title="Cumulative Portfolio Performance"
        subtitle={`Indexed to 100 at Dec 2025 · AUM-weighted monthly performance`}
        right={
          <MultiSelectPopover
            label="Portfolios"
            options={PORTFOLIO_TYPES}
            value={portfolios}
            onChange={setPortfolios}
          />
        }
      >
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cumData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis
                dataKey="month"
                stroke="#999"
                fontSize={11}
                tickFormatter={shortMonth}
              />
              <YAxis
                stroke="#999"
                fontSize={11}
                width={50}
                domain={["auto", "auto"]}
                tickFormatter={(v) => v.toFixed(1)}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(l) => shortMonth(String(l))}
                formatter={(v: number, n: string) => [v.toFixed(2), n]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {cumSeries.map((s) => (
                <Line
                  key={s}
                  type="monotone"
                  dataKey={s}
                  stroke={afpColor(s)}
                  strokeWidth={s === "System" ? 2.5 : 1.6}
                  strokeDasharray={s === "System" ? "0" : "0"}
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
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(v: number, n: string) => {
                    if (n === "Weight") return [`${v.toFixed(2)}%`, "Weight"];
                    if (n === "YTD Perf") return [`${v.toFixed(2)}%`, "YTD Perf"];
                    return [v, n];
                  }}
                  labelFormatter={(_, items) => {
                    const p = items?.[0]?.payload as { cat?: string; group?: string };
                    return p ? `${p.group} · ${p.cat}` : "";
                  }}
                />
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
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(v: number, n: string) => [`${v.toFixed(2)}%`, n]}
                  labelFormatter={(_, items) => {
                    const p = items?.[0]?.payload as { group?: string };
                    return p?.group ?? "";
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {acGrouped.map((g) => (
                  <Scatter
                    key={g.name}
                    name={g.name}
                    data={g.data}
                    fill={afpColor(g.name as AFP | "System")}
                    fillOpacity={g.name === "System" ? 0.9 : 0.7}
                  >
                    <LabelList
                      dataKey="group"
                      position="top"
                      style={{ fontSize: 10, fill: "#333" }}
                    />
                  </Scatter>
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
                {CATEGORIES.map((c) => (
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
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ strokeDasharray: "3 3" }}
                formatter={(v: number, n: string) => [`${v.toFixed(2)}%`, n]}
                labelFormatter={(_, items) => {
                  const p = items?.[0]?.payload as { group?: string };
                  return p?.group ?? "";
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {dispGrouped.map((g) => (
                <Scatter
                  key={g.name}
                  name={g.name}
                  data={g.data}
                  fill={afpColor(g.name as AFP | "System")}
                  fillOpacity={g.name === "System" ? 0.9 : 0.75}
                >
                  <LabelList
                    dataKey="group"
                    position="top"
                    style={{ fontSize: 10, fill: "#333" }}
                  />
                </Scatter>
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardShell>
    </div>
  );
}
