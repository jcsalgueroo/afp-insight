import { Fragment, useMemo, useState } from "react";
import {
  Treemap,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Check, ChevronDown, Filter, Search } from "lucide-react";
import {
  AFPS,
  CATEGORIES,
  CHART_COLORS,
  MATCH_TYPES,
  PORTFOLIO_TYPES,
  brandColor,
  categoryColor,
  formatBps,
  formatPct,
  formatUSD,
  getAFPCompositionTree,
  getAfpEtfMfDonut,
  getAfpPositions,
  getDisplacement,
  getNnbByManagerStacked,
  managerColor,
  type AFP,
  type Bucket,
  type Category,
  type MatchType,
  type Manager,
  type PortfolioType,
} from "@/lib/mock-data";
import { useDashboard } from "@/lib/dashboard-store";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AfpFilterPopover } from "@/components/widgets/AfpFilterPopover";
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

function CategoryFilterPopover({
  value,
  onChange,
}: {
  value: Category[];
  onChange: (next: Category[]) => void;
}) {
  const toggle = (c: Category) =>
    onChange(value.includes(c) ? value.filter((x) => x !== c) : [...value, c]);
  return (
    <Popover>
      <PopoverTrigger className="flex items-center gap-1.5 text-xs uppercase tracking-wide border border-border px-2.5 py-1 hover:bg-muted rounded-sm">
        <Filter className="h-3 w-3" />
        <span className="text-muted-foreground">Categories:</span>
        <span className="font-medium text-foreground">
          {value.length === 0 ? "All" : value.length}
        </span>
        <ChevronDown className="h-3 w-3" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        <button
          onClick={() => onChange([])}
          className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted rounded-sm flex items-center justify-between border-b border-border mb-1"
        >
          <span>All Categories</span>
          {value.length === 0 && <Check className="h-3 w-3 text-primary" />}
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => toggle(c)}
            className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted rounded-sm flex items-center justify-between"
          >
            <span>{c}</span>
            {value.includes(c) && <Check className="h-3 w-3 text-primary" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function PortfolioPicker({
  value,
  onChange,
}: {
  value: PortfolioType | "All";
  onChange: (v: PortfolioType | "All") => void;
}) {
  return (
    <Popover>
      <PopoverTrigger className="flex items-center gap-1.5 text-xs uppercase tracking-wide border border-border px-2.5 py-1 hover:bg-muted rounded-sm">
        <span className="text-muted-foreground">Portfolio:</span>
        <span className="font-medium text-foreground">{value}</span>
        <ChevronDown className="h-3 w-3" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        {(["All", ...PORTFOLIO_TYPES] as const).map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted rounded-sm flex items-center justify-between"
          >
            <span>{p === "All" ? "All portfolios" : p}</span>
            {value === p && <Check className="h-3 w-3 text-primary" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function AFPDeepDive() {
  const { date, blkOnly } = useDashboard();

  // Screen-level local AFP filter
  const [afps, setAfps] = useState<AFP[]>([AFPS[0]]);
  const primaryAfp: AFP = afps[0] ?? AFPS[0];

  // Treemap controls
  const [treeBucket, setTreeBucket] = useState<Bucket>("ETF");
  const treeData = useMemo(
    () => getAFPCompositionTree(afps, treeBucket, date),
    [afps, treeBucket, date],
  );

  // Donut controls
  const [donutCats, setDonutCats] = useState<Category[]>([]);
  const donutData = useMemo(
    () => getAfpEtfMfDonut(afps, donutCats, date),
    [afps, donutCats, date],
  );
  const donutTotal = donutData.reduce((a, d) => a + d.value, 0);

  // NNB stacked
  const [nnbBucket, setNnbBucket] = useState<Bucket>("ETF");
  const [nnbPeriod, setNnbPeriod] = useState<"Month" | "YTD">("Month");
  const nnbStacked = useMemo(
    () => getNnbByManagerStacked(afps, nnbPeriod, nnbBucket, date),
    [afps, nnbPeriod, nnbBucket, date],
  );

  // Displacement
  const [matchFilter, setMatchFilter] = useState<MatchType | "All">("All");
  const opps = useMemo(() => getDisplacement(primaryAfp, matchFilter), [primaryAfp, matchFilter]);

  // Positions table
  const [posBucket, setPosBucket] = useState<Bucket>("ETF");
  const [posPortfolio, setPosPortfolio] = useState<PortfolioType | "All">("All");
  const [posSearch, setPosSearch] = useState("");
  const positions = useMemo(
    () => getAfpPositions(afps, posPortfolio, posBucket, date),
    [afps, posPortfolio, posBucket, date],
  );
  const filteredPositions = useMemo(() => {
    const q = posSearch.trim().toLowerCase();
    const filtered = q
      ? positions.filter(
          (p) =>
            p.ticker.toLowerCase().includes(q) ||
            p.name.toLowerCase().includes(q) ||
            p.manager.toLowerCase().includes(q),
        )
      : positions;
    // group by category, sort by AUM desc
    const groups = new Map<Category, typeof filtered>();
    for (const p of filtered) {
      if (!groups.has(p.category)) groups.set(p.category, []);
      groups.get(p.category)!.push(p);
    }
    return [...groups.entries()]
      .map(([cat, items]) => ({
        category: cat,
        items: [...items].sort((a, b) => b.aum - a.aum),
        aum: items.reduce((a, b) => a + b.aum, 0),
      }))
      .sort((a, b) => b.aum - a.aum);
  }, [positions, posSearch]);

  // void unused suppression
  void blkOnly;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">AFP Deep Dive</h1>
          <p className="text-sm text-muted-foreground">
            Portfolio composition, flows and displacement opportunities for the selected AFP(s).
          </p>
        </div>
        <AfpFilterPopover value={afps} onChange={setAfps} label="AFPs" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CardShell
          title="Portfolio Composition"
          subtitle="Manager (Top 5 + Other) → Category. Muted red = another manager dominates that category."
          right={<SegmentedToggle options={BUCKET_TOGGLE} value={treeBucket} onChange={setTreeBucket} />}
          className="lg:col-span-2"
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={treeData}
                dataKey="size"
                stroke="#fff"
                content={<CompositionNode />}
                isAnimationActive={false}
              />
            </ResponsiveContainer>
          </div>
        </CardShell>

        <CardShell
          title="ETF vs Mutual Fund"
          subtitle="AUM split for selected AFP(s)"
          right={<CategoryFilterPopover value={donutCats} onChange={setDonutCats} />}
        >
          <div className="h-80 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, n) => [
                    `${formatUSD(v)} (${formatPct(donutTotal ? v / donutTotal : 0, 1)})`,
                    n,
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={1}
                  isAnimationActive={false}
                  label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {donutData.map((d) => (
                    <Cell key={d.name} fill={d.name === "ETF" ? CHART_COLORS.blk : CHART_COLORS.blkAlt} stroke="#fff" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center flex-col">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</span>
              <span className="text-sm font-semibold tabular-nums">{formatUSD(donutTotal)}</span>
            </div>
          </div>
        </CardShell>
      </div>

      <CardShell
        title="NNB by Manager — Stacked by Category"
        subtitle="Sorted by absolute total NNB"
        right={
          <>
            <SegmentedToggle options={PERIOD_TOGGLE} value={nnbPeriod} onChange={setNnbPeriod} />
            <SegmentedToggle options={BUCKET_TOGGLE} value={nnbBucket} onChange={setNnbBucket} />
          </>
        }
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={nnbStacked}
              layout="vertical"
              margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
              <XAxis type="number" stroke="#999" fontSize={11} tickFormatter={(v) => formatUSD(v)} />
              <YAxis type="category" dataKey="Manager" stroke="#999" fontSize={11} width={100} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number, n) => [formatUSD(v), n]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {CATEGORIES.map((c) => (
                <Bar key={c} dataKey={c} stackId="nnb" fill={categoryColor(c)} isAnimationActive={false} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardShell>

      {/* Displacement Opportunities */}
      <div className="bg-card border border-border rounded-md shadow-sm">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide">Displacement Opportunities</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Competitor positions in {primaryAfp} with BLK alternatives
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Match</span>
            <select
              value={matchFilter}
              onChange={(e) => setMatchFilter(e.target.value as MatchType | "All")}
              className="text-sm border border-border rounded-sm px-3 py-1.5 bg-white"
            >
              <option value="All">All</option>
              {MATCH_TYPES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt">
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-2 font-medium">Competitor</th>
                <th className="px-5 py-2 font-medium">Manager</th>
                <th className="px-5 py-2 font-medium text-right">AUM</th>
                <th className="px-5 py-2 font-medium text-right">Fee</th>
                <th className="px-5 py-2 font-medium">BLK Alternative</th>
                <th className="px-5 py-2 font-medium">Match</th>
                <th className="px-5 py-2 font-medium text-right">Perf Adv.</th>
                <th className="px-5 py-2 font-medium text-right">Fee Adv.</th>
              </tr>
            </thead>
            <tbody>
              {opps.map((r, i) => (
                <tr key={r.Competitor_ISIN + i} className="border-t border-border hover:bg-muted/50">
                  <td className="px-5 py-2.5">{r.Competitor_Name}</td>
                  <td className="px-5 py-2.5 text-muted-foreground">{r.Competitor_Manager}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{formatUSD(r.Competitor_AUM)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{formatBps(r.Competitor_Fee_bps)}</td>
                  <td className="px-5 py-2.5">{r.BLK_Alternative_Name}</td>
                  <td className="px-5 py-2.5"><MatchBadge t={r.Match_Type} /></td>
                  <td
                    className={cn(
                      "px-5 py-2.5 text-right tabular-nums font-medium",
                      r.Perf_Advantage_pct >= 0 ? "text-positive" : "text-negative",
                    )}
                  >
                    {r.Perf_Advantage_pct >= 0 ? "+" : ""}
                    {r.Perf_Advantage_pct.toFixed(2)}%
                  </td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-positive font-medium">
                    -{r.Fee_Advantage_bps} bps
                  </td>
                </tr>
              ))}
              {opps.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-muted-foreground text-sm">
                    No opportunities for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Positions table */}
      <CardShell
        title="Positions"
        subtitle={`Holdings for ${primaryAfp}, grouped by category`}
        right={
          <>
            <SegmentedToggle options={BUCKET_TOGGLE} value={posBucket} onChange={setPosBucket} />
            <PortfolioPicker value={posPortfolio} onChange={setPosPortfolio} />
            <div className="relative">
              <Search className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={posSearch}
                onChange={(e) => setPosSearch(e.target.value)}
                placeholder="Search ticker / manager"
                className="h-7 text-xs pl-7 w-52"
              />
            </div>
          </>
        }
      >
        <div className="overflow-x-auto -mx-5 -mb-5">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt">
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-2 font-medium">{posBucket === "ETF" ? "Ticker" : "Fund Name"}</th>
                <th className="px-5 py-2 font-medium">Manager</th>
                <th className="px-5 py-2 font-medium text-right">AUM Org</th>
                <th className="px-5 py-2 font-medium text-right">% Portfolio</th>
                <th className="px-5 py-2 font-medium text-right">Month NNB</th>
                <th className="px-5 py-2 font-medium text-right">YTD NNB</th>
              </tr>
            </thead>
            <tbody>
              {filteredPositions.map((g) => (
                <Fragment key={g.category}>
                  <tr className="bg-muted/40 border-t border-border">
                    <td colSpan={6} className="px-5 py-1.5 text-[11px] uppercase tracking-wider font-semibold text-foreground">
                      {g.category}
                      <span className="ml-2 text-muted-foreground font-normal normal-case">
                        — {formatUSD(g.aum)} AUM
                      </span>
                    </td>
                  </tr>
                  {g.items.map((p) => (
                    <tr key={`${g.category}-${p.isin}`} className="border-t border-border hover:bg-muted/50">
                      <td className="px-5 py-2 tabular-nums">
                        <span className="font-medium">{posBucket === "ETF" ? p.ticker : p.name}</span>
                        {posBucket === "ETF" && (
                          <span className="ml-2 text-muted-foreground text-xs">{p.name}</span>
                        )}
                      </td>
                      <td className="px-5 py-2 text-muted-foreground">{p.manager}</td>
                      <td className="px-5 py-2 text-right tabular-nums">{formatUSD(p.aum)}</td>
                      <td className="px-5 py-2 text-right tabular-nums">{formatPct(p.weight, 2)}</td>
                      <td
                        className={cn(
                          "px-5 py-2 text-right tabular-nums",
                          p.monthNnb < 0 && "text-negative",
                        )}
                      >
                        {formatUSD(p.monthNnb)}
                      </td>
                      <td
                        className={cn(
                          "px-5 py-2 text-right tabular-nums",
                          p.ytdNnb < 0 && "text-negative",
                        )}
                      >
                        {formatUSD(p.ytdNnb)}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
              {filteredPositions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground text-sm">
                    No positions for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardShell>
    </div>
  );
}

function MatchBadge({ t }: { t: MatchType }) {
  const cls =
    t === "Direct"
      ? "bg-primary/10 text-primary border-primary/30"
      : t === "Close"
        ? "bg-foreground/5 text-foreground border-foreground/30"
        : "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={cn("rounded-sm font-medium uppercase text-[10px]", cls)}>
      {t}
    </Badge>
  );
}

interface CompositionNodeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  manager?: string;
  category?: string;
  depth?: number;
  isBLK?: boolean;
  dominant?: boolean;
}

function CompositionNode(props: CompositionNodeProps) {
  const { x = 0, y = 0, width = 0, height = 0, name, manager, depth, isBLK, dominant } = props;
  if (depth === 0) return null;

  // Top-level (manager) cells: rendered as containers (no fill — children fill)
  if (depth === 1) {
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill="none" stroke="#fff" strokeWidth={3} />
        {width > 80 && height > 22 && (
          <text x={x + 6} y={y + 14} fill="#333" fontSize={11} fontWeight={600}>
            {name}
          </text>
        )}
      </g>
    );
  }

  // Leaf (category) cells
  let fill: string;
  if (isBLK) {
    fill = dominant ? "color-mix(in oklab, hsl(var(--destructive, 0 70% 50%)) 55%, white)" : CHART_COLORS.blk;
    // fallback for browsers without --destructive token availability
    if (dominant) fill = "rgba(217, 48, 37, 0.55)";
  } else {
    fill = managerColor(manager as Manager) || brandColor(manager ?? "Other");
  }

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#fff" strokeWidth={1.5} />
      {width > 60 && height > 24 && (
        <text x={x + 6} y={y + 16} fill="#fff" fontSize={11} fontWeight={500}>
          {name}
        </text>
      )}
    </g>
  );
}