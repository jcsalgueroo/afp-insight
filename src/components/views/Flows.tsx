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
  ReferenceLine,
  LabelList,
  ReferenceArea,
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

const PERF_BUCKET_TOGGLE = [
  { value: "ETF" as const, label: "ETF" },
  { value: "Mutual Fund" as const, label: "MF" },
] as const;

const PERIOD_TOGGLE = [
  { value: "Month" as const, label: "Month" },
  { value: "YTD" as const, label: "YTD" },
] as const;

type Quadrant = "All" | "NE" | "SE" | "SW" | "NW";
const QUADRANT_TOGGLE = [
  { value: "All" as const, label: "All" },
  { value: "NE" as const, label: "NE" },
  { value: "SE" as const, label: "SE" },
  { value: "SW" as const, label: "SW" },
  { value: "NW" as const, label: "NW" },
] as const;
const QUADRANT_LABELS: Record<Exclude<Quadrant, "All">, string> = {
  NE: "Performance Chasing",
  SE: "Profit Taking",
  SW: "Stopping Losses",
  NW: "High Conviction",
};

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

// ---------- Custom tooltips ----------

interface ScatterPayload {
  Manager: string;
  Ticker: string;
  Name: string;
  AUM: number;
  NNB: number;
  Perf: number;
  Bucket: "ETF" | "Mutual Fund";
}

function ScatterTooltip({
  active,
  payload,
  period,
}: {
  active?: boolean;
  payload?: Array<{ payload: ScatterPayload }>;
  period: "Month" | "YTD";
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const label = d.Bucket === "ETF" ? d.Ticker || "—" : d.Name;
  return (
    <div className="bg-popover border border-border rounded-md shadow-md p-2.5 text-xs space-y-0.5 min-w-[180px]">
      <div className="font-semibold">{d.Manager}</div>
      <div className="text-muted-foreground truncate">{label}</div>
      <div className="flex justify-between gap-4 pt-1">
        <span className="text-muted-foreground">AUM</span>
        <span className="tabular-nums">{formatUSD(d.AUM)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">NNB</span>
        <span className="tabular-nums">{formatUSD(d.NNB)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">{period} Perf</span>
        <span className="tabular-nums">{d.Perf.toFixed(2)}%</span>
      </div>
    </div>
  );
}

interface TbPayload {
  label: string;
  manager: string;
  nnb: number;
  afpBreakdown: { AFP: string; NNB: number }[];
}

function TopBottomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: TbPayload }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-popover border border-border rounded-md shadow-md p-2.5 text-xs space-y-1 min-w-[220px]">
      <div className="font-semibold">{d.manager}</div>
      <div className="text-muted-foreground">{d.label}</div>
      <div className="flex justify-between gap-4 pt-1 border-t border-border">
        <span className="text-muted-foreground">Total NNB</span>
        <span className="tabular-nums font-medium">{formatUSD(d.nnb)}</span>
      </div>
      <div className="pt-1 space-y-0.5">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">By AFP</div>
        {d.afpBreakdown.map((b) => (
          <div key={b.AFP} className="flex justify-between gap-4">
            <span>{b.AFP}</span>
            <span className="tabular-nums">{formatUSD(b.NNB)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Flows() {
  const { date } = useDashboard();

  // 1) NNB by Manager (bar)
  const [nnbmBucket, setNnbmBucket] = useState<Bucket>("ETF");
  const [nnbmPeriod, setNnbmPeriod] = useState<"Month" | "YTD">("YTD");
  const [nnbmAfps, setNnbmAfps] = useState<AFP[]>([]);
  const nnbmData = useMemo(
    () => getNnbByManager(nnbmAfps, nnbmBucket, nnbmPeriod, date),
    [nnbmAfps, nnbmBucket, nnbmPeriod, date],
  );
  const nnbmTotal = nnbmData.reduce((a, b) => a + b.NNB, 0);

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
  const [perfBucket, setPerfBucket] = useState<"ETF" | "Mutual Fund">("ETF");
  const [perfPeriod, setPerfPeriod] = useState<"Month" | "YTD">("YTD");
  const [perfAfps, setPerfAfps] = useState<AFP[]>([]);
  const [perfManagers, setPerfManagers] = useState<Manager[]>([]);
  const [perfCats, setPerfCats] = useState<Category[]>([]);
  const [perfQuadrant, setPerfQuadrant] = useState<Quadrant>("All");
  const scatter = useMemo(
    () => getScatterFiltered(perfAfps, perfManagers, perfCats, perfPeriod, date, perfBucket),
    [perfAfps, perfManagers, perfCats, perfPeriod, date, perfBucket],
  );
  const scatterFiltered = useMemo(() => {
    if (perfQuadrant === "All") return scatter;
    return scatter.filter((s) => {
      const x = s.Perf, y = s.NNB;
      if (perfQuadrant === "NE") return x >= 0 && y >= 0;
      if (perfQuadrant === "SE") return x >= 0 && y <= 0;
      if (perfQuadrant === "SW") return x <= 0 && y <= 0;
      return x <= 0 && y >= 0;
    });
  }, [scatter, perfQuadrant]);
  const scatterByManager = MANAGERS.map((m) => ({
    manager: m,
    data: scatterFiltered.filter((s) => s.Manager === m),
  })).filter((s) => s.data.length > 0);

  // 4) Flows by Category
  const [flowPeriod, setFlowPeriod] = useState<"Month" | "YTD">("Month");
  const [flowAfps, setFlowAfps] = useState<AFP[]>([]);
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

  // 5) Top/Bottom securities
  const [tbBucket, setTbBucket] = useState<Bucket>("ETF");
  const [tbPeriod, setTbPeriod] = useState<"Month" | "YTD">("YTD");
  const [tbAfps, setTbAfps] = useState<AFP[]>([]);
  const [tbManagers, setTbManagers] = useState<Manager[]>([]);
  const tb = useMemo(
    () => getTopBottomSecurities(tbAfps, tbManagers, tbBucket, tbPeriod, date),
    [tbAfps, tbManagers, tbBucket, tbPeriod, date],
  );

  // 6) Monthly bucket flows
  const [monthlyAfps, setMonthlyAfps] = useState<AFP[]>([]);
  const monthly = useMemo(() => getMonthlyBucketFlows(monthlyAfps), [monthlyAfps]);

  // 7) YTD NNB / NNBF by manager
  const [nnbBucket, setNnbBucket] = useState<Bucket>("ETF");
  const [nnbAfps, setNnbAfps] = useState<AFP[]>([]);
  const [nnbfBucket, setNnbfBucket] = useState<Bucket>("ETF");
  const [nnbfAfps, setNnbfAfps] = useState<AFP[]>([]);
  const nnbSeries = useMemo(
    () => getYtdByManagerSeries({ date, afps: nnbAfps, blkOnly: false }, nnbBucket, "NNB"),
    [date, nnbAfps, nnbBucket],
  );
  const nnbfSeries = useMemo(
    () => getYtdByManagerSeries({ date, afps: nnbfAfps, blkOnly: false }, nnbfBucket, "NNBF"),
    [date, nnbfAfps, nnbfBucket],
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

      {/* 1) NNB by Manager — Bar */}
      <CardShell
        title="NNB by Manager"
        subtitle={`Total: ${formatUSD(nnbmTotal)} · Sorted by NNB descending`}
        right={
          <>
            <SegmentedToggle options={BUCKET_TOGGLE} value={nnbmBucket} onChange={setNnbmBucket} />
            <SegmentedToggle options={PERIOD_TOGGLE} value={nnbmPeriod} onChange={setNnbmPeriod} />
            <AfpFilterPopover value={nnbmAfps} onChange={setNnbmAfps} />
          </>
        }
      >
        <div style={{ height: Math.max(220, nnbmData.length * 28 + 40) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={nnbmData}
              layout="vertical"
              margin={{ top: 8, right: 24, left: 16, bottom: 8 }}
            >
              <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => formatUSD(v)} stroke="#999" fontSize={11} />
              <YAxis type="category" dataKey="Manager" stroke="#999" fontSize={11} width={120} />
              <ReferenceLine x={0} stroke="#999" />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => [formatUSD(v), "NNB"]}
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
              />
              <Bar dataKey="NNB" isAnimationActive={false}>
                {nnbmData.map((d, i) => (
                  <Cell key={i} fill={managerColor(d.Manager as Manager)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
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
            <BarChart data={cum.data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} stackOffset="sign">
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="key" stroke="#999" fontSize={11} />
              <YAxis tickFormatter={(v) => formatUSD(v)} stroke="#999" fontSize={11} width={70} />
              <ReferenceLine y={0} stroke="#999" />
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
        subtitle="Bubble size = AUM · One bubble per security · Quadrants labeled by behavior"
        right={
          <>
            <SegmentedToggle options={PERF_BUCKET_TOGGLE} value={perfBucket} onChange={setPerfBucket} />
            <SegmentedToggle options={PERIOD_TOGGLE} value={perfPeriod} onChange={setPerfPeriod} />
            <SegmentedToggle options={QUADRANT_TOGGLE} value={perfQuadrant} onChange={setPerfQuadrant} />
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
              <ReferenceLine x={0} stroke="#999" />
              <ReferenceLine y={0} stroke="#999" />
              <ReferenceArea x1={0} x2={1e9} y1={0} y2={1e15} fill="transparent" stroke="none" label={{ value: QUADRANT_LABELS.NE, position: "insideTopRight", fontSize: 11, fill: "#666" }} />
              <ReferenceArea x1={0} x2={1e9} y1={-1e15} y2={0} fill="transparent" stroke="none" label={{ value: QUADRANT_LABELS.SE, position: "insideBottomRight", fontSize: 11, fill: "#666" }} />
              <ReferenceArea x1={-1e9} x2={0} y1={-1e15} y2={0} fill="transparent" stroke="none" label={{ value: QUADRANT_LABELS.SW, position: "insideBottomLeft", fontSize: 11, fill: "#666" }} />
              <ReferenceArea x1={-1e9} x2={0} y1={0} y2={1e15} fill="transparent" stroke="none" label={{ value: QUADRANT_LABELS.NW, position: "insideTopLeft", fontSize: 11, fill: "#666" }} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={<ScatterTooltip period={perfPeriod} />}
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

      {/* 4) Flows by Category — moved here */}
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

      {/* 5 + 6) Top/Bottom 5 + Monthly Flows by Bucket — side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
              <Tooltip content={<TopBottomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
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

      <CardShell
        title="Monthly Flows by Bucket"
        subtitle="NNB stacked by ETF / Mutual Fund / Money Market (signed)"
        right={<AfpFilterPopover value={monthlyAfps} onChange={setMonthlyAfps} />}
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} stackOffset="sign">
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="m" tickFormatter={shortMonth} stroke="#999" fontSize={11} />
              <YAxis tickFormatter={(v) => formatUSD(v)} stroke="#999" fontSize={11} width={70} />
              <ReferenceLine y={0} stroke="#999" />
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
      </div>

      {/* 7) YTD NNB & NNBF by Manager — diverging stacked bars */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CardShell
          title="YTD NNB by Manager"
          subtitle="YTD NNB per month, stacked by manager (signed)"
          right={
            <>
              <SegmentedToggle options={BUCKET_TOGGLE} value={nnbBucket} onChange={setNnbBucket} />
              <AfpFilterPopover value={nnbAfps} onChange={setNnbAfps} />
            </>
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={nnbSeries.data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} stackOffset="sign">
                <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis dataKey="m" tickFormatter={shortMonth} stroke="#999" fontSize={11} />
                <YAxis tickFormatter={(v) => formatUSD(v)} stroke="#999" fontSize={11} width={70} />
                <ReferenceLine y={0} stroke="#999" />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, n) => [formatUSD(v), n]}
                  labelFormatter={(l) => shortMonth(l as string)}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {nnbSeries.brands.map((b) => (
                  <Bar
                    key={b}
                    dataKey={b}
                    stackId="1"
                    fill={brandColor(b)}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardShell>

        <CardShell
          title="YTD NNBF by Manager"
          subtitle="YTD NNBF per month, stacked by manager (signed)"
          right={
            <>
              <SegmentedToggle options={BUCKET_TOGGLE} value={nnbfBucket} onChange={setNnbfBucket} />
              <AfpFilterPopover value={nnbfAfps} onChange={setNnbfAfps} />
            </>
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={nnbfSeries.data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} stackOffset="sign">
                <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis dataKey="m" tickFormatter={shortMonth} stroke="#999" fontSize={11} />
                <YAxis tickFormatter={(v) => formatUSD(v)} stroke="#999" fontSize={11} width={70} />
                <ReferenceLine y={0} stroke="#999" />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, n) => [formatUSD(v), n]}
                  labelFormatter={(l) => shortMonth(l as string)}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {nnbfSeries.brands.map((b) => (
                  <Bar
                    key={b}
                    dataKey={b}
                    stackId="1"
                    fill={brandColor(b)}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardShell>
      </div>
    </div>
  );
}
