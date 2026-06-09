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
  PORTFOLIO_TYPES,
  categoryColor,
  categoryAssetClass,
  formatBps,
  formatPct,
  formatUSD,
  getAfpCompositionFlat,
  getAfpCompositionDonut,
  getAfpCompositionLeafDonut,
  getAfpPositions,
  getNnbByManagerStacked,
  type AFP,
  type Bucket,
  type Category,
  type PortfolioType,
} from "@/lib/mock-data";
import { useDashboard } from "@/lib/dashboard-store";
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
  const treeTotal = useMemo(
    () => treeData.reduce((a, d) => a + d.size, 0),
    [treeData],
  );
  const [hoveredLeaf, setHoveredLeaf] = useState<string | null>(null);
  const aggregateDonut = useMemo(
    () => getAfpCompositionDonut(afps, treeBucket, treeDim, date),
    [afps, treeBucket, treeDim, date],
  );
  const leafDonut = useMemo(
    () =>
      hoveredLeaf
        ? getAfpCompositionLeafDonut(afps, treeBucket, treeDim, hoveredLeaf, date)
        : null,
    [afps, treeBucket, treeDim, hoveredLeaf, date],
  );
  const donutData = leafDonut ?? aggregateDonut;
  const donutTotal = donutData.items.reduce((a, d) => a + d.value, 0);
  const donutTitle = hoveredLeaf
    ? `${hoveredLeaf} — Top 5 ${donutData.dimension === "Manager" ? "Managers" : "Categories"} + Others`
    : `Top 5 ${donutData.dimension === "Manager" ? "Managers" : "Categories"} + Others`;

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

  // Positions table
  const [posBucket, setPosBucket] = useState<Bucket>("ETF");
  const [posAssetClass, setPosAssetClass] = useState<AssetClassFilter>("All");
  const [posPortfolio, setPosPortfolio] = useState<PortfolioType | "All">("All");
  const [posSearch, setPosSearch] = useState("");
  const [posFlowMetric, setPosFlowMetric] = useState<"NNB" | "NNBF">("NNB");
  const [openPosCat, setOpenPosCat] = useState<Set<Category>>(new Set());
  const toggleSet = (s: Set<string>, key: string, setter: (n: Set<string>) => void) => {
    const n = new Set(s);
    if (n.has(key)) n.delete(key);
    else n.add(key);
    setter(n);
  };
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
        monthNnb: items.reduce((a, b) => a + (b.monthNnb ?? 0), 0),
        ytdNnb: items.reduce((a, b) => a + (b.ytdNnb ?? 0), 0),
        monthNnbf: items.reduce((a, b) => a + (b.monthNnbf ?? 0), 0),
        ytdNnbf: items.reduce((a, b) => a + (b.ytdNnbf ?? 0), 0),
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
        <div className="h-80 relative">
          <TreemapHoverContext.Provider value={{ total: treeTotal, setHovered: setHoveredLeaf }}>
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={treeData}
                dataKey="size"
                stroke="#fff"
                content={<FlatNode />}
                isAnimationActive={false}
              />
            </ResponsiveContainer>
          </TreemapHoverContext.Provider>
          {/* Hover donut overlay */}
          {hoveredLeaf && donutData.items.length > 0 && (
            <div className="pointer-events-none absolute top-3 right-3 w-72 max-w-[calc(100%-1.5rem)] rounded-md bg-card/95 border border-border shadow-lg p-2.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground pb-1.5 truncate">
                {donutTitle}
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-28 h-28 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData.items}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={28}
                        outerRadius={54}
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
                    <span className="text-[10px] font-semibold tabular-nums">{formatUSD(donutTotal)}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-0.5 text-[10px]">
                  {donutData.items.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-sm shrink-0" style={{ background: d.fill }} />
                      <span className="truncate">{d.name}</span>
                      <span className="ml-auto tabular-nums text-muted-foreground shrink-0">
                        {formatPct(donutTotal ? d.value / donutTotal : 0, 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
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

      {/* Positions table */}
      <CardShell
        title="Positions"
        subtitle={`Holdings for ${primaryAfp}, grouped by category`}
        right={
          <>
            <SegmentedToggle options={BUCKET_TOGGLE} value={posBucket} onChange={setPosBucket} />
            <SegmentedToggle options={ASSET_CLASS_TOGGLE} value={posAssetClass} onChange={setPosAssetClass} />
            <SegmentedToggle
              options={[
                { value: "NNB" as const, label: "NNB" },
                { value: "NNBF" as const, label: "NNBF" },
              ]}
              value={posFlowMetric}
              onChange={setPosFlowMetric}
            />
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
                <th className="px-5 py-2 font-medium text-right">Month {posFlowMetric}</th>
                <th className="px-5 py-2 font-medium text-right">YTD {posFlowMetric}</th>
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
                    <td colSpan={4} className="px-5 py-1.5 text-[11px] uppercase tracking-wider font-semibold text-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        {g.category}
                        <span className="ml-2 text-muted-foreground font-normal normal-case">
                          — {g.items.length} position{g.items.length === 1 ? "" : "s"} · {formatUSD(g.aum)} AUM
                        </span>
                      </span>
                    </td>
                    {(() => {
                      const monthSub = posFlowMetric === "NNB" ? g.monthNnb : g.monthNnbf;
                      const ytdSub = posFlowMetric === "NNB" ? g.ytdNnb : g.ytdNnbf;
                      return (
                        <>
                          <td className={cn("px-5 py-1.5 text-right tabular-nums text-[11px] font-semibold", monthSub < 0 && "text-negative")}>
                            {formatUSD(monthSub)}
                          </td>
                          <td className={cn("px-5 py-1.5 text-right tabular-nums text-[11px] font-semibold", ytdSub < 0 && "text-negative")}>
                            {formatUSD(ytdSub)}
                          </td>
                        </>
                      );
                    })()}
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
                      {(() => {
                        const monthVal = posFlowMetric === "NNB" ? p.monthNnb : p.monthNnbf;
                        const ytdVal = posFlowMetric === "NNB" ? p.ytdNnb : p.ytdNnbf;
                        return (
                          <>
                            <td className={cn("px-5 py-2 text-right tabular-nums", monthVal < 0 && "text-negative")}>
                              {formatUSD(monthVal)}
                            </td>
                            <td className={cn("px-5 py-2 text-right tabular-nums", ytdVal < 0 && "text-negative")}>
                              {formatUSD(ytdVal)}
                            </td>
                          </>
                        );
                      })()}
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

interface FlatNodeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  fill?: string;
  depth?: number;
  size?: number;
}

const TreemapHoverContext = createContext<{
  total: number;
  setHovered: (n: string | null) => void;
}>({ total: 0, setHovered: () => {} });

function FlatNode(props: FlatNodeProps) {
  const { x = 0, y = 0, width = 0, height = 0, name, fill = CHART_COLORS.competitor, depth, size = 0 } = props;
  const { total, setHovered } = useContext(TreemapHoverContext);
  if (depth === 0) return null;
  const pct = total > 0 ? size / total : 0;
  return (
    <g
      onMouseEnter={() => name && setHovered(name)}
      onMouseLeave={() => setHovered(null)}
    >
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#fff" strokeWidth={1.5} />
      {width > 60 && height > 24 && (
        <text x={x + 6} y={y + 16} fill="#fff" fontSize={11} fontWeight={500}>
          {name}
        </text>
      )}
      {width > 40 && height > 28 && (
        <text
          x={x + width - 6}
          y={y + height - 6}
          fill="#fff"
          fontSize={10}
          fontWeight={600}
          textAnchor="end"
        >
          {formatPct(pct, pct < 0.1 ? 1 : 0)}
        </text>
      )}
    </g>
  );
}

// ---------- Helpers ----------

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
  const all = categories
    .map((c) => {
      const pos = (row[`${c}__pos`] as number) ?? 0;
      const neg = (row[`${c}__neg`] as number) ?? 0;
      return { category: c, value: pos + neg };
    })
    .filter((x) => x.value !== 0);
  const positives = all.filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
  const negatives = all.filter((x) => x.value < 0).sort((a, b) => b.value - a.value);
  const breakdown = [...positives, ...negatives];
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