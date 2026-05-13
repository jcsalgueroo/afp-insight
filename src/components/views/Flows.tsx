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
  Legend,
  AreaChart,
  Area,
  ReferenceLine,
  LabelList,
  PieChart as RPieChart,
  Pie,
} from "recharts";
import {
  brandColor,
  BUCKET_COLOR,
  CATEGORIES,
  categoryColor,
  CHART_COLORS,
  formatUSD,
  getCategoryFlowBubbles,
  getCumulativeNnbStacked,
  getMonthlyBucketFlows,
  getNnbByManager,
  getScatterFiltered,
  getTopBottomSecurities,
  getYtdByManagerSeries,
  managerColor,
  MANAGERS,
  type AFP,
  type Bucket,
  type Category,
  type Manager,
} from "@/lib/mock-data";
import { useDashboard } from "@/lib/dashboard-store";
import { AfpFilterPopover } from "@/components/widgets/AfpFilterPopover";
import { MultiSelectPopover } from "@/components/widgets/MultiSelectPopover";
import { SegmentedToggle } from "@/components/widgets/SegmentedToggle";
import { cn } from "@/lib/utils";

const BUCKET_TOGGLE = [
  { value: "ETF" as Bucket, label: "ETF" },
  { value: "Mutual Fund" as Bucket, label: "MF" },
  { value: "Money Market" as Bucket, label: "MM" },
] as const;

const PERIOD_TOGGLE = [
  { value: "Month" as const, label: "Month" },
  { value: "YTD" as const, label: "YTD" },
] as const;

const SORT_TOGGLE = [
  { value: "Manager" as const, label: "By Manager" },
  { value: "Category" as const, label: "By Category" },
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

export function Flows() {
  const { date } = useDashboard();

  // 1) Donut state
  const [donutBucket, setDonutBucket] = useState<Bucket>("ETF");
  const [donutPeriod, setDonutPeriod] = useState<"Month" | "YTD">("YTD");
  const [donutAfps, setDonutAfps] = useState<AFP[]>([]);
  const donutData = useMemo(
    () => getNnbDonut(donutAfps, donutBucket, donutPeriod, date),
    [donutAfps, donutBucket, donutPeriod, date],
  );
  const donutTotal = donutData.reduce((a, b) => a + b.NNB, 0);

  // 2) Cumulative stacked
  const [cumBucket, setCumBucket] = useState<Bucket>("ETF");
  const [cumPeriod, setCumPeriod] = useState<"Month" | "YTD">("YTD");
  const [cumSort, setCumSort] = useState<"Manager" | "Category">("Manager");
  const [cumAfps, setCumAfps] = useState<AFP[]>([]);
  const cum = useMemo(
    () => getCumulativeNnbStacked(cumAfps, cumBucket, cumPeriod, date, cumSort),
    [cumAfps, cumBucket, cumPeriod, date, cumSort],
  );

  // 3) Performance vs Flows
  const [perfPeriod, setPerfPeriod] = useState<"Month" | "YTD">("YTD");
  const [perfAfps, setPerfAfps] = useState<AFP[]>([]);
  const [perfManagers, setPerfManagers] = useState<Manager[]>([]);
  const [perfCats, setPerfCats] = useState<Category[]>([]);
  const scatter = useMemo(
    () => getScatterFiltered(perfAfps, perfManagers, perfCats, perfPeriod, date),
    [perfAfps, perfManagers, perfCats, perfPeriod, date],
  );
  const scatterByManager = MANAGERS.map((m) => ({
    manager: m,
    data: scatter.filter((s) => s.Manager === m),
  })).filter((s) => s.data.length > 0);

  // 4) Top/Bottom securities
  const [tbBucket, setTbBucket] = useState<Bucket>("ETF");
  const [tbPeriod, setTbPeriod] = useState<"Month" | "YTD">("YTD");
  const [tbAfps, setTbAfps] = useState<AFP[]>([]);
  const [tbManagers, setTbManagers] = useState<Manager[]>([]);
  const tb = useMemo(
    () => getTopBottomSecurities(tbAfps, tbManagers, tbBucket, tbPeriod, date),
    [tbAfps, tbManagers, tbBucket, tbPeriod, date],
  );

  // 5) Monthly bucket flows
  const [monthlyAfps, setMonthlyAfps] = useState<AFP[]>([]);
  const monthly = useMemo(() => getMonthlyBucketFlows(monthlyAfps), [monthlyAfps]);

  // 6) Existing kept charts
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

  const stackKeysCum = cum.stackKeys;
  const colorForStack = (k: string) =>
    cumSort === "Manager"
      ? categoryColor(k as Category)
      : managerColor(k as Manager);

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Flows Intelligence</h1>
        <p className="text-sm text-muted-foreground">Where money is moving and how it's priced.</p>
      </div>

      {/* 1) Donut */}
      <CardShell
        title="NNB by Manager"
        subtitle="Top 5 managers by NNB + Others"
        right={
          <>
            <SegmentedToggle options={BUCKET_TOGGLE} value={donutBucket} onChange={setDonutBucket} />
            <SegmentedToggle options={PERIOD_TOGGLE} value={donutPeriod} onChange={setDonutPeriod} />
            <AfpFilterPopover value={donutAfps} onChange={setDonutAfps} />
          </>
        }
      >
        <div className="h-80 relative">
          <ResponsiveContainer width="100%" height="100%">
            <RPieChart>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number, _n, p: { payload?: { Manager: string } }) => [
                  `${formatUSD(v)} (${donutTotal ? ((v / donutTotal) * 100).toFixed(1) : 0}%)`,
                  p?.payload?.Manager ?? "",
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Pie
                data={donutData}
                dataKey="NNB"
                nameKey="Manager"
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={1}
                isAnimationActive={false}
              >
                {donutData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={
                      d.Manager === "Others"
                        ? "#CCCCCC"
                        : managerColor(d.Manager as Manager)
                    }
                  />
                ))}
              </Pie>
            </RPieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Total NNB</span>
            <span className="text-lg font-semibold">{formatUSD(donutTotal)}</span>
          </div>
        </div>
      </CardShell>

      {/* 2) Cumulative NNB stacked */}
      <CardShell
        title="Cumulative NNB"
        subtitle={
          cumSort === "Manager"
            ? "Managers on X-axis, stacked by Category"
            : "Categories on X-axis, stacked by Manager"
        }
        right={
          <>
            <SegmentedToggle options={BUCKET_TOGGLE} value={cumBucket} onChange={setCumBucket} />
            <SegmentedToggle options={PERIOD_TOGGLE} value={cumPeriod} onChange={setCumPeriod} />
            <SegmentedToggle options={SORT_TOGGLE} value={cumSort} onChange={setCumSort} />
            <AfpFilterPopover value={cumAfps} onChange={setCumAfps} />
          </>
        }
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cum.data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="key" stroke="#999" fontSize={11} />
              <YAxis tickFormatter={(v) => formatUSD(v)} stroke="#999" fontSize={11} width={70} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number, n) => [formatUSD(v), n]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {stackKeysCum.map((k) => (
                <Bar key={k} dataKey={k} stackId="1" fill={colorForStack(k)} isAnimationActive={false} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardShell>

      {/* 3) Performance vs Flows */}
      <CardShell
        title="Performance vs Flows"
        subtitle="Bubble size = AUM"
        right={
          <>
            <SegmentedToggle options={PERIOD_TOGGLE} value={perfPeriod} onChange={setPerfPeriod} />
            <AfpFilterPopover value={perfAfps} onChange={setPerfAfps} />
            <MultiSelectPopover
              label="Managers"
              options={MANAGERS}
              value={perfManagers}
              onChange={setPerfManagers}
            />
            <MultiSelectPopover
              label="Categories"
              options={CATEGORIES}
              value={perfCats}
              onChange={setPerfCats}
            />
          </>
        }
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} />
              <XAxis
                type="number"
                dataKey="Perf"
                name={perfPeriod === "YTD" ? "YTD %" : "Month %"}
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
                contentStyle={tooltipStyle}
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
      </CardShell>

      {/* 4) Top/Bottom 5 securities */}
      <CardShell
        title="Top 5 / Bottom 5 Securities by Flows"
        subtitle={tbBucket === "ETF" ? "ETFs by Ticker" : "Mutual Funds by Name"}
        right={
          <>
            <SegmentedToggle options={BUCKET_TOGGLE} value={tbBucket} onChange={setTbBucket} />
            <SegmentedToggle options={PERIOD_TOGGLE} value={tbPeriod} onChange={setTbPeriod} />
            <AfpFilterPopover value={tbAfps} onChange={setTbAfps} />
            <MultiSelectPopover
              label="Managers"
              options={MANAGERS}
              value={tbManagers}
              onChange={setTbManagers}
            />
          </>
        }
      >
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={tb}
              layout="vertical"
              margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
            >
              <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => formatUSD(v)} stroke="#999" fontSize={11} />
              <YAxis
                type="category"
                dataKey="label"
                stroke="#999"
                fontSize={tbBucket === "ETF" ? 11 : 10}
                width={tbBucket === "ETF" ? 80 : 220}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => [formatUSD(v), "NNB"]}
              />
              <ReferenceLine x={0} stroke="#999" />
              <Bar dataKey="nnb" isAnimationActive={false}>
                {tb.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.nnb >= 0 ? CHART_COLORS.positive : CHART_COLORS.negative}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardShell>

      {/* 5) Monthly Flows by Bucket */}
      <CardShell
        title="Monthly Flows by Bucket"
        subtitle="NNB stacked by ETF / Mutual Fund / Money Market"
        right={<AfpFilterPopover value={monthlyAfps} onChange={setMonthlyAfps} />}
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="m" tickFormatter={shortMonth} stroke="#999" fontSize={11} />
              <YAxis tickFormatter={(v) => formatUSD(v)} stroke="#999" fontSize={11} width={70} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number, n) => [formatUSD(v), n]}
                labelFormatter={(l) => shortMonth(l as string)}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="ETF" stackId="1" fill={BUCKET_COLOR.ETF} isAnimationActive={false} />
              <Bar dataKey="Mutual Fund" stackId="1" fill={BUCKET_COLOR["Mutual Fund"]} isAnimationActive={false} />
              <Bar dataKey="Money Market" stackId="1" fill={BUCKET_COLOR["Money Market"]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardShell>

      {/* Kept charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CardShell
          title="YTD NNB by Manager"
          subtitle="Cumulative net new business, stacked by manager"
          right={
            <>
              <SegmentedToggle options={BUCKET_TOGGLE} value={nnbBucket} onChange={setNnbBucket} />
              <AfpFilterPopover value={nnbAfps} onChange={setNnbAfps} />
            </>
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={nnbSeries.data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis dataKey="m" tickFormatter={shortMonth} stroke="#999" fontSize={11} />
                <YAxis tickFormatter={(v) => formatUSD(v)} stroke="#999" fontSize={11} width={70} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, n) => [formatUSD(v), n]}
                  labelFormatter={(l) => shortMonth(l as string)}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {nnbSeries.brands.map((b) => (
                  <Area
                    key={b}
                    type="monotone"
                    dataKey={b}
                    stackId="1"
                    stroke={brandColor(b)}
                    fill={brandColor(b)}
                    fillOpacity={0.75}
                    isAnimationActive={false}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardShell>

        <CardShell
          title="YTD NNBF by Manager"
          subtitle="Cumulative new-flow fee revenue, stacked by manager"
          right={
            <>
              <SegmentedToggle options={BUCKET_TOGGLE} value={nnbfBucket} onChange={setNnbfBucket} />
              <AfpFilterPopover value={nnbfAfps} onChange={setNnbfAfps} />
            </>
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={nnbfSeries.data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis dataKey="m" tickFormatter={shortMonth} stroke="#999" fontSize={11} />
                <YAxis tickFormatter={(v) => formatUSD(v)} stroke="#999" fontSize={11} width={70} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, n) => [formatUSD(v), n]}
                  labelFormatter={(l) => shortMonth(l as string)}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {nnbfSeries.brands.map((b) => (
                  <Area
                    key={b}
                    type="monotone"
                    dataKey={b}
                    stackId="1"
                    stroke={brandColor(b)}
                    fill={brandColor(b)}
                    fillOpacity={0.75}
                    isAnimationActive={false}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardShell>
      </div>

      <CardShell
        title="Flows by Category — ETF vs Mutual Fund"
        subtitle="Bubble size = iShares share of ETF NNB within category"
        right={
          <>
            <SegmentedToggle options={PERIOD_TOGGLE} value={flowPeriod} onChange={setFlowPeriod} />
            <AfpFilterPopover value={flowAfps} onChange={setFlowAfps} />
          </>
        }
      >
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 16, right: 32, left: 16, bottom: 24 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} />
              <XAxis
                type="number"
                dataKey="x"
                name="ETF NNB"
                tickFormatter={(v: number) => formatUSD(v)}
                stroke="#999"
                fontSize={11}
                label={{ value: "ETF Flows (NNB)", position: "insideBottom", offset: -10, fontSize: 11, fill: "#666" }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="MF NNB"
                tickFormatter={(v: number) => formatUSD(v)}
                stroke="#999"
                fontSize={11}
                width={70}
                label={{ value: "Mutual Fund Flows (NNB)", angle: -90, position: "insideLeft", fontSize: 11, fill: "#666" }}
              />
              <ZAxis type="number" dataKey="z" range={[80, 900]} />
              <ReferenceLine x={0} stroke="#999" />
              <ReferenceLine y={0} stroke="#999" />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ strokeDasharray: "3 3" }}
                formatter={(v: number, n: string, p: { payload?: { share: number | null } }) => {
                  if (n === "ETF NNB") return [formatUSD(v), "ETF NNB"];
                  if (n === "MF NNB") return [formatUSD(v), "MF NNB"];
                  if (n === "z") {
                    const s = p?.payload?.share;
                    return [s == null ? "n/a" : `${(s * 100).toFixed(1)}%`, "iShares share of ETF NNB"];
                  }
                  return [v, n];
                }}
                labelFormatter={(_, items) => (items?.[0]?.payload as { cat?: string })?.cat ?? ""}
              />
              <Scatter
                name="Category"
                data={flowChartData}
                fill={CHART_COLORS.blk}
                fillOpacity={0.7}
                stroke={CHART_COLORS.blk}
                isAnimationActive={false}
              >
                <LabelList dataKey="cat" position="top" style={{ fontSize: 10, fill: "#333" }} />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardShell>
    </div>
  );
}