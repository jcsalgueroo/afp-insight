import { useMemo, useState } from "react";
import {
  PORTFOLIO_TYPES,
  formatUSD,
  getBelowWeightSecurities,
  getPenetrationHeatmap,
  type Bucket,
  type PortfolioType,
} from "@/lib/mock-data";
import { useDashboard } from "@/lib/dashboard-store";
import { MultiSelectPopover } from "@/components/widgets/MultiSelectPopover";
import { SegmentedToggle } from "@/components/widgets/SegmentedToggle";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

const BUCKET_TOGGLE = [
  { value: "All" as const, label: "All" },
  { value: "ETF" as const, label: "ETF" },
  { value: "Mutual Fund" as const, label: "MF" },
  { value: "Money Market" as const, label: "MM" },
] as const;

const GROUP_TOGGLE = [
  { value: "cat" as const, label: "Category → AFP" },
  { value: "afp" as const, label: "AFP → Category" },
] as const;

const ASSET_CLASS_TOGGLE = [
  { value: "All" as const, label: "All" },
  { value: "Equity" as const, label: "Equity" },
  { value: "Fixed Income" as const, label: "FI" },
] as const;

type AssetClassFilter = "All" | "Equity" | "Fixed Income";

function CardShell({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-border rounded-md">
      <header className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide">{title}</h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {right && <div className="flex items-center gap-2">{right}</div>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

// white -> green ramp. share in [0,1].
function shareColor(share: number) {
  const t = Math.max(0, Math.min(1, share));
  // interpolate from white to #00B140
  const r = Math.round(255 + (0 - 255) * t);
  const g = Math.round(255 + (177 - 255) * t);
  const b = Math.round(255 + (64 - 255) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export function ProductPenetration() {
  const { date } = useDashboard();
  const [bucket, setBucket] = useState<Bucket | "All">("All");
  const [ptypes, setPtypes] = useState<PortfolioType[]>([]);
  const [groupBy, setGroupBy] = useState<"cat" | "afp">("cat");
  const [heatAC, setHeatAC] = useState<AssetClassFilter>("All");
  const [belowAC, setBelowAC] = useState<AssetClassFilter>("All");

  const heat = useMemo(
    () => getPenetrationHeatmap({ bucket, portfolioTypes: ptypes, date, assetClass: heatAC }),
    [bucket, ptypes, date, heatAC],
  );
  const below = useMemo(
    () =>
      getBelowWeightSecurities({
        bucket: "ETF",
        portfolioTypes: ptypes,
        date,
        threshold: 0.65,
        assetClass: belowAC,
      }),
    [ptypes, date, belowAC],
  );

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-xl font-semibold">Product Penetration</h1>
        <p className="text-sm text-muted-foreground mt-1">
          BlackRock / iShares share of AUM Org by Category and AFP.
        </p>
      </div>

      <CardShell
        title="BlackRock Share — Category × AFP"
        subtitle="Cell color = BlackRock share of AUM Org (white → green, 0–100%)"
        right={
          <>
            <SegmentedToggle value={bucket} onChange={setBucket} options={BUCKET_TOGGLE} />
            <SegmentedToggle value={heatAC} onChange={setHeatAC} options={ASSET_CLASS_TOGGLE} />
            <MultiSelectPopover
              label="Portfolio"
              options={PORTFOLIO_TYPES}
              value={ptypes}
              onChange={setPtypes}
            />
          </>
        }
      >
        {heat.categories.length === 0 ? (
          <div className="text-sm text-muted-foreground">No data for current filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <div
              className="grid gap-1 min-w-[640px]"
              style={{
                gridTemplateColumns: `180px repeat(${heat.afps.length}, minmax(110px, 1fr))`,
              }}
            >
              <div />
              {heat.afps.map((a) => (
                <div
                  key={a}
                  className="text-[11px] uppercase tracking-wide text-muted-foreground text-center font-medium pb-1"
                >
                  {a}
                </div>
              ))}
              {heat.categories.map((cat, ci) => (
                <ContextRow key={cat} cat={cat} ci={ci} heat={heat} />
              ))}
            </div>
            <Legend />
          </div>
        )}
      </CardShell>

      <CardShell
        title="Punching Below our Weight"
        subtitle={`ETFs in cells where BlackRock share is below 65% (${below.length} securities)`}
        right={
          <>
            <SegmentedToggle value={belowAC} onChange={setBelowAC} options={ASSET_CLASS_TOGGLE} />
            <SegmentedToggle value={groupBy} onChange={setGroupBy} options={GROUP_TOGGLE} />
          </>
        }
      >
        {below.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            All cells are at or above 65% BlackRock share for current filters.
          </div>
        ) : (
          <BelowWeightTable rows={below} groupBy={groupBy} />
        )}
      </CardShell>
    </div>
  );
}

function ContextRow({
  cat,
  ci,
  heat,
}: {
  cat: string;
  ci: number;
  heat: ReturnType<typeof getPenetrationHeatmap>;
}) {
  return (
    <>
      <div className="text-xs font-medium flex items-center pr-2">{cat}</div>
      {heat.afps.map((afp, ai) => {
        const cell = heat.cells[ci][ai];
        return (
          <HeatCell key={afp} category={cat} afp={afp} cell={cell} />
        );
      })}
    </>
  );
}

function HeatCell({
  category,
  afp,
  cell,
}: {
  category: string;
  afp: string;
  cell: ReturnType<typeof getPenetrationHeatmap>["cells"][number][number];
}) {
  const [hover, setHover] = useState(false);
  const empty = cell.totalAUM <= 0;
  return (
    <div
      className="relative h-12 rounded-sm border border-border flex items-center justify-center text-[11px] font-medium cursor-default"
      style={{
        background: empty ? "#F5F5F5" : shareColor(cell.blkShare),
        color: cell.blkShare > 0.55 ? "#fff" : "#111",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {empty ? "—" : `${(cell.blkShare * 100).toFixed(0)}%`}
      {hover && !empty && (
        <div className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-1 w-56 bg-popover text-popover-foreground border border-border rounded-md shadow-md p-2 text-[11px]">
          <div className="font-semibold text-foreground">
            {category} · {afp}
          </div>
          <div className="text-muted-foreground mt-0.5">
            Total AUM Org: {formatUSD(cell.totalAUM)}
          </div>
          <div className="text-muted-foreground">
            BlackRock share: {(cell.blkShare * 100).toFixed(1)}%
          </div>
          <div className="mt-1.5 border-t border-border pt-1.5 space-y-0.5">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Top managers
            </div>
            {cell.topManagers.map((m) => (
              <div key={m.Manager} className="flex justify-between">
                <span className={cn(m.Manager === "BlackRock" && "font-semibold")}>
                  {m.Manager}
                </span>
                <span className="tabular-nums">{m.sharePct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Legend() {
  const stops = [0, 0.25, 0.5, 0.75, 1];
  return (
    <div className="flex items-center gap-2 mt-4 text-[10px] uppercase tracking-wide text-muted-foreground">
      <span>BlackRock share</span>
      <div className="flex">
        {stops.map((s) => (
          <div
            key={s}
            className="w-8 h-3 border border-border"
            style={{ background: shareColor(s) }}
            title={`${(s * 100).toFixed(0)}%`}
          />
        ))}
      </div>
      <span>0% → 100%</span>
    </div>
  );
}

function BelowWeightTable({
  rows,
  groupBy,
}: {
  rows: ReturnType<typeof getBelowWeightSecurities>;
  groupBy: "cat" | "afp";
}) {
  // Build hierarchical groups
  const groups = useMemo(() => {
    const outerKey = (r: (typeof rows)[number]) =>
      groupBy === "cat" ? r.Category : r.AFP;
    const innerKey = (r: (typeof rows)[number]) =>
      groupBy === "cat" ? r.AFP : r.Category;
    const map = new Map<string, Map<string, typeof rows>>();
    for (const r of rows) {
      const ok = outerKey(r);
      const ik = innerKey(r);
      if (!map.has(ok)) map.set(ok, new Map());
      const inner = map.get(ok)!;
      if (!inner.has(ik)) inner.set(ik, []);
      inner.get(ik)!.push(r);
    }
    return [...map.entries()].map(([outer, inner]) => ({
      outer,
      inners: [...inner.entries()].map(([k, v]) => ({
        key: k,
        rows: v.sort((a, b) => b.AUM_USD - a.AUM_USD),
      })),
    }));
  }, [rows, groupBy]);

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="w-[220px]">Ticker / Name</TableHead>
            <TableHead>Manager</TableHead>
            <TableHead className="text-right">AUM Org</TableHead>
            <TableHead className="text-right">YTD Perf (USD)</TableHead>
            <TableHead className="text-right">YTD NNB</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((g) => (
            <GroupBlock
              key={g.outer}
              outer={g.outer}
              inners={g.inners}
              groupBy={groupBy}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function GroupBlock({
  outer,
  inners,
  groupBy,
}: {
  outer: string;
  inners: { key: string; rows: ReturnType<typeof getBelowWeightSecurities> }[];
  groupBy: "cat" | "afp";
}) {
  const [open, setOpen] = useState(false);
  const totalAum = inners.reduce(
    (s, i) => s + i.rows.reduce((ss, r) => ss + r.AUM_USD, 0),
    0,
  );
  const outerLabel = groupBy === "cat" ? "Category" : "AFP";
  const innerLabel = groupBy === "cat" ? "AFP" : "Category";
  const totalRows = inners.reduce((s, i) => s + i.rows.length, 0);
  return (
    <>
      <TableRow
        className="bg-foreground/[0.06] hover:bg-foreground/[0.10] cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <TableCell colSpan={5} className="py-2">
          <div className="flex items-center gap-2">
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform",
                open && "rotate-90",
              )}
            />
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {outerLabel}
            </span>
            <span className="font-semibold text-sm">{outer}</span>
            <span className="text-xs text-muted-foreground">
              {formatUSD(totalAum)} · {inners.length} {innerLabel.toLowerCase()}(s) · {totalRows} securities
            </span>
          </div>
        </TableCell>
      </TableRow>
      {open &&
        inners.map((inner) => {
          const cellShare = inner.rows[0]?.blkShare ?? 0;
          const cellAum = inner.rows[0]?.cellAUM ?? 0;
          return (
            <InnerBlock
              key={inner.key}
              innerKey={inner.key}
              innerLabel={innerLabel}
              cellShare={cellShare}
              cellAum={cellAum}
              rows={inner.rows}
            />
          );
        })}
    </>
  );
}

function InnerBlock({
  innerKey,
  innerLabel,
  cellShare,
  cellAum,
  rows,
}: {
  innerKey: string;
  innerLabel: string;
  cellShare: number;
  cellAum: number;
  rows: ReturnType<typeof getBelowWeightSecurities>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow
        className="bg-muted/30 hover:bg-muted/50 cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <TableCell colSpan={5} className="py-1.5 pl-6">
          <div className="flex items-center gap-2">
            <ChevronRight
              className={cn(
                "h-3 w-3 text-muted-foreground transition-transform",
                open && "rotate-90",
              )}
            />
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {innerLabel}
            </span>
            <span className="font-medium text-xs">{innerKey}</span>
            <span className="text-[11px] text-muted-foreground">
              BLK {(cellShare * 100).toFixed(1)}% · cell {formatUSD(cellAum)} · {rows.length} securities
            </span>
          </div>
        </TableCell>
      </TableRow>
      {open && rows.map((r) => (
        <TableRow key={`${r.AFP}-${r.Category}-${r.ISIN}`}>
          <TableCell className="pl-10">
            <div className="text-xs font-medium">
              {r.Asset_Type === "ETF" ? r.Ticker : r.Name}
            </div>
            {r.Asset_Type === "ETF" && (
              <div className="text-[10px] text-muted-foreground">{r.Name}</div>
            )}
          </TableCell>
          <TableCell className="text-xs">
            <span
              className={cn(
                r.Manager === "BlackRock" && "font-semibold text-[#00B140]",
              )}
            >
              {r.Manager}
            </span>
          </TableCell>
          <TableCell className="text-right tabular-nums text-xs">
            {formatUSD(r.AUM_USD)}
          </TableCell>
          <TableCell
            className={cn(
              "text-right tabular-nums text-xs",
              r.YTD_Perf >= 0 ? "text-[#00B140]" : "text-[#D93025]",
            )}
          >
            {r.YTD_Perf >= 0 ? "+" : ""}
            {r.YTD_Perf.toFixed(2)}%
          </TableCell>
          <TableCell
            className={cn(
              "text-right tabular-nums text-xs",
              r.NNB_USD >= 0 ? "text-foreground" : "text-[#D93025]",
            )}
          >
            {formatUSD(r.NNB_USD)}
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
