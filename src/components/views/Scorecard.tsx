import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
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
  getCategoryWeightBubbles,
  getCategoryCompositionSeries,
  getKPIs,
  getTopManagersPie,
  type AFP,
  type Bucket,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const BUCKET_TOGGLE = [
  { value: "ETF" as Bucket, label: "ETF" },
  { value: "Mutual Fund" as Bucket, label: "MF" },
  { value: "Money Market" as Bucket, label: "MM" },
] as const;

const METRIC_TOGGLE = [
  { value: "AUM_USD" as const, label: "AUM Org" },
  { value: "NNB_USD" as const, label: "Monthly NNB" },
] as const;

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
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">{right}</div>
      </div>
      <div className="p-5 flex-1">{children}</div>
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

export function Scorecard() {
  const { date, blkOnly } = useDashboard();
  const afps: AFP[] = [];
  const filters = { date, afps, blkOnly };
  const k = getKPIs(filters);
  const bk = getBrandKpis({ ...filters, blkOnly: false });

  // Local state per chart
  const [aumLocalAfps, setAumLocalAfps] = useState<AFP[]>([]);
  const [aumMetric, setAumMetric] = useState<"AUM_USD" | "NNB_USD">("AUM_USD");

  const [pieBucket, setPieBucket] = useState<Bucket>("ETF");
  const [bubbleAfp, setBubbleAfp] = useState<AFP>(AFPS[0]);

  const [compAfps, setCompAfps] = useState<AFP[]>([]);

  const aumSeries = useMemo(
    () => getAumOrgByBucketSeries(aumLocalAfps, aumMetric),
    [aumLocalAfps, aumMetric],
  );
  const pieData = useMemo(() => getTopManagersPie(filters, pieBucket), [filters, pieBucket]);
  const bubbles = useMemo(
    () => getCategoryWeightBubbles({ ...filters, blkOnly: false }, bubbleAfp),
    [filters, bubbleAfp],
  );
  const etfComp = useMemo(() => getCategoryCompositionSeries(compAfps, "ETF"), [compAfps]);
  const mfComp = useMemo(() => getCategoryCompositionSeries(compAfps, "Mutual Fund"), [compAfps]);
  const compCats = CATEGORIES.filter((c) => c !== "Money Market");

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
        <KpiCard label="BLK RRR (Monthly)" value={formatUSD(k.rrr)} delta={k.rrrDelta} trend={k.trendRRR} />
        <KpiCard label="Total BLK AUM" value={formatUSD(k.aum)} delta={k.aumDelta} trend={k.trendAUM} />
        <KpiCard label="BLK YTD NNB" value={formatUSD(k.nnb)} delta={k.nnbDelta} trend={k.trendNNB} />
        <KpiCard label="BLK YTD NNBF" value={formatUSD(k.nnbf)} delta={k.nnbfDelta} trend={k.trendNNB} />
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

      {/* AUM Org evolution */}
      <CardShell
        title={aumMetric === "AUM_USD" ? "AUM Org — Evolution by Asset Type" : "Monthly NNB — Evolution by Asset Type"}
        subtitle="Trailing 12 months, stacked by ETF / Mutual Fund / Money Market"
        right={
          <>
            <SegmentedToggle options={METRIC_TOGGLE} value={aumMetric} onChange={setAumMetric} />
            <AfpFilterPopover value={aumLocalAfps} onChange={setAumLocalAfps} />
          </>
        }
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
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
          </ResponsiveContainer>
        </div>
      </CardShell>

      {/* Pie + Bubble row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardShell
          title="Top 5 Managers — Market Share"
          subtitle="By AUM, remainder grouped as Others"
          right={<SegmentedToggle options={BUCKET_TOGGLE} value={pieBucket} onChange={setPieBucket} />}
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, n) => [formatUSD(v), n]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={100}
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

        <CardShell
          title="Category Weights — AFP vs System"
          subtitle="Bubble size = (iShares + BlackRock) share within Category"
          right={<AfpSinglePicker value={bubbleAfp} onChange={setBubbleAfp} />}
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} />
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={[-0.5, CATEGORIES.length - 0.5]}
                  ticks={CATEGORIES.map((_, i) => i)}
                  tickFormatter={(i: number) => CATEGORIES[i] ?? ""}
                  stroke="#999"
                  fontSize={10}
                  interval={0}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  unit="%"
                  stroke="#999"
                  fontSize={11}
                  width={45}
                />
                <ZAxis type="number" dataKey="z" range={[60, 600]} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(v: number, n) => {
                    if (n === "y") return [`${v.toFixed(1)}%`, "Weight"];
                    if (n === "z") return [`${v.toFixed(1)}%`, "BLK+iShares share"];
                    return [v, n];
                  }}
                  labelFormatter={() => ""}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Scatter
                  name="System (Aggregate)"
                  data={bubbles.map((b) => ({ x: b.idx - 0.18, y: b.aggWeight, z: b.sizeShare, cat: b.category }))}
                  fill="#B8B8B8"
                  isAnimationActive={false}
                />
                <Scatter
                  name={bubbleAfp}
                  data={bubbles.map((b) => ({ x: b.idx + 0.18, y: b.afpWeight, z: b.sizeShare, cat: b.category }))}
                  fill={CHART_COLORS.blk}
                  isAnimationActive={false}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </CardShell>
      </div>

      {/* YTD NNB + NNBF area charts */}
      {/* AUM Org composition by Category — ETF & MF */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          AUM Org Composition by Category
        </h2>
        <AfpFilterPopover value={compAfps} onChange={setCompAfps} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {([
          { title: "ETF — Composition by Category", data: etfComp },
          { title: "Mutual Fund — Composition by Category", data: mfComp },
        ] as const).map((card) => (
          <CardShell key={card.title} title={card.title} subtitle="100% stacked share of AUM Org over time">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={card.data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
                  {compCats.map((c) => (
                    <Area
                      key={c}
                      type="monotone"
                      dataKey={c}
                      stackId="1"
                      stroke={categoryColor(c)}
                      fill={categoryColor(c)}
                      fillOpacity={0.8}
                      isAnimationActive={false}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardShell>
        ))}
      </div>
    </div>
  );
}