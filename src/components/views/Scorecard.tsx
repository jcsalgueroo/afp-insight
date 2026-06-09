import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { ChevronDown, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { KpiCard } from "@/components/widgets/KpiCard";
import { AfpFilterPopover } from "@/components/widgets/AfpFilterPopover";
import { SegmentedToggle } from "@/components/widgets/SegmentedToggle";
import { useDashboard } from "@/lib/dashboard-store";
import {
  AFPS,
  BUCKETS,
  BUCKET_COLOR,
  CATEGORIES,
  CHART_COLORS,
  brandColor,
  categoryColor,
  formatPct,
  formatUSD,
  getAumOrgByBucketSeries,
  getBrandKpis,
  getBlkFlowsByAfp,
  getCategoryWeightBars,
  getCategoryCompositionSeries,
  getKPIs,
  getManagerAfpBreakdown,
  getMonthlyNnbByBucketSeries,
  getOthersManagerBreakdown,
  getAumSplitByBucket,
  getTopManagersPie,
  getTopManagersShareSeries,
  shadeGreen,
  shadeGrey,
  type AFP,
  type AssetClassFilter,
  type Bucket,
  type BucketFilter,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const BUCKET_TOGGLE = [
  { value: "ETF" as Bucket, label: "ETF" },
  { value: "Mutual Fund" as Bucket, label: "MF" },
  { value: "Money Market" as Bucket, label: "MM" },
] as const;

const WEIGHTS_BUCKET_TOGGLE = [
  { value: "ETF" as BucketFilter, label: "ETF" },
  { value: "Mutual Fund" as BucketFilter, label: "MF" },
  { value: "All" as BucketFilter, label: "All" },
] as const;

const ASSET_CLASS_TOGGLE = [
  { value: "Equity" as AssetClassFilter, label: "Equity" },
  { value: "Fixed Income" as AssetClassFilter, label: "FI" },
  { value: "All" as AssetClassFilter, label: "All" },
] as const;

const METRIC_TOGGLE = [
  { value: "AUM_USD" as const, label: "AUM Org" },
  { value: "NNB_USD" as const, label: "Monthly NNB" },
] as const;

const PERIOD_TOGGLE = [
  { value: "Month" as const, label: "Month" },
  { value: "YTD" as const, label: "YTD" },
] as const;

function shortMonth(m: string) {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
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

function AfpSinglePicker({ value, onChange }: { value: AFP; onChange: (a: AFP) => void }) {
  return (
    <Popover>
      <PopoverTrigger className="flex items-center gap-1.5 text-xs uppercase tracking-wide border border-border px-2.5 py-1 hover:bg-muted rounded-sm">
        <span className="text-muted-foreground">AFP:</span>
        <span className="font-medium text-foreground">{value}</span>
        <ChevronDown className="h-3 w-3" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        {AFPS.map((a) => (
          <button
            key={a}
            onClick={() => onChange(a)}
            className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted rounded-sm flex items-center justify-between"
          >
            <span>{a}</span>
            {value === a && <Check className="h-3 w-3 text-primary" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

const tooltipStyle = { fontSize: 12, border: "1px solid #E5E5E5", borderRadius: 4 } as const;

// Custom tooltip for Category Weights bar chart
function CategoryWeightTooltip({
  active,
  payload,
  bubbleAfp,
}: {
  active?: boolean;
  payload?: Array<{ payload: { category: string; aggWeight: number; afpWeight: number; aggBlkShare: number; afpBlkShare: number } }>;
  bubbleAfp: AFP;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-popover border border-border rounded-md shadow-md p-3 text-xs min-w-[220px]">
      <div className="font-semibold text-sm mb-2">{d.category}</div>
      <div className="grid grid-cols-3 gap-x-3 gap-y-1">
        <div className="text-muted-foreground"></div>
        <div className="text-muted-foreground text-right">Weight</div>
        <div className="text-muted-foreground text-right">BLK share</div>

        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: shadeGrey(d.aggBlkShare) }} />
          System
        </div>
        <div className="text-right font-medium">{d.aggWeight.toFixed(1)}%</div>
        <div className="text-right font-medium">{(d.aggBlkShare * 100).toFixed(1)}%</div>

        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: shadeGreen(d.afpBlkShare) }} />
          {bubbleAfp}
        </div>
        <div className="text-right font-medium">{d.afpWeight.toFixed(1)}%</div>
        <div className="text-right font-medium">{(d.afpBlkShare * 100).toFixed(1)}%</div>
      </div>
    </div>
  );
}

// Custom tooltip for Top 5 Managers donut
function TopManagersTooltip({
  active,
  payload,
  filters,
  bucket,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { name: string; value: number } }>;
  filters: { date: string; afps: AFP[]; blkOnly: boolean };
  bucket: Bucket;
}) {
  if (!active || !payload?.length) return null;
  const slice = payload[0].payload;
  const isOthers = slice.name === "Others";
  const breakdown = isOthers
    ? getOthersManagerBreakdown(filters, bucket).map((r) => ({ label: r.Manager, AUM: r.AUM }))
    : getManagerAfpBreakdown(filters, slice.name, bucket).map((r) => ({ label: r.AFP, AUM: r.AUM }));
  const total = slice.value;
  return (
    <div className="bg-popover border border-border rounded-md shadow-md p-3 text-xs min-w-[240px] max-w-[300px]">
      <div className="font-semibold text-sm mb-1">{slice.name}</div>
      <div className="text-muted-foreground mb-2">
        AUM Org: <span className="font-medium text-foreground">{formatUSD(total)}</span>
      </div>
      <div className="text-muted-foreground text-[10px] uppercase tracking-wide mb-1">
        {isOthers ? "Managers in Others" : "Breakdown by AFP"}
      </div>
      <div className="space-y-0.5 max-h-48 overflow-auto">
        {breakdown.map((b) => (
          <div key={b.label} className="flex items-center justify-between gap-2">
            <span className="truncate">{b.label}</span>
            <span className="font-medium tabular-nums">
              {formatUSD(b.AUM)}{" "}
              <span className="text-muted-foreground">
                ({total ? ((b.AUM / total) * 100).toFixed(0) : 0}%)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Scorecard() {
  const { date } = useDashboard();
  const afps: AFP[] = [];
  const filters = { date, afps, blkOnly: false };
  const k = getKPIs(filters);
  const bk = getBrandKpis({ ...filters, blkOnly: false });

  // AUM / Monthly NNB chart
  const [aumLocalAfps, setAumLocalAfps] = useState<AFP[]>([]);
  const [aumMetric, setAumMetric] = useState<"AUM_USD" | "NNB_USD">("AUM_USD");

  // Top 5 donut
  const [pieBucket, setPieBucket] = useState<Bucket>("ETF");

  // Category weights bar chart
  const [bubbleAfp, setBubbleAfp] = useState<AFP>(AFPS[0]);
  const [weightsBucket, setWeightsBucket] = useState<BucketFilter>("ETF");
  const [weightsAssetClass, setWeightsAssetClass] = useState<AssetClassFilter>("Equity");

  // Top 5 + Others share evolution
  const [shareBucket, setShareBucket] = useState<Bucket>("ETF");
  const [shareAfps, setShareAfps] = useState<AFP[]>([]);

  // Composition by category
  const [compAfps, setCompAfps] = useState<AFP[]>([]);

  // BLK NNB / NNBF by AFP (stacked by bucket)
  const [blkNnbPeriod, setBlkNnbPeriod] = useState<"Month" | "YTD">("YTD");
  const [blkNnbfPeriod, setBlkNnbfPeriod] = useState<"Month" | "YTD">("YTD");

  // AUM Split donut
  const [splitAfps, setSplitAfps] = useState<AFP[]>([]);
  const blkNnbByAfp = useMemo(
    () => getBlkFlowsByAfp("NNB", blkNnbPeriod, date),
    [blkNnbPeriod, date],
  );
  const blkNnbfByAfp = useMemo(
    () => getBlkFlowsByAfp("NNBF", blkNnbfPeriod, date),
    [blkNnbfPeriod, date],
  );

  const aumSeries = useMemo(
    () => getAumOrgByBucketSeries(aumLocalAfps, "AUM_USD"),
    [aumLocalAfps],
  );
  const nnbBarSeries = useMemo(
    () => getMonthlyNnbByBucketSeries(aumLocalAfps),
    [aumLocalAfps],
  );
  const pieData = useMemo(() => getTopManagersPie(filters, pieBucket), [filters, pieBucket]);
  const bars = useMemo(
    () =>
      getCategoryWeightBars({ ...filters, blkOnly: false }, bubbleAfp, {
        bucket: weightsBucket,
        assetClass: weightsAssetClass,
      }),
    [filters, bubbleAfp, weightsBucket, weightsAssetClass],
  );
  const shareSeries = useMemo(
    () => getTopManagersShareSeries(shareAfps, shareBucket),
    [shareAfps, shareBucket],
  );
  const etfComp = useMemo(() => getCategoryCompositionSeries(compAfps, "ETF"), [compAfps]);
  const mfComp = useMemo(() => getCategoryCompositionSeries(compAfps, "Mutual Fund"), [compAfps]);
  const aumSplitData = useMemo(
    () => getAumSplitByBucket({ date, afps: splitAfps, blkOnly: false }),
    [date, splitAfps],
  );

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">System Summary</h1>
        <p className="text-sm text-muted-foreground">
          BlackRock & iShares positioning across the AFP institutional market.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="BLK RRR" value={formatUSD(k.rrr)} delta={k.rrrDelta} trend={k.trendRRR} />
        <KpiCard label="Total BLK AUM" value={formatUSD(k.aum)} delta={k.aumDelta} trend={k.trendAUM} />
        <KpiCard label="BLK YTD NNB" value={formatUSD(k.nnb)} delta={k.nnbDelta} trend={k.trendNNB} />
        <KpiCard label="BLK YTD NNBF" value={formatUSD(k.nnbf)} delta={k.nnbfDelta} trend={k.trendNNBF} />
        <KpiCard
          label="iShares Share — ETF AUM"
          value={formatPct(bk.iSharesEtf, 1)}
          delta={bk.iSharesEtfDelta}
          trend={bk.iSharesEtfTrend}
        />
        <KpiCard
          label="BlackRock Share — Mutual Funds"
          value={formatPct(bk.blkMf, 1)}
          delta={bk.blkMfDelta}
          trend={bk.blkMfTrend}
        />
      </div>

      {/* AUM Split — donut chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CardShell
          className="lg:col-span-1"
          title="AUM Split"
          subtitle="Overall market by product type"
          right={<AfpFilterPopover value={splitAfps} onChange={setSplitAfps} />}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, n: string) => [formatUSD(v), n]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Pie
                  data={aumSplitData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  isAnimationActive={false}
                  label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {aumSplitData.map((d) => (
                    <Cell key={d.name} fill={BUCKET_COLOR[d.name as Bucket]} stroke="#fff" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardShell>

        <CardShell
          className="lg:col-span-2"
          title="AUM Org — Evolution by Asset Type"
          subtitle="Stacked area: ETF / Mutual Fund / Money Market"
          right={
            <>
              <SegmentedToggle options={METRIC_TOGGLE} value={aumMetric} onChange={setAumMetric} />
              <AfpFilterPopover value={aumLocalAfps} onChange={setAumLocalAfps} />
            </>
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              {aumMetric === "AUM_USD" ? (
                <AreaChart data={aumSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis dataKey="m" tickFormatter={shortMonth} stroke="#999" fontSize={11} />
                  <YAxis tickFormatter={(v) => formatUSD(v)} stroke="#999" fontSize={11} width={70} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number, n) => [formatUSD(v), n]}
                    labelFormatter={(l) => shortMonth(l as string)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {BUCKETS.map((b) => (
                    <Area
                      key={b}
                      type="monotone"
                      dataKey={b}
                      stackId="1"
                      stroke={BUCKET_COLOR[b]}
                      fill={BUCKET_COLOR[b]}
                      fillOpacity={0.8}
                      isAnimationActive={false}
                    />
                  ))}
                </AreaChart>
              ) : (
                <BarChart data={nnbBarSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis dataKey="m" tickFormatter={shortMonth} stroke="#999" fontSize={11} />
                  <YAxis tickFormatter={(v) => formatUSD(v)} stroke="#999" fontSize={11} width={70} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number, n) => [formatUSD(v), n]}
                    labelFormatter={(l) => shortMonth(l as string)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {BUCKETS.map((b) => (
                    <Bar key={b} dataKey={b} fill={BUCKET_COLOR[b]} isAnimationActive={false} />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardShell>
      </div>

      {/* Category Weights — grouped bar chart */}
      {/* BLK NNB / NNBF by AFP — stacked diverging bars */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {([
          {
            title: "BlackRock NNB by AFP",
            subtitle: "Stacked by bucket (ETF / MF / MM); negatives below axis",
            data: blkNnbByAfp,
            period: blkNnbPeriod,
            setPeriod: setBlkNnbPeriod,
          },
          {
            title: "BlackRock NNBF by AFP",
            subtitle: "Stacked by bucket (ETF / MF / MM); negatives below axis",
            data: blkNnbfByAfp,
            period: blkNnbfPeriod,
            setPeriod: setBlkNnbfPeriod,
          },
        ] as const).map((c) => (
          <CardShell
            key={c.title}
            title={c.title}
            subtitle={c.subtitle}
            right={<SegmentedToggle options={PERIOD_TOGGLE} value={c.period} onChange={c.setPeriod} />}
          >
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={c.data as unknown as Array<Record<string, number | string>>} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} stackOffset="sign">
                  <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis dataKey="AFP" stroke="#999" fontSize={11} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis tickFormatter={(v: number) => formatUSD(v)} stroke="#999" fontSize={11} width={70} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number, n: string) => [formatUSD(v), n]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={0} stroke="#999" />
                  {BUCKETS.map((b) => (
                    <Bar key={b} dataKey={b} stackId="signed" fill={BUCKET_COLOR[b]} isAnimationActive={false} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardShell>
        ))}
      </div>

      <CardShell
        title="Category Weights — AFP vs System"
        subtitle="Bar shade intensity = BlackRock share within each category (0–100%)"
        right={
          <>
            <SegmentedToggle options={WEIGHTS_BUCKET_TOGGLE} value={weightsBucket} onChange={setWeightsBucket} />
            <SegmentedToggle options={ASSET_CLASS_TOGGLE} value={weightsAssetClass} onChange={setWeightsAssetClass} />
            <AfpSinglePicker value={bubbleAfp} onChange={setBubbleAfp} />
          </>
        }
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="category" stroke="#999" fontSize={11} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis unit="%" stroke="#999" fontSize={11} width={45} />
              <Tooltip content={<CategoryWeightTooltip bubbleAfp={bubbleAfp} />} cursor={{ fill: "#00000008" }} />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                payload={[
                  { value: "System (Aggregate)", type: "square", color: shadeGrey(0.5) },
                  { value: bubbleAfp, type: "square", color: shadeGreen(0.5) },
                ]}
              />
              <Bar dataKey="aggWeight" name="System (Aggregate)" isAnimationActive={false}>
                {bars.map((b) => (
                  <Cell key={`agg-${b.category}`} fill={shadeGrey(b.aggBlkShare)} />
                ))}
              </Bar>
              <Bar dataKey="afpWeight" name={bubbleAfp} isAnimationActive={false}>
                {bars.map((b) => (
                  <Cell key={`afp-${b.category}`} fill={shadeGreen(b.afpBlkShare)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardShell>

      {/* Top 5 + Others — share evolution line chart */}
      <CardShell
        title="Top 5 Managers + Others — Market Share Evolution"
        subtitle="Share of bucket AUM Org over time, sums to 100% per month"
        right={
          <>
            <SegmentedToggle options={BUCKET_TOGGLE} value={shareBucket} onChange={setShareBucket} />
            <AfpFilterPopover value={shareAfps} onChange={setShareAfps} />
          </>
        }
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={shareSeries.data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="m" tickFormatter={shortMonth} stroke="#999" fontSize={11} />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
                stroke="#999"
                fontSize={11}
                width={45}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number, n) => [`${v.toFixed(1)}%`, n]}
                labelFormatter={(l) => shortMonth(l as string)}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {shareSeries.brands.map((b) => (
                <Line
                  key={b}
                  type="monotone"
                  dataKey={b}
                  stroke={brandColor(b)}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardShell>

      {/* AUM Org evolution / Monthly NNB grouped bar + Top 5 Managers donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CardShell
          className="lg:col-span-2"
          title={aumMetric === "AUM_USD" ? "AUM Org — Evolution by Asset Type" : "Monthly NNB by Asset Type"}
          subtitle={
            aumMetric === "AUM_USD"
              ? "Stacked area: ETF / Mutual Fund / Money Market"
              : "Grouped bars per month: ETF / Mutual Fund / Money Market"
          }
          right={
            <>
              <SegmentedToggle options={METRIC_TOGGLE} value={aumMetric} onChange={setAumMetric} />
              <AfpFilterPopover value={aumLocalAfps} onChange={setAumLocalAfps} />
            </>
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              {aumMetric === "AUM_USD" ? (
                <AreaChart data={aumSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis dataKey="m" tickFormatter={shortMonth} stroke="#999" fontSize={11} />
                  <YAxis tickFormatter={(v) => formatUSD(v)} stroke="#999" fontSize={11} width={70} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number, n) => [formatUSD(v), n]}
                    labelFormatter={(l) => shortMonth(l as string)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {BUCKETS.map((b) => (
                    <Area
                      key={b}
                      type="monotone"
                      dataKey={b}
                      stackId="1"
                      stroke={BUCKET_COLOR[b]}
                      fill={BUCKET_COLOR[b]}
                      fillOpacity={0.8}
                      isAnimationActive={false}
                    />
                  ))}
                </AreaChart>
              ) : (
                <BarChart data={nnbBarSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis dataKey="m" tickFormatter={shortMonth} stroke="#999" fontSize={11} />
                  <YAxis tickFormatter={(v) => formatUSD(v)} stroke="#999" fontSize={11} width={70} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number, n) => [formatUSD(v), n]}
                    labelFormatter={(l) => shortMonth(l as string)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {BUCKETS.map((b) => (
                    <Bar key={b} dataKey={b} fill={BUCKET_COLOR[b]} isAnimationActive={false} />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardShell>

        <CardShell
          title="Top 5 Managers — Market Share"
          subtitle="By AUM, remainder grouped as Others"
          right={<SegmentedToggle options={BUCKET_TOGGLE} value={pieBucket} onChange={setPieBucket} />}
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<TopManagersTooltip filters={filters} bucket={pieBucket} />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={85}
                  paddingAngle={1}
                  isAnimationActive={false}
                  label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((d) => (
                    <Cell key={d.name} fill={brandColor(d.name)} stroke="#fff" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardShell>
      </div>

      {/* AUM Org composition by Category — 100% stacked bar (one per month) */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          AUM Org Composition by Category
        </h2>
        <AfpFilterPopover value={compAfps} onChange={setCompAfps} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {([
          { title: "ETF — Composition by Category", series: etfComp },
          { title: "Mutual Fund — Composition by Category", series: mfComp },
        ] as const).map((card) => (
          <CardShell key={card.title} title={card.title} subtitle="100% stacked bar per month">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={card.series.data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis dataKey="m" tickFormatter={shortMonth} stroke="#999" fontSize={11} />
                  <YAxis
                    domain={[0, 1]}
                    tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                    stroke="#999"
                    fontSize={11}
                    width={45}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelFormatter={(l) => shortMonth(l as string)}
                    formatter={(v: number, n: string, p: { payload?: { __raw?: Record<string, number> } }) => {
                      const raw = p?.payload?.__raw?.[n] ?? 0;
                      return [`${formatUSD(raw)} (${(v * 100).toFixed(1)}%)`, n];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {card.series.categories.map((c) => (
                    <Bar
                      key={c}
                      dataKey={c}
                      stackId="1"
                      fill={categoryColor(c)}
                      isAnimationActive={false}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardShell>
        ))}
      </div>
    </div>
  );
}
