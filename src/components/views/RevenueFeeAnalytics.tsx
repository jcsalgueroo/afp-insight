import { useMemo, useState } from "react";
import {
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
  BarChart,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import {
  AFPS,
  CATEGORIES,
  CHART_COLORS,
  MANAGERS,
  brandColor,
  categoryColor,
  formatBps,
  formatPct,
  formatUSD,
  getCategoryFeeBubbles,
  getFeeHeatmap,
  getManagerAumFee,
  getRrrByAfpCategory,
  getSecurityFeeNnb,
  managerColor,
  type AFP,
  type AssetClassFilter,
  type Bucket,
  type Category,
  type Manager,
} from "@/lib/mock-data";
import { useDashboard } from "@/lib/dashboard-store";
import { AfpFilterPopover } from "@/components/widgets/AfpFilterPopover";
import { MultiSelectPopover } from "@/components/widgets/MultiSelectPopover";
import { SegmentedToggle } from "@/components/widgets/SegmentedToggle";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const BUCKET_TOGGLE = [
  { value: "ETF" as Bucket, label: "ETF" },
  { value: "Mutual Fund" as Bucket, label: "MF" },
  { value: "Money Market" as Bucket, label: "MM" },
] as const;
const ASSET_CLASS_TOGGLE = [
  { value: "All" as AssetClassFilter, label: "All" },
  { value: "Equity" as AssetClassFilter, label: "Equity" },
  { value: "Fixed Income" as AssetClassFilter, label: "FI" },
] as const;
const BUCKET_ALL_TOGGLE = [
  { value: "All" as const, label: "All" },
  { value: "ETF" as const, label: "ETF" },
  { value: "Mutual Fund" as const, label: "MF" },
  { value: "Money Market" as const, label: "MM" },
] as const;
const PERIOD_TOGGLE = [
  { value: "Month" as const, label: "Month" },
  { value: "YTD" as const, label: "YTD" },
] as const;
const FEE_TOGGLE = [
  { value: "0" as const, label: "All" },
  { value: "20" as const, label: ">0.2%" },
  { value: "40" as const, label: ">0.4%" },
] as const;

const tooltipStyle = { fontSize: 12, border: "1px solid #E5E5E5", borderRadius: 4 } as const;

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
    <div className={cn("bg-card border border-border rounded-md shadow-sm", className)}>
      <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide">{title}</h2>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        {right && <div className="flex items-center gap-2 flex-wrap">{right}</div>}
      </div>
      {children}
    </div>
  );
}

// ---------- Card 1: Top managers AUM + weighted fee ----------
function ManagerAumFeeCard() {
  const { date } = useDashboard();
  const [bucket, setBucket] = useState<Bucket>("ETF");
  const data = useMemo(() => getManagerAumFee([], bucket, date), [bucket, date]);
  return (
    <CardShell
      title="Top Managers — RRR Org & Weighted Avg Fee"
      subtitle="Top 10 by RRR Org + Others; dots are AUM-weighted fee per manager."
      right={<SegmentedToggle options={BUCKET_TOGGLE} value={bucket} onChange={setBucket} />}
    >
      <div className="h-80 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="Manager"
              stroke="#999"
              fontSize={11}
              angle={-25}
              textAnchor="end"
              interval={0}
              height={60}
            />
            <YAxis
              yAxisId="left"
              stroke="#999"
              fontSize={11}
              tickFormatter={(v) => formatUSD(v)}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#999"
              fontSize={11}
              tickFormatter={(v) => `${v.toFixed(0)}`}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as (typeof data)[number];
                return (
                  <div
                    className="bg-background border border-border rounded-sm shadow-md p-2.5 text-xs"
                    style={{ minWidth: 180 }}
                  >
                    <div className="font-semibold mb-1.5">{d.Manager}</div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">AUM Org</span>
                      <span className="font-mono">{formatUSD(d.AUM)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Total RRR</span>
                      <span className="font-mono">{formatUSD(d.RRR)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Weighted Fee</span>
                      <span className="font-mono">{formatBps(d.Fee_bps)}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="RRR" name="RRR Org">
              {data.map((d, i) => (
                <Cell key={i} fill={brandColor(d.Manager)} />
              ))}
            </Bar>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="Fee_bps"
              name="Weighted Avg Fee (bps)"
              stroke="transparent"
              strokeWidth={0}
              dot={{ r: 4, fill: CHART_COLORS.blkAlt, stroke: CHART_COLORS.blkAlt }}
              activeDot={{ r: 5, fill: CHART_COLORS.blkAlt }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </CardShell>
  );
}

// ---------- Card 2: Fee Heatmap ----------
function FeeHeatmapCard() {
  const { date } = useDashboard();
  const [bucket, setBucket] = useState<Bucket>("ETF");
  const { categories, managers, cells } = useMemo(
    () => getFeeHeatmap([], bucket, date),
    [bucket, date],
  );
  const fees = cells.flat().map((c) => c.fee).filter((v) => v > 0);
  const min = fees.length ? Math.min(...fees) : 0;
  const max = fees.length ? Math.max(...fees) : 1;
  const colorFor = (fee: number) => {
    if (!fee) return "transparent";
    const t = max === min ? 0.5 : (fee - min) / (max - min);
    // green ramp: light → primary green
    const a = 0.15 + t * 0.75;
    return `rgba(0, 177, 64, ${a.toFixed(3)})`;
  };
  return (
    <CardShell
      title="Fee Heatmap — Category × Top 5 Managers"
      subtitle="Cells colored by AUM-weighted fee (relative scale)."
      right={<SegmentedToggle options={BUCKET_TOGGLE} value={bucket} onChange={setBucket} />}
    >
      <div className="p-4 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left px-2 py-2 font-medium text-muted-foreground"></th>
              {managers.map((m) => (
                <th
                  key={m}
                  className="px-2 py-2 text-center font-medium text-muted-foreground border-b border-border"
                >
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, i) => (
              <tr key={cat}>
                <td className="px-2 py-2 font-medium text-foreground whitespace-nowrap">{cat}</td>
                {cells[i].map((cell, j) => (
                  <td
                    key={j}
                    title={`${managers[j]} · ${cat}\nWeighted Fee: ${formatBps(cell.fee)}\nAUM: ${formatUSD(cell.aum)}`}
                    className="px-3 py-3 text-center font-mono tabular-nums border border-border"
                    style={{ background: colorFor(cell.fee) }}
                  >
                    {cell.fee ? cell.fee.toFixed(0) : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center gap-2 mt-3 text-[11px] text-muted-foreground">
          <span>Lower fee</span>
          <div className="h-2 flex-1 max-w-[200px] rounded-sm" style={{
            background: "linear-gradient(to right, rgba(0,177,64,0.15), rgba(0,177,64,0.9))",
          }} />
          <span>Higher fee</span>
          <span className="ml-2 font-mono">
            {formatBps(min)} – {formatBps(max)}
          </span>
        </div>
      </div>
    </CardShell>
  );
}

// ---------- Card 3: Security Fee vs NNB Scatter ----------
function SecurityFeeNnbCard() {
  const { date } = useDashboard();
  const [period, setPeriod] = useState<"Month" | "YTD">("YTD");
  const [feeMin, setFeeMin] = useState<"0" | "20" | "40">("0");
  const [afps, setAfps] = useState<AFP[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const data = useMemo(
    () =>
      getSecurityFeeNnb(afps, managers, categories, period, date, Number(feeMin)),
    [afps, managers, categories, period, date, feeMin],
  );
  const grouped = CATEGORIES.map((cat) => ({
    cat,
    data: data.filter((d) => d.Category === cat),
  })).filter((g) => g.data.length);
  return (
    <CardShell
      title="Fee vs NNB — by Security"
      subtitle="One bubble per security; color by Category."
      right={
        <>
          <SegmentedToggle options={PERIOD_TOGGLE} value={period} onChange={setPeriod} />
          <SegmentedToggle options={FEE_TOGGLE} value={feeMin} onChange={setFeeMin} />
          <AfpFilterPopover value={afps} onChange={setAfps} />
          <MultiSelectPopover
            label="Mgr"
            options={MANAGERS}
            value={managers}
            onChange={setManagers}
          />
          <MultiSelectPopover
            label="Cat"
            options={CATEGORIES}
            value={categories}
            onChange={setCategories}
          />
        </>
      }
    >
      <div className="h-96 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} />
            <XAxis
              type="number"
              dataKey="NNB"
              name="NNB"
              stroke="#999"
              fontSize={11}
              tickFormatter={(v) => formatUSD(v)}
              label={{ value: "NNB", position: "insideBottom", offset: -8, fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="Fee_bps"
              name="Fee"
              stroke="#999"
              fontSize={11}
              tickFormatter={(v) => `${v}`}
              label={{ value: "Fee (bps)", angle: -90, position: "insideLeft", fontSize: 11 }}
            />
            <ZAxis range={[60, 60]} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              contentStyle={tooltipStyle}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as (typeof data)[number];
                return (
                  <div
                    className="bg-background border border-border rounded-sm shadow-md p-2.5 text-xs"
                    style={{ minWidth: 220 }}
                  >
                    <div className="font-semibold">{d.Ticker} · {d.Manager}</div>
                    <div className="text-muted-foreground mb-2">
                      {d.Category} · Fee {formatBps(d.Fee_bps)} · NNB {formatUSD(d.NNB)}
                    </div>
                    <div className="border-t border-border pt-1.5">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                        AUM Org by AFP
                      </div>
                      <table className="w-full">
                        <tbody>
                          {d.byAfp.map((a) => (
                            <tr key={a.AFP}>
                              <td className="py-0.5 pr-2 text-muted-foreground">{a.AFP}</td>
                              <td className="py-0.5 text-right font-mono">{formatUSD(a.AUM)}</td>
                            </tr>
                          ))}
                          {!d.byAfp.length && (
                            <tr>
                              <td className="text-muted-foreground italic">No current AUM</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              }}
            />
            {grouped.map((g) => (
              <Scatter key={g.cat} name={g.cat} data={g.data} fill={categoryColor(g.cat)} />
            ))}
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </CardShell>
  );
}

// ---------- Card 4: RRR by AFP stacked by Category ----------
function RrrByAfpCard() {
  const { date } = useDashboard();
  const [bucket, setBucket] = useState<Bucket>("ETF");
  const [managers, setManagers] = useState<Manager[]>([]);
  const { data, categories } = useMemo(
    () => getRrrByAfpCategory(managers, bucket, date),
    [managers, bucket, date],
  );
  return (
    <CardShell
      title="RRR by AFP — Stacked by Category"
      right={
        <>
          <SegmentedToggle options={BUCKET_TOGGLE} value={bucket} onChange={setBucket} />
          <MultiSelectPopover
            label="Mgr"
            options={MANAGERS}
            value={managers}
            onChange={setManagers}
          />
        </>
      }
    >
      <div className="h-80 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis dataKey="AFP" stroke="#999" fontSize={11} />
            <YAxis stroke="#999" fontSize={11} tickFormatter={(v) => formatUSD(v)} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: number) => formatUSD(v)}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {categories.map((c) => (
              <Bar
                key={c}
                dataKey={c}
                stackId="rrr"
                fill={categoryColor(c as Category)}
                name={c}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </CardShell>
  );
}

// ---------- Card 5: Category Fee Bubble (system vs selected AFP) ----------
function CategoryFeeBubbleCard() {
  const { date } = useDashboard();
  const [bucket, setBucket] = useState<"All" | "ETF" | "Mutual Fund" | "Money Market">("All");
  const [afp, setAfp] = useState<AFP>(AFPS[0]);
  const data = useMemo(() => getCategoryFeeBubbles(afp, bucket, date), [afp, bucket, date]);

  // Build scatter rows: each category yields two points (system grey + AFP green)
  const rows = data.flatMap((d, idx) => [
    {
      x: idx,
      Category: d.Category,
      fee: d.sysFee,
      size: d.sharePct,
      kind: "System" as const,
      sharePct: d.sharePct,
      blkSharePct: d.blkSharePct,
    },
    {
      x: idx + 0.001,
      Category: d.Category,
      fee: d.afpFee,
      size: d.sharePct,
      kind: "AFP" as const,
      sharePct: d.sharePct,
      blkSharePct: d.blkSharePct,
    },
  ]);

  // Green shade based on BLK share within category (lighter → darker)
  const greenShade = (blkPct: number) => {
    const t = Math.min(1, Math.max(0, blkPct / 50)); // cap at 50% share = darkest
    const a = 0.35 + t * 0.6;
    return `rgba(0, 177, 64, ${a.toFixed(3)})`;
  };

  return (
    <CardShell
      title="Weighted Fee by Category — System vs Selected AFP"
      subtitle="Bubble size = category share of AUM Org. Green shade = iShares/BlackRock share."
      right={
        <>
          <SegmentedToggle options={BUCKET_ALL_TOGGLE} value={bucket} onChange={setBucket} />
          <Select value={afp} onValueChange={(v) => setAfp(v as AFP)}>
            <SelectTrigger className="h-7 text-xs w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AFPS.map((a) => (
                <SelectItem key={a} value={a} className="text-xs">
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      }
    >
      <div className="h-96 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, left: 10, bottom: 30 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} />
            <XAxis
              type="number"
              dataKey="x"
              stroke="#999"
              fontSize={11}
              domain={[-0.5, data.length - 0.5]}
              ticks={data.map((_, i) => i)}
              tickFormatter={(v: number) => data[v]?.Category ?? ""}
            />
            <YAxis
              type="number"
              dataKey="fee"
              stroke="#999"
              fontSize={11}
              tickFormatter={(v) => `${v.toFixed(0)}`}
              label={{ value: "Weighted Fee (bps)", angle: -90, position: "insideLeft", fontSize: 11 }}
            />
            <ZAxis type="number" dataKey="size" range={[80, 1200]} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              contentStyle={tooltipStyle}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as (typeof rows)[number];
                return (
                  <div className="bg-background border border-border rounded-sm shadow-md p-2.5 text-xs">
                    <div className="font-semibold">{d.Category} · {d.kind}</div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Weighted Fee</span>
                      <span className="font-mono">{formatBps(d.fee)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Category Share</span>
                      <span className="font-mono">{d.sharePct.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">BLK / iShares</span>
                      <span className="font-mono">{d.blkSharePct.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              }}
            />
            <Scatter
              name="System"
              data={rows.filter((r) => r.kind === "System")}
              fill="#B8B8B8"
              fillOpacity={0.7}
            />
            <Scatter name={afp} data={rows.filter((r) => r.kind === "AFP")}>
              {rows
                .filter((r) => r.kind === "AFP")
                .map((r, i) => (
                  <Cell key={i} fill={greenShade(r.blkSharePct)} />
                ))}
            </Scatter>
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </CardShell>
  );
}

export function RevenueFeeAnalytics() {
  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Revenue &amp; Fees Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Fee economics, revenue and competitive positioning.
        </p>
      </div>
      <ManagerAumFeeCard />
      <FeeHeatmapCard />
      <SecurityFeeNnbCard />
      <RrrByAfpCard />
      <CategoryFeeBubbleCard />
    </div>
  );
}
