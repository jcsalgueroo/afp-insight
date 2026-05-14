import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  AFPS,
  MATCH_TYPES,
  categoryAssetClass,
  categoryOfIsin,
  formatBps,
  formatUSD,
  getDisplacement,
  type AFP,
  type Category,
  type DisplacementRow,
  type MatchType,
} from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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

export function Targets() {
  const [primaryAfp, setPrimaryAfp] = useState<AFP>(AFPS[0]);
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

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Targets</h1>
        <p className="text-sm text-muted-foreground">
          Competitor positions in the selected AFP with BLK alternatives — grouped by Asset Class → Category.
        </p>
      </div>

      <div className="bg-card border border-border rounded-md shadow-sm">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide">Displacement Opportunities</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Competitor positions in {primaryAfp} with BLK alternatives
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">AFP</span>
              <Select value={primaryAfp} onValueChange={(v) => setPrimaryAfp(v as AFP)}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AFPS.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
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
                                  <td
                                    className={cn(
                                      "px-5 py-2.5 text-right tabular-nums font-medium",
                                      r.Fee_Advantage_bps >= 0 ? "text-positive" : "text-negative",
                                    )}
                                  >
                                    {Math.abs(r.Fee_Advantage_bps)} bps
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
    </div>
  );
}
