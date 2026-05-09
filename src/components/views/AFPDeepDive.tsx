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
} from "recharts";
import {
  AFPS,
  CHART_COLORS,
  MATCH_TYPES,
  formatBps,
  formatUSD,
  getAFPAllocationByPortfolio,
  getAFPTreemap,
  getDisplacement,
  managerColor,
  type AFP,
  type MatchType,
} from "@/lib/mock-data";
import { useDashboard } from "@/lib/dashboard-store";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function AFPDeepDive() {
  const { date, blkOnly } = useDashboard();
  const [afp, setAfp] = useState<AFP>(AFPS[0]);
  const [matchFilter, setMatchFilter] = useState<MatchType | "All">("All");

  const filters = { date, afps: [afp], blkOnly };
  const treemap = useMemo(() => getAFPTreemap(filters, afp), [date, blkOnly, afp]);
  const alloc = useMemo(() => getAFPAllocationByPortfolio(filters, afp), [date, blkOnly, afp]);
  const opps = useMemo(() => getDisplacement(afp, matchFilter), [afp, matchFilter]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">AFP Deep Dive</h1>
          <p className="text-sm text-muted-foreground">Portfolio composition and displacement opportunities.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Select AFP</span>
          <select
            value={afp}
            onChange={(e) => setAfp(e.target.value as AFP)}
            className="text-sm border border-border rounded-sm px-3 py-1.5 bg-white"
          >
            {AFPS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-md shadow-sm">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold uppercase tracking-wide">Portfolio Composition</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Manager → Category, sized by AUM</p>
          </div>
          <div className="h-80 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={treemap}
                dataKey="size"
                stroke="#fff"
                content={<TreemapNode />}
                isAnimationActive={false}
              />
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-md shadow-sm">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold uppercase tracking-wide">Allocation by Portfolio Type</h2>
            <p className="text-xs text-muted-foreground mt-0.5">BlackRock vs competitor AUM</p>
          </div>
          <div className="h-80 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={alloc}>
                <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis dataKey="Portfolio_Type" stroke="#999" fontSize={11} />
                <YAxis stroke="#999" fontSize={11} tickFormatter={(v) => formatUSD(v)} />
                <Tooltip
                  formatter={(v: number) => formatUSD(v)}
                  contentStyle={{ fontSize: 12, border: "1px solid #E5E5E5", borderRadius: 4 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="BlackRock" fill={CHART_COLORS.blk} />
                <Bar dataKey="Competitor" fill={CHART_COLORS.competitor} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-md shadow-sm">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide">Displacement Opportunities</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Competitor positions with BLK alternatives</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Match</span>
            <select
              value={matchFilter}
              onChange={(e) => setMatchFilter(e.target.value as MatchType | "All")}
              className="text-sm border border-border rounded-sm px-3 py-1.5 bg-white"
            >
              <option value="All">All</option>
              {MATCH_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
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
                  <td className="px-5 py-2.5 text-right tabular-nums text-positive font-medium">
                    -{r.Fee_Advantage_bps} bps
                  </td>
                </tr>
              ))}
              {opps.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground text-sm">
                    No opportunities for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
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

interface TreemapNodeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  manager?: string;
  depth?: number;
}

function TreemapNode(props: TreemapNodeProps) {
  const { x = 0, y = 0, width = 0, height = 0, name, manager, depth } = props;
  if (depth === 0) return null;
  const fill = manager ? managerColor(manager as never) : CHART_COLORS.competitor;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#fff" strokeWidth={2} />
      {width > 60 && height > 24 && (
        <text x={x + 6} y={y + 16} fill="#fff" fontSize={11} fontWeight={500}>
          {name}
        </text>
      )}
    </g>
  );
}