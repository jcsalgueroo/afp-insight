import { Fragment, createContext, useContext, useMemo, useState } from "react";
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
  ReferenceLine,
} from "recharts";
import { Check, ChevronDown, ChevronRight, Search } from "lucide-react";
import {
  AFPS,
  CHART_COLORS,
  MATCH_TYPES,
  PORTFOLIO_TYPES,
  categoryColor,
  categoryAssetClass,
  categoryOfIsin,
  formatBps,
  formatPct,
  formatUSD,
  getAfpCompositionFlat,
  getAfpCompositionDonut,
  getAfpCompositionLeafDonut,
  getAfpPositions,
  getDisplacement,
  getNnbByManagerStacked,
  type AFP,
  type Bucket,
  type Category,
  type MatchType,
  type PortfolioType,
  type DisplacementRow,
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

const DIMENSION_TOGGLE = [
  { value: "Manager" as const, label: "By Manager" },
  { value: "Category" as const, label: "By Category" },
] as const;

const ASSET_CLASS_TOGGLE = [
  { value: "All" as const, label: "All" },
  { value: "Equity" as const, label: "Equity" },
  { value: "Fixed Income" as const, label: "Fixed Income" },
  { value: "Money Market" as const, label: "MM" },
] as const;
type AssetClassFilter = (typeof ASSET_CLASS_TOGGLE)[number]["value"];

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

// (CategoryFilterPopover removed — donut overlay derives from current treemap scope)

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

  // Composition treemap controls
  const [treeBucket, setTreeBucket] = useState<Bucket>("ETF");
  const [treeDim, setTreeDim] = useState<"Manager" | "Category">("Manager");
  const treeData = useMemo(
    () => getAfpCompositionFlat(afps, treeBucket, treeDim, date),
    [afps, treeBucket, treeDim, date],
  );
  const donutData = useMemo(
    () => getAfpCompositionDonut(afps, treeBucket, treeDim, date),
    [afps, treeBucket, treeDim, date],
  );
  const donutTotal = donutData.items.reduce((a, d) => a + d.value, 0);

  // NNB stacked
  const [nnbBucket, setNnbBucket] = useState<Bucket>("ETF");
  const [nnbPeriod, setNnbPeriod] = useState<"Month" | "YTD">("Month");
  const nnbStacked = useMemo(
    () => getNnbByManagerStacked(afps, nnbPeriod, nnbBucket, date),
    [afps, nnbPeriod, nnbBucket, date],
  );
  // Pre-split categories into pos/neg keys for diverging stacked bar.
  const nnbDivData = useMemo(() => {
    return nnbStacked.data.map((row) => {
      const out: Record<string, number | string> = { Manager: row.Manager, total: row.total };
      for (const c of nnbStacked.categories) {
        const v = (row[c] as number) ?? 0;
        out[`${c}__pos`] = v > 0 ? v : 0;
        out[`${c}__neg`] = v < 0 ? v : 0;
      }
      return out;
    });
  }, [nnbStacked]);

  // Displacement
  const [matchFilter, setMatchFilter] = useState<MatchType | "All">("All");
  const opps = useMemo(() => getDisplacement(primaryAfp, matchFilter), [primaryAfp, matchFilter]);
  const dispGroups = useMemo(() => groupDisplacement(opps), [opps]);
  const [openAC, setOpenAC] = useState<Set<string>>(new Set());
  const [openCat, setOpenCat] = useState<Set<string>>(new Set());
  const toggleSet = (s: Set<string>, key: string, setter: (n: Set<string>) => void) => {
    const n = new Set(s);
    if (n.has(key)) n.delete(key);
    else n.add(key);
    setter(n);
  };

  // Positions table
  const [posBucket, setPosBucket] = useState<Bucket>("ETF");
  const [posAssetClass, setPosAssetClass] = useState<AssetClassFilter>("All");
  const [posPortfolio, setPosPortfolio] = useState<PortfolioType | "All">("All");
  const [posSearch, setPosSearch] = useState("");
  const [openPosCat, setOpenPosCat] = useState<Set<Category>>(new Set());
  const positions = useMemo(
    () => getAfpPositions(afps, posPortfolio, posBucket, date),
    [afps, posPortfolio, posBucket, date],
  );
  const filteredPositions = useMemo(() => {
    const q = posSearch.trim().toLowerCase();
    const byAsset =
      posAssetClass === "All"
        ? positions
        : positions.filter((p) => categoryAssetClass(p.category) === posAssetClass);
    const filtered = q
      ? byAsset.filter(
          (p) =>
            p.ticker.toLowerCase().includes(q) ||
            p.name.toLowerCase().includes(q) ||
            p.manager.toLowerCase().includes(q),
        )
      : byAsset;
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
  }, [positions, posSearch, posAssetClass]);

  // When searching, auto-expand any category with matches.
  const expandedPosCats = useMemo(() => {
    if (posSearch.trim()) return new Set(filteredPositions.map((g) => g.category));
    return openPosCat;
  }, [posSearch, filteredPositions, openPosCat]);

  // void unused suppression
  void blkOnly;

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">AFP Deep Dive</h1>
          <p className="text-sm text-muted-foreground">
            Portfolio composition, flows and displacement opportunities for the selected AFP(s).
          </p>
        </div>
        <AfpFilterPopover value={afps} onChange={setAfps} label="AFPs" />
      </div>

      <CardShell
        title="Portfolio Composition"
        subtitle={`Treemap of selected AFP(s) — ${treeDim === "Manager" ? "by manager" : "by category"}. Hover the chart to see the ${treeDim === "Manager" ? "top 5 categories" : "top 5 managers"} + Others.`}
        right={
          <>
            <SegmentedToggle options={DIMENSION_TOGGLE} value={treeDim} onChange={setTreeDim} />
            <SegmentedToggle options={BUCKET_TOGGLE} value={treeBucket} onChange={setTreeBucket} />
          </>
        }
      >
        <div className="h-80 relative group">
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={treeData}
              dataKey="size"
              stroke="#fff"
              content={<FlatNode />}
              isAnimationActive={false}
            />
          </ResponsiveContainer>
          {/* Hover donut overlay */}
          <div className="pointer-events-none absolute top-3 right-3 w-56 h-56 rounded-md bg-card/95 border border-border shadow-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-1 pb-1">
              Top 5 {donutData.dimension === "Manager" ? "Managers" : "Categories"} + Others
            </div>
            <div className="relative w-full h-[calc(100%-1.25rem)]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData.items}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={64}
                    paddingAngle={1}
                    isAnimationActive={false}
                  >
                    {donutData.items.map((d) => (
                      <Cell key={d.name} fill={d.fill} stroke="#fff" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Total</span>
                <span className="text-[11px] font-semibold tabular-nums">{formatUSD(donutTotal)}</span>
              </div>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
              {donutData.items.map((d) => (
                <div key={d.name} className="flex items-center gap-1 truncate">
                  <span className="inline-block w-2 h-2 rounded-sm shrink-0" style={{ background: d.fill }} />
                  <span className="truncate">{d.name}</span>
                  <span className="ml-auto tabular-nums text-muted-foreground">
                    {formatPct(donutTotal ? d.value / donutTotal : 0, 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardShell>

      <CardShell
        title="NNB by Manager — Diverging by Category"
        subtitle="Positive flows extend right of zero, negative flows left. Hover a manager for the breakdown."
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
              data={nnbDivData}
              layout="vertical"
              margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
              <XAxis type="number" stroke="#999" fontSize={11} tickFormatter={(v) => formatUSD(v)} />
              <YAxis type="category" dataKey="Manager" stroke="#999" fontSize={11} width={100} />
              <ReferenceLine x={0} stroke="#666" />
              <Tooltip
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                contentStyle={tooltipStyle}
                content={<NnbTooltip categories={nnbStacked.categories} />}
              />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                payload={nnbStacked.categories.map((c) => ({
                  value: c,
                  type: "square",
                  id: c,
                  color: categoryColor(c),
                }))}
              />
              {nnbStacked.categories.map((c) => (
                <Bar key={`${c}__pos`} dataKey={`${c}__pos`} stackId="pos" fill={categoryColor(c)} isAnimationActive={false} />
              ))}
              {nnbStacked.categories.map((c) => (
                <Bar key={`${c}__neg`} dataKey={`${c}__neg`} stackId="neg" fill={categoryColor(c)} isAnimationActive={false} />
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
              Competitor positions in {primaryAfp} with BLK alternatives — grouped by Asset Class → Category
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
              {dispGroups.map((ac) => {
                const acOpen = openAC.has(ac.assetClass);
                return (
                  <Fragment key={ac.assetClass}>
                    <tr
                      className="bg-muted/60 border-t border-border cursor-pointer hover:bg-muted"
                      onClick={() => toggleSet(openAC, ac.assetClass, setOpenAC)}
                    >
                      <td colSpan={8} className="px-3 py-2 text-[11px] uppercase tracking-wider font-semibold">
                        <span className="inline-flex items-center gap-1.5">
                          {acOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          {ac.assetClass}
                          <span className="ml-2 normal-case font-normal text-muted-foreground">
                            — {ac.count} opp{ac.count === 1 ? "" : "s"} · {formatUSD(ac.aum)} AUM
                          </span>
                        </span>
                      </td>
                    </tr>
                    {acOpen &&
                      ac.categories.map((cg) => {
                        const key = `${ac.assetClass}::${cg.category}`;
                        const catOpen = openCat.has(key);
                        return (
                          <Fragment key={key}>
                            <tr
                              className="bg-muted/30 border-t border-border cursor-pointer hover:bg-muted/50"
                              onClick={() => toggleSet(openCat, key, setOpenCat)}
                            >
                              <td colSpan={8} className="px-8 py-1.5 text-[11px] uppercase tracking-wider">
                                <span className="inline-flex items-center gap-1.5">
                                  {catOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                  {cg.category}
                                  <span className="ml-2 normal-case text-muted-foreground">
                                    — {cg.rows.length} · {formatUSD(cg.aum)}
                                  </span>
                                </span>
                              </td>
                            </tr>
                            {catOpen &&
                              cg.rows.map((r, i) => (
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
                          </Fragment>
                        );
                      })}
                  </Fragment>
                );
              })}
              {dispGroups.length === 0 && (
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
            <SegmentedToggle options={ASSET_CLASS_TOGGLE} value={posAssetClass} onChange={setPosAssetClass} />
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
              {filteredPositions.map((g) => {
                const open = expandedPosCats.has(g.category);
                return (
                <Fragment key={g.category}>
                  <tr
                    className="bg-muted/40 border-t border-border cursor-pointer hover:bg-muted/60"
                    onClick={() => toggleSet(openPosCat, g.category, (n) => setOpenPosCat(n as Set<Category>))}
                  >
                    <td colSpan={6} className="px-5 py-1.5 text-[11px] uppercase tracking-wider font-semibold text-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        {g.category}
                        <span className="ml-2 text-muted-foreground font-normal normal-case">
                          — {g.items.length} position{g.items.length === 1 ? "" : "s"} · {formatUSD(g.aum)} AUM
                        </span>
                      </span>
                    </td>
                  </tr>
                  {open && g.items.map((p) => (
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
                );
              })}
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

interface FlatNodeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  fill?: string;
  depth?: number;
}

function FlatNode(props: FlatNodeProps) {
  const { x = 0, y = 0, width = 0, height = 0, name, fill = CHART_COLORS.competitor, depth } = props;
  if (depth === 0) return null;
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

// ---------- Helpers ----------

interface DispCatGroup {
  category: Category;
  rows: DisplacementRow[];
  aum: number;
}
interface DispAssetGroup {
  assetClass: string;
  categories: DispCatGroup[];
  count: number;
  aum: number;
}

function groupDisplacement(rows: DisplacementRow[]): DispAssetGroup[] {
  const byAC = new Map<string, Map<Category, DisplacementRow[]>>();
  for (const r of rows) {
    const cat = (categoryOfIsin(r.Competitor_ISIN) as Category) || "Other";
    const ac = categoryAssetClass(cat) || "Other";
    if (!byAC.has(ac)) byAC.set(ac, new Map());
    const m = byAC.get(ac)!;
    if (!m.has(cat)) m.set(cat, []);
    m.get(cat)!.push(r);
  }
  return [...byAC.entries()]
    .map(([assetClass, catMap]) => {
      const categories: DispCatGroup[] = [...catMap.entries()]
        .map(([category, rs]) => ({
          category,
          rows: rs,
          aum: rs.reduce((a, b) => a + b.Competitor_AUM, 0),
        }))
        .sort((a, b) => b.aum - a.aum);
      return {
        assetClass,
        categories,
        count: categories.reduce((a, c) => a + c.rows.length, 0),
        aum: categories.reduce((a, c) => a + c.aum, 0),
      };
    })
    .sort((a, b) => b.aum - a.aum);
}

interface NnbTooltipProps {
  active?: boolean;
  label?: string;
  payload?: Array<{ payload?: Record<string, number | string> }>;
  categories: string[];
}

function NnbTooltip({ active, payload, categories }: NnbTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const manager = String(row.Manager ?? "");
  const breakdown = categories
    .map((c) => {
      const pos = (row[`${c}__pos`] as number) ?? 0;
      const neg = (row[`${c}__neg`] as number) ?? 0;
      return { category: c, value: pos + neg };
    })
    .filter((x) => x.value !== 0)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const net = breakdown.reduce((a, b) => a + b.value, 0);
  return (
    <div className="bg-card border border-border rounded-sm shadow-md p-2.5 text-xs min-w-[220px]">
      <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-border">
        <span className="font-semibold">{manager}</span>
        <span className={cn("tabular-nums font-semibold", net < 0 ? "text-negative" : "text-positive")}>
          {net >= 0 ? "+" : ""}{formatUSD(net)}
        </span>
      </div>
      <div className="pt-1.5 space-y-0.5">
        {breakdown.map((b) => (
          <div key={b.category} className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-sm shrink-0" style={{ background: categoryColor(b.category) }} />
            <span className="truncate">{b.category}</span>
            <span className={cn("ml-auto tabular-nums", b.value < 0 ? "text-negative" : "text-foreground")}>
              {b.value >= 0 ? "+" : ""}{formatUSD(b.value)}
            </span>
          </div>
        ))}
        {breakdown.length === 0 && <div className="text-muted-foreground">No flows.</div>}
      </div>
    </div>
  );
}