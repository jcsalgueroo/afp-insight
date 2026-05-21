import { useMemo, useState } from "react";
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
import { Check, ChevronDown } from "lucide-react";
import {
  AFPS,
  CHART_COLORS,
  MANAGERS,
  afpColor,
  formatBps,
  formatPct,
  formatUSD,
  getManagerAfpCategoryDonut,
  getManagerAfpTer,
  getManagerAfpTopProducts,
  getManagerAumByAfp,
  getManagerMonthlyByAfp,
  getManagerNnbByCategoryByAfp,
  getManagerRrrCompositionMonthly,
  getManagerSecurityByAfp,
  getManagerTopBottomSecurities,
  type AFP,
  type Manager,
} from "@/lib/mock-data";
import { useDashboard } from "@/lib/dashboard-store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SegmentedToggle } from "@/components/widgets/SegmentedToggle";
import { cn } from "@/lib/utils";

const PERIOD_TOGGLE = [
  { value: "Month" as const, label: "Month" },
  { value: "YTD" as const, label: "YTD" },
] as const;

const ASSET_CLASS_TOGGLE_3 = [
  { value: "All" as const, label: "All" },
  { value: "Equity" as const, label: "Equity" },
  { value: "Fixed Income" as const, label: "Fixed Income" },
] as const;

const EQ_FI_TOGGLE = [
  { value: "All" as const, label: "All" },
  { value: "Equity" as const, label: "Equity" },
  { value: "Fixed Income" as const, label: "Fixed Income" },
] as const;
type AcFilter = "All" | "Equity" | "Fixed Income";

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

function ManagerPicker({
  value,
  onChange,
}: {
  value: Manager;
  onChange: (m: Manager) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger className="flex items-center gap-1.5 text-xs uppercase tracking-wide border border-border px-2.5 py-1 hover:bg-muted rounded-sm">
        <span className="text-muted-foreground">Manager:</span>
        <span className="font-medium text-foreground">{value}</span>
        <ChevronDown className="h-3 w-3" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        {MANAGERS.map((m) => (
          <button
            key={m}
            onClick={() => onChange(m)}
            className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted rounded-sm flex items-center justify-between"
          >
            <span>{m}</span>
            {value === m && <Check className="h-3 w-3 text-primary" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// Custom treemap node renders fill by AFP and emits hover callbacks.
function TreeNode(props: any) {
  const { x, y, width, height, name, fill, onHover } = props;
  if (width <= 0 || height <= 0) return null;
  return (
    <g
      onMouseEnter={() => onHover?.(name)}
      onMouseLeave={() => onHover?.(null)}
    >
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#fff" />
      {width > 60 && height > 24 && (
        <text x={x + 8} y={y + 18} fill="#fff" fontSize={12} fontWeight={600}>
          {name}
        </text>
      )}
    </g>
  );
}

export function ManagerDeepDive() {
  const { date } = useDashboard();
  const defaultManager: Manager =
    MANAGERS.find((m) => m === "BlackRock") ?? MANAGERS[0] ?? "BlackRock";
  const [manager, setManager] = useState<Manager>(defaultManager);

  // 1. Treemap data + hover
  const treeData = useMemo(() => getManagerAumByAfp(manager, date), [manager, date]);
  const [hoveredAfp, setHoveredAfp] = useState<AFP | null>(null);
  const hoverDonut = useMemo(
    () => (hoveredAfp ? getManagerAfpCategoryDonut(manager, hoveredAfp, date) : null),
    [manager, hoveredAfp, date],
  );
  const hoverTop = useMemo(
    () => (hoveredAfp ? getManagerAfpTopProducts(manager, hoveredAfp, date, 5) : []),
    [manager, hoveredAfp, date],
  );
  const hoverTer = useMemo(
    () => (hoveredAfp ? getManagerAfpTer(manager, hoveredAfp, date) : 0),
    [manager, hoveredAfp, date],
  );
  const hoverTopTotal = hoverTop.reduce((a, b) => a + b.aum, 0);
  const donutTotal = hoverDonut?.reduce((a, b) => a + b.value, 0) ?? 0;

  // 2. NNB by category
  const [nnbPeriod, setNnbPeriod] = useState<"Month" | "YTD">("Month");
  const [nnbAc, setNnbAc] = useState<AcFilter>("All");
  const nnbCatData = useMemo(
    () => getManagerNnbByCategoryByAfp(manager, nnbPeriod, nnbAc, date),
    [manager, nnbPeriod, nnbAc, date],
  );

  // 3 & 4. Top/Bottom securities
  const [nnbSecPeriod, setNnbSecPeriod] = useState<"Month" | "YTD">("Month");
  const [nnbSecAc, setNnbSecAc] = useState<AcFilter>("All");
  const nnbSec = useMemo(
    () => getManagerTopBottomSecurities(manager, "NNB", nnbSecPeriod, nnbSecAc, date),
    [manager, nnbSecPeriod, nnbSecAc, date],
  );
  const [nnbfSecPeriod, setNnbfSecPeriod] = useState<"Month" | "YTD">("Month");
  const [nnbfSecAc, setNnbfSecAc] = useState<AcFilter>("All");
  const nnbfSec = useMemo(
    () => getManagerTopBottomSecurities(manager, "NNBF", nnbfSecPeriod, nnbfSecAc, date),
    [manager, nnbfSecPeriod, nnbfSecAc, date],
  );

  // 5 & 6. Monthly AUM/RRR by AFP
  const aumMonthly = useMemo(() => getManagerMonthlyByAfp(manager, "AUM_USD"), [manager]);
  const rrrMonthly = useMemo(() => getManagerMonthlyByAfp(manager, "RRR_USD"), [manager]);

  // 7. RRR composition by product
  const rrrComp = useMemo(() => getManagerRrrCompositionMonthly(manager), [manager]);
  const rrrCompKeys = useMemo(() => {
    const s = new Set<string>();
    for (const row of rrrComp.data) {
      for (const k of Object.keys(row)) {
        if (k === "m" || k === "__others") continue;
        s.add(k);
      }
    }
    return [...s];
  }, [rrrComp]);
  // Stable color palette keyed by ISIN index.
  const RRR_PALETTE = [
    "#00B140",
    "#FFA500",
    "#FFD700",
    "#32CD32",
    "#9ACD32",
    "#FF8C00",
    "#1F7A3A",
    "#FFB347",
    "#BFEA3A",
    "#E6C200",
    "#7AC74F",
    "#D9A441",
  ];
  const rrrColor = (isin: string) => {
    const idx = rrrCompKeys.indexOf(isin);
    return RRR_PALETTE[(idx >= 0 ? idx : 0) % RRR_PALETTE.length];
  };

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Manager Deep Dive</h1>
          <p className="text-sm text-muted-foreground">
            AUM, flows and revenue analytics for the selected manager across AFPs.
          </p>
        </div>
        <ManagerPicker value={manager} onChange={setManager} />
      </div>

      {/* 1. AUM treemap by AFP with hover card */}
      <CardShell
        title="AUM by AFP"
        subtitle={`Treemap of ${manager} AUM broken down by AFP at ${date || "selected date"}. Hover an AFP for details.`}
      >
        <div className="h-80 relative">
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={treeData}
              dataKey="size"
              stroke="#fff"
              isAnimationActive={false}
              content={<TreeNode onHover={(a: AFP | null) => setHoveredAfp(a)} />}
            />
          </ResponsiveContainer>

          {hoveredAfp && (
            <div className="pointer-events-none absolute top-3 right-3 w-80 max-w-[calc(100%-1.5rem)] rounded-md bg-card/95 border border-border shadow-lg p-3 space-y-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {manager} × {hoveredAfp}
              </div>

              {/* Donut by Category */}
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  AUM by Category
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-24 h-24 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={hoverDonut ?? []}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={24}
                          outerRadius={46}
                          paddingAngle={1}
                          isAnimationActive={false}
                        >
                          {(hoverDonut ?? []).map((d) => (
                            <Cell key={d.name} fill={d.fill} stroke="#fff" />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                        Total
                      </span>
                      <span className="text-[10px] font-semibold tabular-nums">
                        {formatUSD(donutTotal)}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5 text-[10px]">
                    {(hoverDonut ?? []).map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5">
                        <span
                          className="inline-block w-2 h-2 rounded-sm shrink-0"
                          style={{ background: d.fill }}
                        />
                        <span className="truncate">{d.name}</span>
                        <span className="ml-auto tabular-nums text-muted-foreground shrink-0">
                          {formatPct(donutTotal ? d.value / donutTotal : 0, 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top 5 products */}
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Top 5 Products by AUM
                </div>
                <div className="flex flex-col gap-0.5 text-[10px]">
                  {hoverTop.map((p) => (
                    <div key={p.isin} className="flex items-center gap-1.5">
                      <span className="font-medium truncate">{p.label}</span>
                      <span className="ml-auto tabular-nums text-muted-foreground shrink-0">
                        {formatUSD(p.aum)}
                      </span>
                    </div>
                  ))}
                  {hoverTop.length === 0 && (
                    <span className="text-muted-foreground italic">No positions</span>
                  )}
                </div>
              </div>

              {/* AUM-weighted TER */}
              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  AUM-weighted TER
                </span>
                <span className="text-xs font-semibold tabular-nums">
                  {hoverTopTotal > 0 ? formatBps(hoverTer) : "—"}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardShell>

      {/* 2. NNB by category */}
      <CardShell
        title="NNB by Category"
        subtitle={`Per category × AFP for ${manager} at ${date || "selected date"}`}
        right={
          <>
            <SegmentedToggle options={EQ_FI_TOGGLE} value={nnbAc} onChange={setNnbAc} />
            <SegmentedToggle options={PERIOD_TOGGLE} value={nnbPeriod} onChange={setNnbPeriod} />
          </>
        }
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={nnbCatData} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis
                dataKey="category"
                stroke="#999"
                fontSize={11}
                angle={-20}
                textAnchor="end"
                interval={0}
                height={50}
              />
              <YAxis stroke="#999" fontSize={11} tickFormatter={(v) => formatUSD(v)} />
              <ReferenceLine y={0} stroke="#666" />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => formatUSD(v)}
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {AFPS.map((a) => (
                <Bar key={a} dataKey={a} fill={afpColor(a)} isAnimationActive={false} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardShell>

      {/* 3 & 4. Top/Bottom securities */}
      <div className="grid lg:grid-cols-2 gap-6">
        <TopBottomCard
          title={`Top 5 / Bottom 5 Securities — NNB`}
          manager={manager}
          date={date}
          metric="NNB"
          period={nnbSecPeriod}
          setPeriod={setNnbSecPeriod}
          assetClass={nnbSecAc}
          setAssetClass={setNnbSecAc}
          top={nnbSec.top}
          bottom={nnbSec.bottom}
        />
        <TopBottomCard
          title={`Top 5 / Bottom 5 Securities — NNBF`}
          manager={manager}
          date={date}
          metric="NNBF"
          period={nnbfSecPeriod}
          setPeriod={setNnbfSecPeriod}
          assetClass={nnbfSecAc}
          setAssetClass={setNnbfSecAc}
          top={nnbfSec.top}
          bottom={nnbfSec.bottom}
        />
      </div>

      {/* 5. AUM Org monthly by AFP */}
      <CardShell
        title="AUM Org by Month"
        subtitle={`${manager} AUM by month, stacked by AFP`}
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={aumMonthly} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="m" stroke="#999" fontSize={11} />
              <YAxis stroke="#999" fontSize={11} tickFormatter={(v) => formatUSD(v)} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => formatUSD(v)}
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {AFPS.map((a) => (
                <Bar
                  key={a}
                  dataKey={a}
                  stackId="aum"
                  fill={afpColor(a)}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardShell>

      {/* 6. RRR Org monthly by AFP */}
      <CardShell
        title="RRR Org by Month"
        subtitle={`${manager} RRR by month, stacked by AFP`}
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rrrMonthly} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="m" stroke="#999" fontSize={11} />
              <YAxis stroke="#999" fontSize={11} tickFormatter={(v) => formatUSD(v)} />
              <ReferenceLine y={0} stroke="#666" />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => formatUSD(v)}
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {AFPS.map((a) => (
                <Bar
                  key={a}
                  dataKey={a}
                  stackId="rrr"
                  fill={afpColor(a)}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardShell>

      {/* 7. RRR composition by product */}
      <CardShell
        title="RRR Org Composition by Product"
        subtitle={`Top 5 contributors per month + Others — ${manager}`}
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rrrComp.data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="m" stroke="#999" fontSize={11} />
              <YAxis stroke="#999" fontSize={11} tickFormatter={(v) => formatUSD(v)} />
              <ReferenceLine y={0} stroke="#666" />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number, name: string) => [
                  formatUSD(v),
                  name === "__others"
                    ? "Others"
                    : rrrComp.productLabels.get(name) ?? name,
                ]}
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                formatter={(name) =>
                  name === "__others"
                    ? "Others"
                    : rrrComp.productLabels.get(name as string) ?? (name as string)
                }
              />
              {rrrCompKeys.map((isin) => (
                <Bar
                  key={isin}
                  dataKey={isin}
                  stackId="rrrp"
                  fill={rrrColor(isin)}
                  isAnimationActive={false}
                />
              ))}
              <Bar
                dataKey="__others"
                stackId="rrrp"
                fill={CHART_COLORS.competitor}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardShell>
    </div>
  );
}

function TopBottomCard({
  title,
  manager,
  date,
  metric,
  period,
  setPeriod,
  assetClass,
  setAssetClass,
  top,
  bottom,
}: {
  title: string;
  manager: Manager;
  date: string;
  metric: "NNB" | "NNBF";
  period: "Month" | "YTD";
  setPeriod: (v: "Month" | "YTD") => void;
  assetClass: AcFilter;
  setAssetClass: (v: AcFilter) => void;
  top: { isin: string; label: string; value: number }[];
  bottom: { isin: string; label: string; value: number }[];
}) {
  const data = [
    ...top.map((d) => ({ ...d, fill: CHART_COLORS.positive })),
    ...bottom.map((d) => ({ ...d, fill: CHART_COLORS.negative })),
  ];
  const [hovered, setHovered] = useState<{ isin: string; label: string; value: number } | null>(
    null,
  );
  const donut = useMemo(
    () =>
      hovered
        ? getManagerSecurityByAfp(manager, hovered.isin, metric, period, date)
        : [],
    [hovered, manager, metric, period, date],
  );
  const donutTotal = donut.reduce((a, b) => a + b.value, 0);
  return (
    <CardShell
      title={title}
      right={
        <>
          <SegmentedToggle
            options={ASSET_CLASS_TOGGLE_3}
            value={assetClass}
            onChange={setAssetClass}
          />
          <SegmentedToggle options={PERIOD_TOGGLE} value={period} onChange={setPeriod} />
        </>
      }
    >
      <div className="h-80 relative">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
          >
            <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
            <XAxis type="number" stroke="#999" fontSize={11} tickFormatter={(v) => formatUSD(v)} />
            <YAxis
              type="category"
              dataKey="label"
              stroke="#999"
              fontSize={11}
              width={120}
            />
            <ReferenceLine x={0} stroke="#666" />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: number) => formatUSD(v)}
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
            />
            <Bar
              dataKey="value"
              isAnimationActive={false}
              onMouseEnter={(d: any) =>
                setHovered({ isin: d.isin, label: d.label, value: d.value })
              }
              onMouseLeave={() => setHovered(null)}
            >
              {data.map((d) => (
                <Cell key={d.isin} fill={d.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {hovered && (
          <div className="pointer-events-none absolute top-3 right-3 w-72 max-w-[calc(100%-1.5rem)] rounded-md bg-card/95 border border-border shadow-lg p-3 space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {metric} by AFP
            </div>
            <div className="text-xs font-medium truncate">{hovered.label}</div>
            {donut.length === 0 ? (
              <div className="text-[11px] text-muted-foreground italic">No AFP breakdown</div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="relative w-24 h-24 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donut.map((d) => ({ ...d, value: Math.abs(d.value) }))}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={24}
                        outerRadius={46}
                        paddingAngle={1}
                        isAnimationActive={false}
                      >
                        {donut.map((d) => (
                          <Cell key={d.name} fill={d.fill} stroke="#fff" />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                      Total
                    </span>
                    <span className="text-[10px] font-semibold tabular-nums">
                      {formatUSD(donutTotal)}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-0.5 text-[10px]">
                  {donut.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <span
                        className="inline-block w-2 h-2 rounded-sm shrink-0"
                        style={{ background: d.fill }}
                      />
                      <span className="truncate">{d.name}</span>
                      <span className="ml-auto tabular-nums text-muted-foreground shrink-0">
                        {formatUSD(d.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </CardShell>
  );
}