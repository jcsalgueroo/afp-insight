// Live-data backed schema. Arrays below are populated at app boot by
// `setLiveData()` (see src/lib/data-loader.ts). Until then they are empty.

export type Manager = string;
export type AFP = string;
export type PortfolioType = string;
export type Category = string;
export type MatchType = string;

export const ASSET_TYPES = ["ETF", "Mutual Fund", "Money Market"] as const;
export const MATCH_TYPES = ["Direct", "Close", "Broad"] as const;

// Mutable runtime registries — populated by setLiveData().
export let AFPS: AFP[] = [];
export let PORTFOLIO_TYPES: PortfolioType[] = [];
export let MANAGERS: Manager[] = [];
export let CATEGORIES: Category[] = [];
export let MONTHS: string[] = [];
export let ASSET_CLASSES: string[] = [];

export interface MasterRow {
  Date: string; // YYYY-MM
  AFP: AFP;
  Portfolio_Type: PortfolioType;
  ISIN: string;
  Name: string;
  Ticker: string; // populated for ETFs; "" otherwise
  Manager: Manager;
  Category: Category;
  Asset_Type: string;
  AUM_USD: number;
  NNB_USD: number;
  RRR_USD: number;
  Fee_bps: number;
  YTD_Perf: number;
  // Extended live-data fields
  NNB_Month_USD: number;
  NNB_YTD_USD: number;
  NNBF_Month_USD: number;
  NNBF_YTD_USD: number;
  Perf_Month: number;
  Perf_YTD: number;
  Asset_Class: string;
  Domicile: string;
  Cumulative_Perf: number;
}

export interface DisplacementRow {
  Competitor_ISIN: string;
  Competitor_Name: string;
  Competitor_Manager: Manager;
  Competitor_AUM: number;
  Competitor_Fee_bps: number;
  Match_Type: MatchType;
  BLK_Alternative_Name: string;
  BLK_ISIN: string;
  BLK_Ticker: string;
  Fee_Advantage_bps: number;
  Perf_Advantage_pct: number;
  AFP: AFP;
}

// Mutable data registries.
export let MASTER_DATA: MasterRow[] = [];
export let DISPLACEMENT_DATA: DisplacementRow[] = [];

/** Called once by the data-loader on app boot to install live CSV data. */
export function setLiveData(args: {
  master: MasterRow[];
  displacement: DisplacementRow[];
}) {
  MASTER_DATA = args.master;
  DISPLACEMENT_DATA = args.displacement;

  const distinct = <T,>(arr: T[]) => Array.from(new Set(arr));
  MONTHS = distinct(MASTER_DATA.map((r) => r.Date)).sort();
  AFPS = distinct(MASTER_DATA.map((r) => r.AFP)).sort();
  PORTFOLIO_TYPES = distinct(MASTER_DATA.map((r) => r.Portfolio_Type));
  MANAGERS = distinct(MASTER_DATA.map((r) => r.Manager)).sort();
  CATEGORIES = distinct(MASTER_DATA.map((r) => r.Category)).sort();
  ASSET_CLASSES = distinct(MASTER_DATA.map((r) => r.Asset_Class).filter(Boolean)).sort();
}

// ---------- Selectors ----------

export interface Filters {
  date: string;
  afps: AFP[]; // empty = all
  blkOnly: boolean;
}

export function applyFilters(data: MasterRow[], f: Filters) {
  return data.filter((r) => {
    if (r.Date !== f.date) return false;
    if (f.afps.length && !f.afps.includes(r.AFP)) return false;
    if (f.blkOnly && r.Manager !== "BlackRock") return false;
    return true;
  });
}

export function sumBy<T>(arr: T[], fn: (r: T) => number) {
  return arr.reduce((a, b) => a + fn(b), 0);
}

export function getKPIs(f: Filters) {
  const cur = applyFilters(MASTER_DATA, f).filter((r) => r.Manager === "BlackRock");
  const prevMonthIdx = Math.max(0, MONTHS.indexOf(f.date) - 1);
  const prev = applyFilters(MASTER_DATA, { ...f, date: MONTHS[prevMonthIdx] }).filter(
    (r) => r.Manager === "BlackRock",
  );

  const aum = sumBy(cur, (r) => r.AUM_USD);
  const rrr = sumBy(cur, (r) => r.RRR_USD);

  // Align YTD NNB / NNBF KPIs with the Flows Intelligence "YTD NNB / NNBF by
  // Manager" charts: those charts cap each bucket at the top-6 brands by
  // |YTD value|, which can exclude iShares or BlackRock from a given bucket.
  // We sum the displayed iShares + BlackRock series across all three buckets
  // at the selected month so the KPI matches what the chart actually shows.
  const blkYtdAt = (month: string, metric: "NNB" | "NNBF"): number => {
    const s = getYtdByManagerSeries({ date: month, afps: f.afps, blkOnly: false }, "All", metric);
    const row = s.data.find((d) => d.m === month);
    if (!row) return 0;
    let total = 0;
    for (const brand of ["iShares", "BlackRock"] as const) {
      if (s.brands.includes(brand)) total += (row[brand] as number) ?? 0;
    }
    return total;
  };
  const nnb = blkYtdAt(f.date, "NNB");
  const nnbf = blkYtdAt(f.date, "NNBF");
  const nnbPrevAligned = blkYtdAt(MONTHS[prevMonthIdx], "NNB") || 1;
  const nnbfPrevAligned = blkYtdAt(MONTHS[prevMonthIdx], "NNBF") || 1;

  const aumPrev = sumBy(prev, (r) => r.AUM_USD) || 1;
  const rrrPrev = sumBy(prev, (r) => r.RRR_USD) || 1;

  // 4-month sparkline
  const trend = (
    metric: "AUM_USD" | "NNB_USD" | "RRR_USD",
  ) => {
    const startIdx = Math.max(0, MONTHS.indexOf(f.date) - 3);
    return MONTHS.slice(startIdx, MONTHS.indexOf(f.date) + 1).map((m) => {
      const rows = applyFilters(MASTER_DATA, { ...f, date: m }).filter((r) => r.Manager === "BlackRock");
      return { m, v: sumBy(rows, (r) => r[metric]) };
    });
  };
  const trendBlkYtd = (metric: "NNB" | "NNBF") => {
    const startIdx = Math.max(0, MONTHS.indexOf(f.date) - 3);
    return MONTHS.slice(startIdx, MONTHS.indexOf(f.date) + 1).map((m) => ({
      m,
      v: blkYtdAt(m, metric),
    }));
  };

  return {
    aum,
    nnb,
    rrr,
    nnbf,
    aumDelta: (aum - sumBy(prev, (r) => r.AUM_USD)) / aumPrev,
    nnbDelta: (nnb - blkYtdAt(MONTHS[prevMonthIdx], "NNB")) / Math.abs(nnbPrevAligned),
    rrrDelta: (rrr - sumBy(prev, (r) => r.RRR_USD)) / Math.abs(rrrPrev),
    nnbfDelta: (nnbf - blkYtdAt(MONTHS[prevMonthIdx], "NNBF")) / Math.abs(nnbfPrevAligned),
    trendAUM: trend("AUM_USD"),
    trendNNB: trendBlkYtd("NNB"),
    trendNNBF: trendBlkYtd("NNBF"),
    trendRRR: trend("RRR_USD"),
  };
}

export function getMarketShare(f: Filters, metric: "AUM_USD" | "NNB_USD" | "RRR_USD") {
  // Top 5 managers; we have 6 — pick top 5 by metric, group rest as "Other"
  const data = applyFilters(MASTER_DATA, { ...f, blkOnly: false });
  const byManager = new Map<Manager, number>();
  for (const r of data) byManager.set(r.Manager, (byManager.get(r.Manager) ?? 0) + r[metric]);
  const sorted = [...byManager.entries()].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const top = sorted.slice(0, 5);
  const total = top.reduce((a, [, v]) => a + Math.abs(v), 0) || 1;
  const row: Record<string, number | string> = { name: "Market Share" };
  for (const [m, v] of top) row[m] = (Math.abs(v) / total) * 100;
  return { row, managers: top.map(([m]) => m) };
}

export function getAFPTreemap(f: Filters, afp: AFP) {
  const data = applyFilters(MASTER_DATA, { ...f, afps: [afp], blkOnly: false });
  const grouped = new Map<string, Map<string, number>>();
  for (const r of data) {
    if (!grouped.has(r.Manager)) grouped.set(r.Manager, new Map());
    const cat = grouped.get(r.Manager)!;
    cat.set(r.Category, (cat.get(r.Category) ?? 0) + r.AUM_USD);
  }
  return [...grouped.entries()].map(([manager, cats]) => ({
    name: manager,
    children: [...cats.entries()].map(([cat, v]) => ({ name: cat, size: v, manager })),
  }));
}

export function getAFPAllocationByPortfolio(f: Filters, afp: AFP) {
  const data = applyFilters(MASTER_DATA, { ...f, afps: [afp], blkOnly: false });
  return PORTFOLIO_TYPES.map((pt) => {
    const rows = data.filter((r) => r.Portfolio_Type === pt);
    const blk = sumBy(rows.filter((r) => r.Manager === "BlackRock"), (r) => r.AUM_USD);
    const comp = sumBy(rows.filter((r) => r.Manager !== "BlackRock"), (r) => r.AUM_USD);
    return { Portfolio_Type: pt, BlackRock: blk, Competitor: comp };
  });
}

export function getDisplacement(afp: AFP | "All", matchType: MatchType | "All") {
  return DISPLACEMENT_DATA.filter(
    (r) => (afp === "All" || r.AFP === afp) && (matchType === "All" || r.Match_Type === matchType),
  );
}

export function getNNBByManager(f: Filters) {
  const data = applyFilters(MASTER_DATA, { ...f, blkOnly: false });
  const m = new Map<Manager, number>();
  for (const r of data) m.set(r.Manager, (m.get(r.Manager) ?? 0) + r.NNB_USD);
  return [...m.entries()].map(([Manager, NNB]) => ({ Manager, NNB }));
}

export function getScatter(f: Filters) {
  const data = applyFilters(MASTER_DATA, { ...f, blkOnly: false });
  // collapse to one point per (Manager, ISIN)
  const map = new Map<string, { Manager: Manager; AUM: number; NNB: number; Perf: number; Name: string }>();
  for (const r of data) {
    const key = r.ISIN;
    const cur = map.get(key);
    if (cur) {
      cur.AUM += r.AUM_USD;
      cur.NNB += r.NNB_USD;
    } else {
      map.set(key, { Manager: r.Manager, AUM: r.AUM_USD, NNB: r.NNB_USD, Perf: r.YTD_Perf, Name: r.Name });
    }
  }
  return [...map.values()];
}

export function getAUMvsFee(f: Filters) {
  const data = applyFilters(MASTER_DATA, { ...f, blkOnly: false });
  const by = new Map<Manager, { aum: number; feeWeight: number; aumWeight: number }>();
  for (const r of data) {
    const cur = by.get(r.Manager) ?? { aum: 0, feeWeight: 0, aumWeight: 0 };
    cur.aum += r.AUM_USD;
    cur.feeWeight += r.Fee_bps * r.AUM_USD;
    cur.aumWeight += r.AUM_USD;
    by.set(r.Manager, cur);
  }
  return [...by.entries()].map(([Manager, v]) => ({
    Manager,
    AUM: v.aum,
    Fee_bps: v.aumWeight ? v.feeWeight / v.aumWeight : 0,
  }));
}

// ---------- Formatters ----------

export function formatUSD(n: number, opts?: { compact?: boolean }) {
  const compact = opts?.compact ?? true;
  if (compact) {
    const abs = Math.abs(n);
    if (abs >= 1e9) return `${n < 0 ? "-" : ""}$${(abs / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${n < 0 ? "-" : ""}$${(abs / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${n < 0 ? "-" : ""}$${(abs / 1e3).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  }
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function formatPct(n: number, digits = 2) {
  return `${(n * 100).toFixed(digits)}%`;
}

export function formatBps(n: number) {
  return `${n.toFixed(0)} bps`;
}

export const CHART_COLORS = {
  blk: "#00B140",
  blkAlt: "#000000",
  competitor: "#999999",
  positive: "#34A853",
  negative: "#D93025",
  grid: "#E5E5E5",
  grayPalette: ["#000000", "#4D4D4D", "#7A7A7A", "#999999", "#B8B8B8", "#D4D4D4"],
};

// Vibrant accent palette used across charts for managers / categories.
// Built from the brand green plus the requested lime/yellow-green/gold/orange family.
export const ACCENT_PALETTE = [
  "#00B140", // brand green
  "#FFA500", // orange
  "#FFD700", // gold
  "#32CD32", // lime green
  "#9ACD32", // yellow-green
  "#FF8C00", // dark orange
  "#1F7A3A", // deep green
  "#FFB347", // soft orange
  "#BFEA3A", // soft lime
  "#E6C200", // mustard
];

export const STACK_TOP_N = 6;

export function managerColor(m: Manager) {
  if (m === "BlackRock") return CHART_COLORS.blk;
  if (m === "Others" || m === "Other") return CHART_COLORS.competitor;
  const others = MANAGERS.filter((x) => x !== "BlackRock");
  const idx = others.indexOf(m);
  return ACCENT_PALETTE[(idx >= 0 ? idx + 1 : 0) % ACCENT_PALETTE.length];
}

export const SYSTEM_COLOR = "#111111";
export function afpColor(afp: AFP | "System") {
  if (afp === "System") return SYSTEM_COLOR;
  const idx = AFPS.indexOf(afp);
  return ACCENT_PALETTE[(idx >= 0 ? idx : 0) % ACCENT_PALETTE.length];
}

// ---------- Brand & bucket helpers ----------

export type Bucket = "ETF" | "Mutual Fund" | "Money Market";
export const BUCKETS: Bucket[] = ["ETF", "Mutual Fund", "Money Market"];

export function brandOf(r: MasterRow): string {
  if (r.Manager === "BlackRock") return r.Asset_Type === "ETF" ? "iShares" : "BlackRock";
  return r.Manager;
}

export function bucketOf(r: MasterRow): Bucket {
  const t = (r.Asset_Type ?? "").trim();
  if (t === "Money Market" || r.Category === "Money Market") return "Money Market";
  if (t === "ETF") return "ETF";
  return "Mutual Fund";
}

export function brandColor(b: string) {
  if (b === "iShares") return CHART_COLORS.blk;
  if (b === "BlackRock") return "#1F7A3A";
  if (b === "Others" || b === "Other") return CHART_COLORS.competitor;
  const others = MANAGERS.filter((x) => x !== "BlackRock") as string[];
  const idx = others.indexOf(b);
  return ACCENT_PALETTE[(idx >= 0 ? idx + 1 : 0) % ACCENT_PALETTE.length];
}

export const BUCKET_COLOR: Record<Bucket, string> = {
  ETF: CHART_COLORS.blk,
  "Mutual Fund": "#FFA500",
  "Money Market": "#FFD700",
};

function monthsYTD(date: string): string[] {
  const year = date.slice(0, 4);
  return MONTHS.filter((m) => m.startsWith(year) && m <= date);
}

function rowsAt(month: string, afps: AFP[]) {
  return MASTER_DATA.filter(
    (r) => r.Date === month && (afps.length === 0 || afps.includes(r.AFP)),
  );
}

// ---------- Brand KPI cards (iShares ETF share, BLK MF share) ----------

function shareAtMonth(
  month: string,
  afps: AFP[],
  predicate: (r: MasterRow) => boolean,
  poolBucket: Bucket,
) {
  const rows = rowsAt(month, afps).filter((r) => bucketOf(r) === poolBucket);
  const total = sumBy(rows, (r) => r.AUM_USD);
  const num = sumBy(rows.filter(predicate), (r) => r.AUM_USD);
  return total ? num / total : 0;
}

export function getBrandKpis(f: Filters) {
  const idx = MONTHS.indexOf(f.date);
  const trend = (pred: (r: MasterRow) => boolean, bucket: Bucket) => {
    const start = Math.max(0, idx - 3);
    return MONTHS.slice(start, idx + 1).map((m) => ({
      m,
      v: shareAtMonth(m, f.afps, pred, bucket),
    }));
  };
  const ishPred = (r: MasterRow) => brandOf(r) === "iShares";
  const blkMfPred = (r: MasterRow) => brandOf(r) === "BlackRock" && bucketOf(r) === "Mutual Fund";

  const ishCur = shareAtMonth(f.date, f.afps, ishPred, "ETF");
  const ishPrev = shareAtMonth(MONTHS[Math.max(0, idx - 1)], f.afps, ishPred, "ETF");
  const blkCur = shareAtMonth(f.date, f.afps, blkMfPred, "Mutual Fund");
  const blkPrev = shareAtMonth(MONTHS[Math.max(0, idx - 1)], f.afps, blkMfPred, "Mutual Fund");

  return {
    iSharesEtf: ishCur,
    iSharesEtfDelta: ishPrev ? (ishCur - ishPrev) / ishPrev : 0,
    iSharesEtfTrend: trend(ishPred, "ETF"),
    blkMf: blkCur,
    blkMfDelta: blkPrev ? (blkCur - blkPrev) / blkPrev : 0,
    blkMfTrend: trend(blkMfPred, "Mutual Fund"),
  };
}

// ---------- AUM Org by bucket (12-month series) ----------

export function getAumOrgByBucketSeries(afps: AFP[], metric: "AUM_USD" | "NNB_USD") {
  return MONTHS.map((m) => {
    const rows = rowsAt(m, afps);
    const out: Record<string, number | string> = { m };
    for (const b of BUCKETS) out[b] = 0;
    for (const r of rows) {
      const b = bucketOf(r);
      out[b] = (out[b] as number) + r[metric];
    }
    return out;
  });
}

// ---------- Top 5 Managers pie by bucket ----------

export function getTopManagersPie(f: Filters, bucket: Bucket) {
  const rows = rowsAt(f.date, f.afps).filter((r) => bucketOf(r) === bucket);
  const map = new Map<string, number>();
  for (const r of rows) {
    const b = brandOf(r);
    map.set(b, (map.get(b) ?? 0) + r.AUM_USD);
  }
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 5);
  const rest = sorted.slice(5).reduce((a, [, v]) => a + v, 0);
  const result = top.map(([name, value]) => ({ name, value }));
  if (rest > 0) result.push({ name: "Others", value: rest });
  return result;
}

// ---------- YTD by Manager (cumulative area series) ----------

export function getYtdByManagerSeries(
  f: Filters,
  bucket: Bucket | "All",
  metric: "NNB" | "NNBF",
) {
  const months = monthsYTD(f.date);
  // Determine top brands across the whole YTD window
  const totals = new Map<string, number>();
  for (const m of months) {
    for (const r of rowsAt(m, f.afps).filter((r) => bucket === "All" || bucketOf(r) === bucket)) {
      const v = metric === "NNB" ? r.NNB_YTD_USD : r.NNBF_YTD_USD;
      const b = brandOf(r);
      totals.set(b, (totals.get(b) ?? 0) + v);
    }
  }
  const brands = [...totals.entries()].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 6).map(([k]) => k);
  const data = months.map((m) => {
    const row: Record<string, number | string> = { m };
    const monthly: Record<string, number> = Object.fromEntries(brands.map((b) => [b, 0]));
    for (const r of rowsAt(m, f.afps).filter((r) => bucket === "All" || bucketOf(r) === bucket)) {
      const b = brandOf(r);
      if (!brands.includes(b)) continue;
      const v = metric === "NNB" ? r.NNB_YTD_USD : r.NNBF_YTD_USD;
      monthly[b] += v;
    }
    for (const b of brands) {
      row[b] = monthly[b];
    }
    return row;
  });
  return { data, brands };
}

// ---------- Category weight bubble data ----------

export function getCategoryWeightBubbles(f: Filters, afp: AFP, bucket?: Bucket) {
  let allRows = rowsAt(f.date, []);
  let afpRows = rowsAt(f.date, [afp]);
  if (bucket) {
    allRows = allRows.filter((r) => bucketOf(r) === bucket);
    afpRows = afpRows.filter((r) => bucketOf(r) === bucket);
  }
  const totalAll = sumBy(allRows, (r) => r.AUM_USD) || 1;
  const totalAfp = sumBy(afpRows, (r) => r.AUM_USD) || 1;

  return CATEGORIES.map((cat, idx) => {
    const allCat = allRows.filter((r) => r.Category === cat);
    const afpCat = afpRows.filter((r) => r.Category === cat);
    const aggWeight = (sumBy(allCat, (r) => r.AUM_USD) / totalAll) * 100;
    const afpWeight = (sumBy(afpCat, (r) => r.AUM_USD) / totalAfp) * 100;
    const blkInCat = sumBy(
      allCat.filter((r) => r.Manager === "BlackRock"),
      (r) => r.AUM_USD,
    );
    const totalInCat = sumBy(allCat, (r) => r.AUM_USD) || 1;
    const sizeShare = (blkInCat / totalInCat) * 100; // 0..100
    return { category: cat, idx, aggWeight, afpWeight, sizeShare };
  });
}

// ---------- Category weight grouped bars (System vs AFP) ----------

export type AssetClassFilter = "Equity" | "Fixed Income" | "All";
export type BucketFilter = Bucket | "All";

export function getCategoryWeightBars(
  f: Filters,
  afp: AFP,
  opts: { bucket: BucketFilter; assetClass: AssetClassFilter },
) {
  const filterFn = (r: MasterRow) => {
    if (opts.bucket !== "All" && bucketOf(r) !== opts.bucket) return false;
    if (opts.assetClass !== "All" && r.Asset_Class !== opts.assetClass) return false;
    return true;
  };
  const allRows = rowsAt(f.date, []).filter(filterFn);
  const afpRows = rowsAt(f.date, [afp]).filter(filterFn);
  const totalAll = sumBy(allRows, (r) => r.AUM_USD) || 1;
  const totalAfp = sumBy(afpRows, (r) => r.AUM_USD) || 1;
  return CATEGORIES.map((cat) => {
    const allCat = allRows.filter((r) => r.Category === cat);
    const afpCat = afpRows.filter((r) => r.Category === cat);
    const allCatTot = sumBy(allCat, (r) => r.AUM_USD);
    const afpCatTot = sumBy(afpCat, (r) => r.AUM_USD);
    const aggBlk = sumBy(allCat.filter((r) => r.Manager === "BlackRock"), (r) => r.AUM_USD);
    const afpBlk = sumBy(afpCat.filter((r) => r.Manager === "BlackRock"), (r) => r.AUM_USD);
    return {
      category: cat,
      aggWeight: (allCatTot / totalAll) * 100,
      afpWeight: (afpCatTot / totalAfp) * 100,
      aggBlkShare: allCatTot ? aggBlk / allCatTot : 0,
      afpBlkShare: afpCatTot ? afpBlk / afpCatTot : 0,
    };
  }).filter((r) => r.aggWeight > 0 || r.afpWeight > 0);
}

// Linear interpolation between two hex colors. t in 0..1.
function lerpColor(a: string, b: string, t: number) {
  const tt = Math.max(0, Math.min(1, t));
  const ah = a.replace("#", "");
  const bh = b.replace("#", "");
  const ar = parseInt(ah.slice(0, 2), 16),
    ag = parseInt(ah.slice(2, 4), 16),
    ab = parseInt(ah.slice(4, 6), 16);
  const br = parseInt(bh.slice(0, 2), 16),
    bg = parseInt(bh.slice(2, 4), 16),
    bb = parseInt(bh.slice(4, 6), 16);
  const r = Math.round(ar + (br - ar) * tt);
  const g = Math.round(ag + (bg - ag) * tt);
  const bl = Math.round(ab + (bb - ab) * tt);
  return `#${[r, g, bl].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}
/** share in 0..1; light grey -> dark grey */
export function shadeGrey(share: number) {
  return lerpColor("#E5E5E5", "#3A3A3A", share);
}
/** share in 0..1; light green -> dark BLK green */
export function shadeGreen(share: number) {
  return lerpColor("#BFEA9A", "#0F5A1E", share);
}

// ---------- Top 5 manager hover breakdowns ----------

export function getManagerAfpBreakdown(f: Filters, brand: string, bucket: Bucket) {
  const rows = rowsAt(f.date, f.afps).filter((r) => bucketOf(r) === bucket && brandOf(r) === brand);
  const m = new Map<AFP, number>();
  for (const r of rows) m.set(r.AFP, (m.get(r.AFP) ?? 0) + r.AUM_USD);
  return [...m.entries()]
    .map(([AFP, AUM]) => ({ AFP, AUM }))
    .sort((a, b) => b.AUM - a.AUM);
}

export function getOthersManagerBreakdown(f: Filters, bucket: Bucket) {
  const rows = rowsAt(f.date, f.afps).filter((r) => bucketOf(r) === bucket);
  const map = new Map<string, number>();
  for (const r of rows) {
    const b = brandOf(r);
    map.set(b, (map.get(b) ?? 0) + r.AUM_USD);
  }
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
  const others = sorted.slice(5);
  return others.map(([Manager, AUM]) => ({ Manager, AUM })).sort((a, b) => b.AUM - a.AUM);
}

// ---------- Monthly NNB by bucket (grouped bar) ----------

export function getMonthlyNnbByBucketSeries(afps: AFP[]) {
  return MONTHS.map((m) => {
    const row: Record<string, number | string> = { m, ETF: 0, "Mutual Fund": 0, "Money Market": 0 };
    for (const r of rowsAt(m, afps)) {
      const b = bucketOf(r);
      row[b] = (row[b] as number) + r.NNB_Month_USD;
    }
    return row;
  });
}

// ---------- Top 5 + Others manager share over time ----------

export function getTopManagersShareSeries(afps: AFP[], bucket: Bucket) {
  // Determine top 5 brands across all months in scope
  const totals = new Map<string, number>();
  for (const m of MONTHS) {
    for (const r of rowsAt(m, afps).filter((r) => bucketOf(r) === bucket)) {
      const b = brandOf(r);
      totals.set(b, (totals.get(b) ?? 0) + r.AUM_USD);
    }
  }
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 5).map(([k]) => k);
  const series = MONTHS.map((m) => {
    const rows = rowsAt(m, afps).filter((r) => bucketOf(r) === bucket);
    const monthMap = new Map<string, number>();
    let total = 0;
    for (const r of rows) {
      const b = brandOf(r);
      monthMap.set(b, (monthMap.get(b) ?? 0) + r.AUM_USD);
      total += r.AUM_USD;
    }
    const row: Record<string, number | string> = { m };
    let othersAbs = 0;
    for (const [k, v] of monthMap) {
      if (top.includes(k)) row[k] = total ? (v / total) * 100 : 0;
      else othersAbs += v;
    }
    for (const k of top) if (!(k in row)) row[k] = 0;
    row["Others"] = total ? (othersAbs / total) * 100 : 0;
    return row;
  });
  return { data: series, brands: [...top, "Others"] };
}

// ---------- Category flow bubbles (ETF NNB vs MF NNB) ----------

export function getCategoryFlowBubbles(
  f: Filters,
  afps: AFP[],
  period: "Month" | "YTD",
) {
  const monthList = period === "Month" ? [f.date] : monthsYTD(f.date);
  const rows = MASTER_DATA.filter(
    (r) => monthList.includes(r.Date) && (afps.length === 0 || afps.includes(r.AFP)),
  );
  return CATEGORIES.filter((c) => c !== "Money Market").map((cat) => {
    const inCat = rows.filter((r) => r.Category === cat);
    const etfRows = inCat.filter((r) => bucketOf(r) === "ETF");
    const mfRows = inCat.filter((r) => bucketOf(r) === "Mutual Fund");
    const etfNnb = sumBy(etfRows, (r) => r.NNB_USD);
    const mfNnb = sumBy(mfRows, (r) => r.NNB_USD);
    const iSharesEtfNnb = sumBy(
      etfRows.filter((r) => brandOf(r) === "iShares"),
      (r) => r.NNB_USD,
    );
    const iSharesShare = Math.abs(etfNnb) > 1 ? iSharesEtfNnb / etfNnb : null;
    return { category: cat, etfNnb, mfNnb, iSharesShare };
  });
}

// ---------- AFP Deep Dive selectors ----------

function bucketIsBLKBrand(b: Bucket) {
  return b === "ETF" ? "iShares" : "BlackRock";
}

/** Manager (Top 5 by AUM + Other) → Category, with `dominant` flag for BLK/iShares leaves. */
export function getAFPCompositionTree(afps: AFP[], bucket: Bucket, monthDate: string) {
  const rows = MASTER_DATA.filter(
    (r) =>
      r.Date === monthDate &&
      (afps.length === 0 || afps.includes(r.AFP)) &&
      bucketOf(r) === bucket,
  );
  const byManager = new Map<Manager, number>();
  for (const r of rows) byManager.set(r.Manager, (byManager.get(r.Manager) ?? 0) + r.AUM_USD);
  const sorted = [...byManager.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 5).map(([m]) => m);
  const others = sorted.slice(5).map(([m]) => m);

  // Per-category, per-manager AUM totals (within selected AFPs + bucket)
  const catManagerAum = new Map<Category, Map<Manager, number>>();
  for (const r of rows) {
    if (!catManagerAum.has(r.Category)) catManagerAum.set(r.Category, new Map());
    const m = catManagerAum.get(r.Category)!;
    m.set(r.Manager, (m.get(r.Manager) ?? 0) + r.AUM_USD);
  }

  const blkBrandLabel = bucketIsBLKBrand(bucket); // iShares for ETF, BlackRock for MF

  const buildChildren = (managerKeys: Manager[], displayName: string) => {
    // aggregate AUM per category across the manager keys
    const perCat = new Map<Category, number>();
    for (const cat of CATEGORIES) {
      let v = 0;
      for (const m of managerKeys) v += catManagerAum.get(cat)?.get(m) ?? 0;
      if (v > 0) perCat.set(cat, v);
    }
    return [...perCat.entries()].map(([cat, size]) => {
      // Dominance check only relevant for the BLK/iShares group
      let dominant = false;
      if (managerKeys.length === 1 && managerKeys[0] === "BlackRock") {
        const blkAum = catManagerAum.get(cat)?.get("BlackRock") ?? 0;
        let maxOther = 0;
        for (const [mgr, v] of catManagerAum.get(cat) ?? []) {
          if (mgr === "BlackRock") continue;
          if (v > maxOther) maxOther = v;
        }
        dominant = maxOther > blkAum;
      }
      return {
        name: cat,
        size,
        manager: displayName,
        category: cat,
        dominant,
        isBLK: managerKeys.length === 1 && managerKeys[0] === "BlackRock",
      };
    });
  };

  const result: Array<{ name: string; isBLK: boolean; children: ReturnType<typeof buildChildren> }> = [];
  for (const m of top) {
    const display = m === "BlackRock" ? blkBrandLabel : m;
    result.push({ name: display, isBLK: m === "BlackRock", children: buildChildren([m], display) });
  }
  if (others.length) {
    result.push({ name: "Other", isBLK: false, children: buildChildren(others, "Other") });
  }
  return result;
}

/** ETF vs Mutual Fund AUM totals filtered by category list. */
export function getAfpEtfMfDonut(
  afps: AFP[],
  categories: Category[],
  monthDate: string,
) {
  const rows = MASTER_DATA.filter(
    (r) =>
      r.Date === monthDate &&
      (afps.length === 0 || afps.includes(r.AFP)) &&
      (categories.length === 0 || categories.includes(r.Category)),
  );
  const etf = sumBy(rows.filter((r) => bucketOf(r) === "ETF"), (r) => r.AUM_USD);
  const mf = sumBy(rows.filter((r) => bucketOf(r) === "Mutual Fund"), (r) => r.AUM_USD);
  return [
    { name: "ETF", value: etf },
    { name: "Mutual Fund", value: mf },
  ];
}

/** NNB stacked by Category for each Manager, sorted by absolute total descending. */
export function getNnbByManagerStacked(
  afps: AFP[],
  period: "Month" | "YTD",
  bucket: Bucket,
  monthDate: string,
) {
  const monthList = period === "Month" ? [monthDate] : monthsYTD(monthDate);
  const rows = MASTER_DATA.filter(
    (r) =>
      monthList.includes(r.Date) &&
      (afps.length === 0 || afps.includes(r.AFP)) &&
      bucketOf(r) === bucket,
  );
  const byMgr = new Map<Manager, Record<string, number> & { Manager: Manager; total: number }>();
  for (const r of rows) {
    if (!byMgr.has(r.Manager)) {
      const init = { Manager: r.Manager, total: 0 } as Record<string, number> & {
        Manager: Manager;
        total: number;
      };
      for (const c of CATEGORIES) init[c] = 0;
      byMgr.set(r.Manager, init);
    }
    const row = byMgr.get(r.Manager)!;
    row[r.Category] = (row[r.Category] as number) + r.NNB_USD;
    row.total += r.NNB_USD;
  }
  const data = [...byMgr.values()].sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
  // Collapse small categories into "Others".
  const totals = new Map<string, number>();
  for (const c of CATEGORIES) {
    let t = 0;
    for (const row of data) t += Math.abs((row[c] as number) ?? 0);
    totals.set(c, t);
  }
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const keep = new Set(ranked.slice(0, STACK_TOP_N).map(([k]) => k));
  const dropped = CATEGORIES.filter((c) => !keep.has(c));
  if (dropped.length === 0) return { data, categories: CATEGORIES as string[] };
  for (const row of data) {
    let others = 0;
    for (const c of dropped) {
      others += (row[c] as number) ?? 0;
      delete (row as Record<string, unknown>)[c];
    }
    (row as Record<string, number>)["Others"] = others;
  }
  const keptOrdered = CATEGORIES.filter((c) => keep.has(c));
  return { data, categories: [...keptOrdered, "Others"] };
}

const CATEGORY_PALETTE = [
  "#00B140", // brand green
  "#32CD32", // lime
  "#9ACD32", // yellow-green
  "#FFD700", // gold
  "#FFA500", // orange
  "#1F7A3A", // deep green
  "#FF8C00", // dark orange
  "#BFEA3A", // soft lime
  "#E6C200", // mustard
  "#FFB347", // soft orange
];
export function categoryColor(c: Category) {
  if (c === "Money Market") return "#FFD700";
  if (c === "Others" || c === "Other") return CHART_COLORS.competitor;
  const idx = CATEGORIES.indexOf(c);
  return CATEGORY_PALETTE[(idx >= 0 ? idx : 0) % CATEGORY_PALETTE.length];
}

/** Derive an Asset Class label for a Category by sampling MASTER_DATA. */
const _categoryAssetClassCache = new Map<Category, string>();
export function categoryAssetClass(cat: Category): string {
  if (cat === "Money Market") return "Money Market";
  const cached = _categoryAssetClassCache.get(cat);
  if (cached) return cached;
  const row = MASTER_DATA.find((r) => r.Category === cat && r.Asset_Class);
  const ac = row?.Asset_Class || "Other";
  _categoryAssetClassCache.set(cat, ac);
  return ac;
}

/** Look up Category for a security ISIN (used to derive category for displacement rows). */
export function categoryOfIsin(isin: string): Category | "" {
  const row = MASTER_DATA.find((r) => r.ISIN === isin);
  return row?.Category ?? "";
}

/** Flat single-level composition: leaves are managers OR categories. */
export function getAfpCompositionFlat(
  afps: AFP[],
  bucket: Bucket,
  dimension: "Manager" | "Category",
  monthDate: string,
) {
  const rows = MASTER_DATA.filter(
    (r) =>
      r.Date === monthDate &&
      (afps.length === 0 || afps.includes(r.AFP)) &&
      bucketOf(r) === bucket,
  );
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = dimension === "Manager" ? r.Manager : r.Category;
    map.set(key, (map.get(key) ?? 0) + r.AUM_USD);
  }
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
  return sorted.map(([name, size]) => ({
    name,
    size,
    fill:
      dimension === "Manager"
        ? managerColor(name as Manager)
        : categoryColor(name as Category),
  }));
}

/** Top 5 + Others in the OPPOSITE dimension of the treemap, for the hover donut. */
export function getAfpCompositionDonut(
  afps: AFP[],
  bucket: Bucket,
  dimension: "Manager" | "Category",
  monthDate: string,
) {
  // Opposite dimension
  const opp: "Manager" | "Category" = dimension === "Manager" ? "Category" : "Manager";
  const rows = MASTER_DATA.filter(
    (r) =>
      r.Date === monthDate &&
      (afps.length === 0 || afps.includes(r.AFP)) &&
      bucketOf(r) === bucket,
  );
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = opp === "Manager" ? r.Manager : r.Category;
    map.set(k, (map.get(k) ?? 0) + r.AUM_USD);
  }
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 5);
  const rest = sorted.slice(5).reduce((a, [, v]) => a + v, 0);
  const out = top.map(([name, value]) => ({
    name,
    value,
    fill: opp === "Manager" ? managerColor(name as Manager) : categoryColor(name as Category),
  }));
  if (rest > 0) out.push({ name: "Others", value: rest, fill: CHART_COLORS.competitor });
  return { items: out, dimension: opp };
}

/** Leaf-scoped donut: filter to the hovered manager OR category, then group Top 5 of the opposite dimension + Others. */
export function getAfpCompositionLeafDonut(
  afps: AFP[],
  bucket: Bucket,
  dimension: "Manager" | "Category",
  leafName: string,
  monthDate: string,
) {
  const opp: "Manager" | "Category" = dimension === "Manager" ? "Category" : "Manager";
  const rows = MASTER_DATA.filter(
    (r) =>
      r.Date === monthDate &&
      (afps.length === 0 || afps.includes(r.AFP)) &&
      bucketOf(r) === bucket &&
      (dimension === "Manager" ? r.Manager === leafName : r.Category === leafName),
  );
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = opp === "Manager" ? r.Manager : r.Category;
    map.set(k, (map.get(k) ?? 0) + r.AUM_USD);
  }
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 5);
  const rest = sorted.slice(5).reduce((a, [, v]) => a + v, 0);
  const out = top.map(([name, value]) => ({
    name,
    value,
    fill: opp === "Manager" ? managerColor(name as Manager) : categoryColor(name as Category),
  }));
  if (rest > 0) out.push({ name: "Others", value: rest, fill: CHART_COLORS.competitor });
  return { items: out, dimension: opp, leafName };
}

/**
 * Find the canonical ticker for a security ISIN. Returns the live `Ticker`
 * field if present (ETFs), or empty string for MFs / MMs.
 */
export function tickerOf(isin: string) {
  const row = MASTER_DATA.find((r) => r.ISIN === isin);
  return row?.Ticker ?? "";
}

// ---------- Category composition (% of bucket AUM Org over time) ----------

export function getCategoryCompositionSeries(afps: AFP[], bucket: Bucket) {
  const cats = CATEGORIES.filter((c) =>
    bucket === "Money Market" ? c === "Money Market" : c !== "Money Market",
  );
  const series = MONTHS.map((m) => {
    const rows = rowsAt(m, afps).filter((r) => bucketOf(r) === bucket);
    const raw: Record<string, number> = {};
    let total = 0;
    for (const c of cats) raw[c] = 0;
    for (const r of rows) {
      raw[r.Category] = (raw[r.Category] ?? 0) + r.AUM_USD;
      total += r.AUM_USD;
    }
    const out: Record<string, number | string | Record<string, number>> = { m, total };
    for (const c of cats) out[c] = total ? raw[c] / total : 0;
    out.__raw = raw;
    return out as { m: string; total: number; __raw: Record<string, number> } & Record<string, number>;
  });
  // Collapse small categories into "Others" for readability.
  const totals = new Map<string, number>();
  for (const c of cats) {
    let t = 0;
    for (const row of series) t += row.__raw?.[c] ?? 0;
    totals.set(c, t);
  }
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const keep = new Set(ranked.slice(0, STACK_TOP_N).map(([k]) => k));
  const dropped = ranked.slice(STACK_TOP_N).map(([k]) => k);
  if (dropped.length === 0) return { data: series, categories: cats as string[] };
  const data = series.map((row) => {
    const newRaw: Record<string, number> = {};
    let othersRaw = 0;
    let othersPct = 0;
    for (const c of cats) {
      if (keep.has(c)) newRaw[c] = row.__raw[c] ?? 0;
      else {
        othersRaw += row.__raw[c] ?? 0;
        othersPct += (row[c] as number) ?? 0;
      }
    }
    newRaw["Others"] = othersRaw;
    const out: Record<string, number | string | Record<string, number>> = {
      m: row.m,
      total: row.total,
      __raw: newRaw,
    };
    for (const c of cats) if (keep.has(c)) out[c] = row[c] as number;
    out["Others"] = othersPct;
    return out as typeof row;
  });
  const keptOrdered = cats.filter((c) => keep.has(c));
  return { data, categories: [...keptOrdered, "Others"] };
}

/** Per-position rows for the AFP positions table. */
export function getAfpPositions(
  afps: AFP[],
  portfolio: PortfolioType | "All",
  bucket: Bucket,
  monthDate: string,
) {
  const ytd = monthsYTD(monthDate);
  const rows = MASTER_DATA.filter(
    (r) =>
      ytd.includes(r.Date) &&
      (afps.length === 0 || afps.includes(r.AFP)) &&
      (portfolio === "All" || r.Portfolio_Type === portfolio) &&
      bucketOf(r) === bucket,
  );

  // Total AUM (current month only, same scope) for weight denominator
  const monthRows = rows.filter((r) => r.Date === monthDate);
  const totalAum = sumBy(monthRows, (r) => r.AUM_USD) || 1;

  type Agg = {
    isin: string;
    name: string;
    manager: Manager;
    category: Category;
    aum: number;
    monthNnb: number;
    ytdNnb: number;
  };
  const map = new Map<string, Agg>();
  for (const r of rows) {
    const cur =
      map.get(r.ISIN) ??
      ({
        isin: r.ISIN,
        name: r.Name,
        manager: r.Manager,
        category: r.Category,
        aum: 0,
        monthNnb: 0,
        ytdNnb: 0,
      } as Agg);
    if (r.Date === monthDate) {
      cur.aum += r.AUM_USD;
      cur.monthNnb += r.NNB_USD;
    }
    cur.ytdNnb += r.NNB_USD;
    map.set(r.ISIN, cur);
  }
  return [...map.values()].map((a) => ({
    ...a,
    ticker: tickerOf(a.isin),
    weight: a.aum / totalAum,
  }));
}

// ---------- Flows Intelligence selectors ----------

export type Period = "Month" | "YTD";

function flowRows(
  afps: AFP[],
  bucket: Bucket | "All",
  period: Period,
  date: string,
  managers?: Manager[],
) {
  const dates = period === "YTD" ? monthsYTD(date) : [date];
  return MASTER_DATA.filter(
    (r) =>
      dates.includes(r.Date) &&
      (afps.length === 0 || afps.includes(r.AFP)) &&
      (bucket === "All" || bucketOf(r) === bucket) &&
      (!managers || managers.length === 0 || managers.includes(r.Manager)),
  );
}

/** NNB by manager (all non-zero), sorted descending. */
export function getNnbByManager(afps: AFP[], bucket: Bucket, period: Period, date: string) {
  // Use snapshot columns so totals match KPI methodology.
  const rows = MASTER_DATA.filter(
    (r) =>
      r.Date === date &&
      (afps.length === 0 || afps.includes(r.AFP)) &&
      bucketOf(r) === bucket,
  );
  const field: keyof MasterRow = period === "YTD" ? "NNB_YTD_USD" : "NNB_Month_USD";
  const m = new Map<Manager, number>();
  for (const r of rows) m.set(r.Manager, (m.get(r.Manager) ?? 0) + (r[field] as number));
  return [...m.entries()]
    .map(([Manager, NNB]) => ({ Manager: Manager as string, NNB }))
    .filter((d) => d.NNB !== 0)
    .sort((a, b) => b.NNB - a.NNB);
}

/**
 * BlackRock NNB or NNBF by AFP, split by bucket (ETF / Mutual Fund / Money Market).
 * Uses snapshot columns (NNB_YTD_USD / NNB_Month_USD / NNBF_YTD_USD / NNBF_Month_USD)
 * so totals reconcile with the BLK KPI cards.
 */
export function getBlkFlowsByAfp(
  metric: "NNB" | "NNBF",
  period: Period,
  date: string,
) {
  const field: keyof MasterRow =
    metric === "NNB"
      ? period === "YTD"
        ? "NNB_YTD_USD"
        : "NNB_Month_USD"
      : period === "YTD"
        ? "NNBF_YTD_USD"
        : "NNBF_Month_USD";
  const rows = MASTER_DATA.filter((r) => r.Date === date && r.Manager === "BlackRock");
  const out = AFPS.map((afp) => {
    const row: { AFP: AFP; total: number } & Record<Bucket, number> = {
      AFP: afp,
      ETF: 0,
      "Mutual Fund": 0,
      "Money Market": 0,
      total: 0,
    };
    for (const r of rows.filter((r) => r.AFP === afp)) {
      const b = bucketOf(r);
      const v = r[field] as number;
      row[b] += v;
      row.total += v;
    }
    return row;
  });
  return out.filter((r) => r.ETF !== 0 || r["Mutual Fund"] !== 0 || r["Money Market"] !== 0);
}

/** Cumulative NNB stacked bars: by Manager (X) stacked by Category, or vice versa. */
export function getCumulativeNnbStacked(
  afps: AFP[],
  bucket: Bucket,
  period: Period,
  date: string,
  sortBy: "Manager" | "Category",
) {
  const rows = flowRows(afps, bucket, period, date);
  const cats = CATEGORIES.filter((c) =>
    bucket === "Money Market" ? c === "Money Market" : c !== "Money Market",
  );
  const xs = sortBy === "Manager" ? ([...MANAGERS] as string[]) : (cats as string[]);
  const stackKeys = sortBy === "Manager" ? (cats as string[]) : ([...MANAGERS] as string[]);
  const data = xs.map((x) => {
    const row: Record<string, number | string> = { key: x };
    for (const k of stackKeys) row[k] = 0;
    for (const r of rows) {
      const xKey = sortBy === "Manager" ? r.Manager : r.Category;
      const sKey = sortBy === "Manager" ? r.Category : r.Manager;
      if (xKey === x) row[sKey] = (row[sKey] as number) + r.NNB_USD;
    }
    return row;
  });
  // Drop stack keys whose total across all rows is 0
  const keptStack = stackKeys.filter((k) => {
    let t = 0;
    for (const row of data) t += Math.abs((row[k] as number) ?? 0);
    return t > 0;
  });
  // Drop X rows that are all zero across kept stack keys
  const filtered = data
    .map((row) => {
      const out: Record<string, number | string> = { key: row.key };
      for (const k of keptStack) out[k] = (row[k] as number) ?? 0;
      return out;
    })
    .filter((row) => keptStack.some((k) => (row[k] as number) !== 0));
  return { data: filtered, stackKeys: keptStack };
}

/** Top 5 + Bottom 5 securities by flows. */
export function getTopBottomSecurities(
  afps: AFP[],
  managers: Manager[],
  bucket: Bucket,
  period: Period,
  date: string,
) {
  const rows = flowRows(afps, bucket, period, date, managers);
  const map = new Map<
    string,
    {
      isin: string;
      name: string;
      manager: Manager;
      nnb: number;
      byAfp: Map<AFP, number>;
    }
  >();
  for (const r of rows) {
    const cur =
      map.get(r.ISIN) ??
      { isin: r.ISIN, name: r.Name, manager: r.Manager, nnb: 0, byAfp: new Map<AFP, number>() };
    cur.nnb += r.NNB_USD;
    cur.byAfp.set(r.AFP, (cur.byAfp.get(r.AFP) ?? 0) + r.NNB_USD);
    map.set(r.ISIN, cur);
  }
  const all = [...map.values()].sort((a, b) => b.nnb - a.nnb);
  const shape = (x: typeof all[number], isTop: boolean) => ({
    label: bucket === "ETF" ? tickerOf(x.isin) : x.name,
    nnb: x.nnb,
    manager: x.manager,
    isin: x.isin,
    isTop,
    afpBreakdown: [...x.byAfp.entries()]
      .map(([AFP, NNB]) => ({ AFP, NNB }))
      .sort((a, b) => Math.abs(b.NNB) - Math.abs(a.NNB)),
  });
  const top = all.slice(0, 5).map((x) => shape(x, true));
  const bottom = all.slice(-5).reverse().map((x) => shape(x, false));
  return [...top, ...bottom].sort((a, b) => b.nnb - a.nnb);
}

/** Top 5 + Bottom 5 securities by NNBF (snapshot at selected date). */
export function getTopBottomSecuritiesNnbf(
  afps: AFP[],
  managers: Manager[],
  bucket: Bucket,
  period: Period,
  date: string,
) {
  const field: keyof MasterRow = period === "YTD" ? "NNBF_YTD_USD" : "NNBF_Month_USD";
  const rows = MASTER_DATA.filter(
    (r) =>
      r.Date === date &&
      (afps.length === 0 || afps.includes(r.AFP)) &&
      bucketOf(r) === bucket &&
      (managers.length === 0 || managers.includes(r.Manager)),
  );
  const map = new Map<
    string,
    {
      isin: string;
      name: string;
      manager: Manager;
      nnb: number;
      byAfp: Map<AFP, number>;
    }
  >();
  for (const r of rows) {
    const v = r[field] as number;
    const cur =
      map.get(r.ISIN) ??
      { isin: r.ISIN, name: r.Name, manager: r.Manager, nnb: 0, byAfp: new Map<AFP, number>() };
    cur.nnb += v;
    cur.byAfp.set(r.AFP, (cur.byAfp.get(r.AFP) ?? 0) + v);
    map.set(r.ISIN, cur);
  }
  const all = [...map.values()]
    .filter((x) => x.nnb !== 0)
    .sort((a, b) => b.nnb - a.nnb);
  const shape = (x: typeof all[number], isTop: boolean) => ({
    label: bucket === "ETF" ? tickerOf(x.isin) : x.name,
    nnb: x.nnb,
    manager: x.manager,
    isin: x.isin,
    isTop,
    afpBreakdown: [...x.byAfp.entries()]
      .map(([AFP, NNB]) => ({ AFP, NNB }))
      .sort((a, b) => Math.abs(b.NNB) - Math.abs(a.NNB)),
  });
  const top = all.slice(0, 5).map((x) => shape(x, true));
  const bottom = all.slice(-5).reverse().map((x) => shape(x, false));
  return [...top, ...bottom].sort((a, b) => b.nnb - a.nnb);
}

/** Monthly NNB stacked by bucket (ETF / Mutual Fund / Money Market). */
export function getMonthlyBucketFlows(afps: AFP[]) {
  return MONTHS.map((m) => {
    const row: Record<string, number | string> = { m, ETF: 0, "Mutual Fund": 0, "Money Market": 0 };
    const rs = rowsAt(m, afps);
    for (const r of rs) {
      const b = bucketOf(r);
      row[b] = (row[b] as number) + r.NNB_USD;
    }
    return row;
  });
}

/** Filterable scatter for Performance vs Flows. */
export function getScatterFiltered(
  afps: AFP[],
  managers: Manager[],
  categories: Category[],
  period: Period,
  date: string,
  bucket: "ETF" | "Mutual Fund" = "ETF",
) {
  const dates = period === "YTD" ? monthsYTD(date) : [date];
  const rows = MASTER_DATA.filter(
    (r) =>
      dates.includes(r.Date) &&
      (afps.length === 0 || afps.includes(r.AFP)) &&
      (managers.length === 0 || managers.includes(r.Manager)) &&
      (categories.length === 0 || categories.includes(r.Category)) &&
      bucketOf(r) === bucket,
  );
  const map = new Map<
    string,
    {
      Manager: Manager;
      AUM: number;
      NNB: number;
      Perf: number;
      Name: string;
      Ticker: string;
      Bucket: "ETF" | "Mutual Fund";
    }
  >();
  for (const r of rows) {
    const cur = map.get(r.ISIN);
    const perf = period === "YTD" ? r.Perf_YTD : r.Perf_Month;
    if (cur) {
      cur.AUM += r.AUM_USD;
      cur.NNB += r.NNB_USD;
      cur.Perf = perf;
    } else {
      map.set(r.ISIN, {
        Manager: r.Manager,
        AUM: r.AUM_USD,
        NNB: r.NNB_USD,
        Perf: perf,
        Name: r.Name,
        Ticker: tickerOf(r.ISIN),
        Bucket: bucket,
      });
    }
  }
  return [...map.values()];
}

// ---------- Revenue & Fees Analytics selectors ----------

/** Top 10 managers by RRR Org (+ Others) with weighted fee & AUM for the selected bucket/month. */
export function getManagerAumFee(afps: AFP[], bucket: Bucket, date: string) {
  const rows = MASTER_DATA.filter(
    (r) =>
      r.Date === date &&
      (afps.length === 0 || afps.includes(r.AFP)) &&
      bucketOf(r) === bucket,
  );
  const by = new Map<Manager, { AUM: number; RRR: number; feeWeight: number }>();
  for (const r of rows) {
    const c = by.get(r.Manager) ?? { AUM: 0, RRR: 0, feeWeight: 0 };
    c.AUM += r.AUM_USD;
    c.RRR += r.RRR_USD;
    c.feeWeight += r.Fee_bps * r.AUM_USD;
    by.set(r.Manager, c);
  }
  const all = [...by.entries()]
    .map(([Manager, v]) => ({
      Manager: Manager as string,
      AUM: v.AUM,
      RRR: v.RRR,
      Fee_bps: v.AUM ? v.feeWeight / v.AUM : 0,
    }))
    .sort((a, b) => b.RRR - a.RRR);
  const top = all.slice(0, 10);
  const rest = all.slice(10);
  if (rest.length) {
    const aum = rest.reduce((a, b) => a + b.AUM, 0);
    const rrr = rest.reduce((a, b) => a + b.RRR, 0);
    const fw = rest.reduce((a, b) => a + b.Fee_bps * b.AUM, 0);
    top.push({ Manager: "Others", AUM: aum, RRR: rrr, Fee_bps: aum ? fw / aum : 0 });
  }
  return top;
}

/** Fee heatmap: rows = Categories, cols = top 5 Managers. */
export function getFeeHeatmap(
  afps: AFP[],
  bucket: Bucket,
  date: string,
  assetClass: AssetClassFilter = "All",
) {
  const rows = MASTER_DATA.filter(
    (r) =>
      r.Date === date &&
      (afps.length === 0 || afps.includes(r.AFP)) &&
      bucketOf(r) === bucket &&
      (assetClass === "All" || r.Asset_Class === assetClass),
  );
  const cats = CATEGORIES.filter((c) => {
    if (bucket === "Money Market" ? c !== "Money Market" : c === "Money Market") return false;
    if (assetClass !== "All" && categoryAssetClass(c) !== assetClass) return false;
    return true;
  });
  const mgrAum = new Map<Manager, number>();
  for (const r of rows) mgrAum.set(r.Manager, (mgrAum.get(r.Manager) ?? 0) + r.AUM_USD);
  const managers = [...mgrAum.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([m]) => m);
  const cells = cats.map((cat) =>
    managers.map((mgr) => {
      const sub = rows.filter((r) => r.Category === cat && r.Manager === mgr);
      const aum = sumBy(sub, (r) => r.AUM_USD);
      const fw = sumBy(sub, (r) => r.Fee_bps * r.AUM_USD);
      // Aggregate per-product (ISIN) AUM & fee for hover-card top 3.
      const byIsin = new Map<string, { Name: string; Ticker: string; AUM: number; Fee_bps: number }>();
      for (const r of sub) {
        const cur = byIsin.get(r.ISIN);
        if (cur) cur.AUM += r.AUM_USD;
        else
          byIsin.set(r.ISIN, {
            Name: r.Name,
            Ticker: tickerOf(r.ISIN),
            AUM: r.AUM_USD,
            Fee_bps: r.Fee_bps,
          });
      }
      const topProducts = [...byIsin.values()]
        .sort((a, b) => b.AUM - a.AUM)
        .slice(0, 3);
      return { fee: aum ? fw / aum : 0, aum, topProducts };
    }),
  );
  return { categories: cats as string[], managers: managers as string[], cells };
}

/** Per-security fee vs NNB scatter with per-AFP AUM breakdown for hover. */
export function getSecurityFeeNnb(
  afps: AFP[],
  managers: Manager[],
  categories: Category[],
  period: Period,
  date: string,
  feeMinBps: number,
  assetClass: AssetClassFilter = "All",
) {
  const dates = period === "YTD" ? monthsYTD(date) : [date];
  const rows = MASTER_DATA.filter(
    (r) =>
      dates.includes(r.Date) &&
      (afps.length === 0 || afps.includes(r.AFP)) &&
      (managers.length === 0 || managers.includes(r.Manager)) &&
      (categories.length === 0 || categories.includes(r.Category)) &&
      (assetClass === "All" || r.Asset_Class === assetClass),
  );
  type Sec = {
    ISIN: string;
    Name: string;
    Ticker: string;
    Category: Category;
    Manager: Manager;
    NNB: number;
    Fee_bps: number;
    byAfp: Map<AFP, number>;
  };
  const m = new Map<string, Sec>();
  for (const r of rows) {
    let s = m.get(r.ISIN);
    if (!s) {
      s = {
        ISIN: r.ISIN,
        Name: r.Name,
        Ticker: tickerOf(r.ISIN),
        Category: r.Category,
        Manager: r.Manager,
        NNB: 0,
        Fee_bps: r.Fee_bps,
        byAfp: new Map(),
      };
      m.set(r.ISIN, s);
    }
    s.NNB += r.NNB_USD;
    if (r.Date === date) s.byAfp.set(r.AFP, (s.byAfp.get(r.AFP) ?? 0) + r.AUM_USD);
  }
  return [...m.values()]
    .filter((s) => s.Fee_bps >= feeMinBps)
    .map((s) => ({
      ISIN: s.ISIN,
      Name: s.Name,
      Ticker: s.Ticker,
      Category: s.Category,
      Manager: s.Manager,
      NNB: s.NNB,
      Fee_bps: s.Fee_bps,
      byAfp: [...s.byAfp.entries()]
        .map(([AFP, AUM]) => ({ AFP, AUM }))
        .sort((a, b) => b.AUM - a.AUM),
    }));
}

/** RRR by AFP, stacked by Category. */
export function getRrrByAfpCategory(managers: Manager[], bucket: Bucket, date: string) {
  const rows = MASTER_DATA.filter(
    (r) =>
      r.Date === date &&
      bucketOf(r) === bucket &&
      (managers.length === 0 || managers.includes(r.Manager)),
  );
  const cats = CATEGORIES.filter((c) =>
    bucket === "Money Market" ? c === "Money Market" : c !== "Money Market",
  );
  const data = AFPS.map((afp) => {
    const row: Record<string, number | string> = { AFP: afp };
    for (const c of cats) row[c] = 0;
    for (const r of rows.filter((r) => r.AFP === afp)) {
      row[r.Category] = (row[r.Category] as number) + r.RRR_USD;
    }
    return row;
  });
  // Collapse small categories into "Others" for readability.
  const totals = new Map<string, number>();
  for (const c of cats) {
    let t = 0;
    for (const row of data) t += Math.abs((row[c] as number) ?? 0);
    totals.set(c, t);
  }
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const keep = new Set(ranked.slice(0, STACK_TOP_N).map(([k]) => k));
  const dropped = (cats as string[]).filter((c) => !keep.has(c));
  if (dropped.length === 0) return { data, categories: cats as string[] };
  for (const row of data) {
    let others = 0;
    for (const c of dropped) {
      others += (row[c] as number) ?? 0;
      delete (row as Record<string, unknown>)[c];
    }
    row["Others"] = others;
  }
  const keptOrdered = (cats as string[]).filter((c) => keep.has(c));
  return { data, categories: [...keptOrdered, "Others"] };
}

/** Category fee bubbles: system vs selected AFP, with category AUM share & BLK share. */
export function getCategoryFeeBubbles(
  afp: AFP,
  bucket: Bucket | "All",
  date: string,
  assetClass: AssetClassFilter = "All",
) {
  const all = MASTER_DATA.filter(
    (r) =>
      r.Date === date &&
      (bucket === "All" || bucketOf(r) === bucket) &&
      (assetClass === "All" || r.Asset_Class === assetClass),
  );
  const totalAll = sumBy(all, (r) => r.AUM_USD) || 1;
  const cats = CATEGORIES.filter((c) => {
    if (bucket === "Money Market" && c !== "Money Market") return false;
    if (assetClass !== "All" && categoryAssetClass(c) !== assetClass) return false;
    return true;
  });
  return cats.map((cat) => {
    const inCat = all.filter((r) => r.Category === cat);
    const sysAum = sumBy(inCat, (r) => r.AUM_USD);
    const sysFw = sumBy(inCat, (r) => r.Fee_bps * r.AUM_USD);
    const sysFee = sysAum ? sysFw / sysAum : 0;
    const afpRows = inCat.filter((r) => r.AFP === afp);
    const afpAum = sumBy(afpRows, (r) => r.AUM_USD);
    const afpFw = sumBy(afpRows, (r) => r.Fee_bps * r.AUM_USD);
    const afpFee = afpAum ? afpFw / afpAum : 0;
    const sharePct = (sysAum / totalAll) * 100;
    const blkAum = sumBy(
      inCat.filter((r) => r.Manager === "BlackRock"),
      (r) => r.AUM_USD,
    );
    const blkSharePct = sysAum ? (blkAum / sysAum) * 100 : 0;
    return { Category: cat as string, sysFee, afpFee, sharePct, blkSharePct };
  });
}
// ---------- Product Penetration ----------

export function getPenetrationHeatmap(opts: {
  bucket: Bucket | "All";
  portfolioTypes: PortfolioType[];
  date: string;
  assetClass?: "All" | "Equity" | "Fixed Income";
}) {
  const { bucket, portfolioTypes, date, assetClass = "All" } = opts;
  const ptSet = portfolioTypes.length ? new Set(portfolioTypes) : null;
  const rows = MASTER_DATA.filter(
    (r) =>
      r.Date === date &&
      (bucket === "All" || bucketOf(r) === bucket) &&
      (!ptSet || ptSet.has(r.Portfolio_Type)) &&
      (assetClass === "All" || categoryAssetClass(r.Category) === assetClass),
  );

  // Sort categories by total AUM desc
  const catTotals = new Map<Category, number>();
  for (const r of rows)
    catTotals.set(r.Category, (catTotals.get(r.Category) ?? 0) + r.AUM_USD);
  const categories = [...CATEGORIES]
    .filter((c) => (catTotals.get(c) ?? 0) > 0)
    .filter((c) => assetClass === "All" || categoryAssetClass(c) === assetClass)
    .sort((a, b) => (catTotals.get(b) ?? 0) - (catTotals.get(a) ?? 0));
  const afps = [...AFPS];

  const cells = categories.map((cat) =>
    afps.map((afp) => {
      const slice = rows.filter((r) => r.Category === cat && r.AFP === afp);
      const total = sumBy(slice, (r) => r.AUM_USD);
      const blk = sumBy(
        slice.filter((r) => r.Manager === "BlackRock"),
        (r) => r.AUM_USD,
      );
      const blkShare = total ? blk / total : 0;
      const byMgr = new Map<Manager, number>();
      for (const r of slice)
        byMgr.set(r.Manager, (byMgr.get(r.Manager) ?? 0) + r.AUM_USD);
      const topManagers = [...byMgr.entries()]
        .map(([Manager, AUM]) => ({ Manager, sharePct: total ? (AUM / total) * 100 : 0 }))
        .sort((a, b) => b.sharePct - a.sharePct)
        .slice(0, 3);
      return { blkShare, totalAUM: total, topManagers };
    }),
  );

  return { categories, afps, cells };
}

export interface BelowWeightRow {
  Category: Category;
  AFP: AFP;
  blkShare: number;
  cellAUM: number;
  ISIN: string;
  Ticker: string;
  Name: string;
  Manager: Manager;
  Asset_Type: string;
  AUM_USD: number;
  YTD_Perf: number;
  NNB_USD: number;
}

export function getBelowWeightSecurities(opts: {
  bucket: Bucket | "All";
  portfolioTypes: PortfolioType[];
  date: string;
  threshold?: number;
  assetClass?: "All" | "Equity" | "Fixed Income";
}): BelowWeightRow[] {
  const { bucket, portfolioTypes, date, threshold = 0.65, assetClass = "All" } = opts;
  const { categories, afps, cells } = getPenetrationHeatmap({ bucket, portfolioTypes, date, assetClass });
  const ptSet = portfolioTypes.length ? new Set(portfolioTypes) : null;
  const rows = MASTER_DATA.filter(
    (r) =>
      r.Date === date &&
      (bucket === "All" || bucketOf(r) === bucket) &&
      (!ptSet || ptSet.has(r.Portfolio_Type)) &&
      (assetClass === "All" || categoryAssetClass(r.Category) === assetClass),
  );

  // YTD NNB by ISIN+AFP
  const ytdMonths = monthsYTD(date);
  const ytdRows = MASTER_DATA.filter(
    (r) =>
      ytdMonths.includes(r.Date) &&
      (bucket === "All" || bucketOf(r) === bucket) &&
      (!ptSet || ptSet.has(r.Portfolio_Type)) &&
      (assetClass === "All" || categoryAssetClass(r.Category) === assetClass),
  );
  const ytdKey = (afp: AFP, isin: string) => `${afp}|${isin}`;
  const ytdNnb = new Map<string, number>();
  for (const r of ytdRows)
    ytdNnb.set(
      ytdKey(r.AFP, r.ISIN),
      (ytdNnb.get(ytdKey(r.AFP, r.ISIN)) ?? 0) + r.NNB_USD,
    );

  const out: BelowWeightRow[] = [];
  categories.forEach((cat, ci) => {
    afps.forEach((afp, ai) => {
      const cell = cells[ci][ai];
      if (cell.totalAUM <= 0 || cell.blkShare >= threshold) return;
      // collapse to one row per ISIN within (cat, afp)
      const inCell = rows.filter((r) => r.Category === cat && r.AFP === afp);
      const byIsin = new Map<string, MasterRow & { _aum: number }>();
      for (const r of inCell) {
        const cur = byIsin.get(r.ISIN);
        if (cur) cur._aum += r.AUM_USD;
        else byIsin.set(r.ISIN, { ...r, _aum: r.AUM_USD });
      }
      for (const r of byIsin.values()) {
        out.push({
          Category: cat,
          AFP: afp,
          blkShare: cell.blkShare,
          cellAUM: cell.totalAUM,
          ISIN: r.ISIN,
          Ticker: tickerOf(r.ISIN),
          Name: r.Name,
          Manager: r.Manager,
          Asset_Type: r.Asset_Type,
          AUM_USD: r._aum,
          YTD_Perf: r.YTD_Perf,
          NNB_USD: ytdNnb.get(ytdKey(afp, r.ISIN)) ?? 0,
        });
      }
    });
  });
  return out;
}

// ============================================================================
// UCITS Snapshot selectors
// ============================================================================

export type DomicileGroup = "US" | "UCITS" | "Other";
export function domicileGroup(r: MasterRow): DomicileGroup {
  const d = (r.Domicile || "").trim().toUpperCase();
  if (d === "US") return "US";
  if (d === "IE" || d === "LU") return "UCITS";
  return "Other";
}

export const DOMICILE_COLORS: Record<DomicileGroup, string> = {
  US: "#00B140",
  UCITS: "#1F4E8C",
  Other: "#999999",
};

/** Month-by-month AUM_Org composition (US vs UCITS vs Other) across selected AFPs. */
export function getDomicileCompositionSeries(afps: AFP[]) {
  return MONTHS.map((m) => {
    const row: Record<string, number | string> = { m, US: 0, UCITS: 0, Other: 0 };
    for (const r of rowsAt(m, afps)) {
      if (bucketOf(r) !== "ETF") continue;
      const g = domicileGroup(r);
      row[g] = (row[g] as number) + r.AUM_USD;
    }
    return row;
  });
}

/** US vs UCITS NNB by AFP, diverging on sign. */
export function getDomicileNnbByAfp(period: "Month" | "YTD", date: string) {
  const field: keyof MasterRow = period === "YTD" ? "NNB_YTD_USD" : "NNB_Month_USD";
  return AFPS.map((afp) => {
    const rows = MASTER_DATA.filter(
      (r) => r.Date === date && r.AFP === afp && bucketOf(r) === "ETF",
    );
    let us = 0, ucits = 0, other = 0;
    for (const r of rows) {
      const v = r[field] as number;
      const g = domicileGroup(r);
      if (g === "US") us += v;
      else if (g === "UCITS") ucits += v;
      else other += v;
    }
    return { AFP: afp, US: us, UCITS: ucits, Other: other, total: us + ucits + other };
  }).filter((r) => r.US !== 0 || r.UCITS !== 0 || r.Other !== 0);
}

/** Top 5 + Others manager market share within UCITS ETFs (IE/LU), per AFP, % adding to 100. */
export function getUcitsEtfManagerShareByAfp(date: string) {
  const rows = MASTER_DATA.filter(
    (r) => r.Date === date && bucketOf(r) === "ETF" && domicileGroup(r) === "UCITS",
  );
  // Determine top 5 managers globally within UCITS ETFs by AUM
  const totals = new Map<Manager, number>();
  for (const r of rows) totals.set(r.Manager, (totals.get(r.Manager) ?? 0) + r.AUM_USD);
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 5).map(([k]) => k);
  const data = AFPS.map((afp) => {
    const sub = rows.filter((r) => r.AFP === afp);
    const total = sumBy(sub, (r) => r.AUM_USD) || 0;
    const row: Record<string, number | string> = { AFP: afp };
    let othersAbs = 0;
    const m = new Map<Manager, number>();
    for (const r of sub) m.set(r.Manager, (m.get(r.Manager) ?? 0) + r.AUM_USD);
    for (const [k, v] of m) {
      if (top.includes(k)) row[k] = total ? (v / total) * 100 : 0;
      else othersAbs += v;
    }
    for (const k of top) if (!(k in row)) row[k] = 0;
    row["Others"] = total ? (othersAbs / total) * 100 : 0;
    return row;
  }).filter((r) => {
    return [...top, "Others"].some((k) => (r[k] as number) > 0);
  });
  return { data, managers: [...top, "Others"] as string[] };
}

/** US vs UCITS share by Category (100% stacked), filtered by Asset Class. */
export function getDomicileShareByCategory(
  date: string,
  assetClass: AssetClassFilter,
) {
  const rows = MASTER_DATA.filter(
    (r) =>
      r.Date === date &&
      bucketOf(r) === "ETF" &&
      (assetClass === "All" || r.Asset_Class === assetClass),
  );
  const cats = CATEGORIES.filter(
    (c) => assetClass === "All" || categoryAssetClass(c) === assetClass,
  );
  return cats
    .map((cat) => {
      const sub = rows.filter((r) => r.Category === cat);
      const total = sumBy(sub, (r) => r.AUM_USD) || 0;
      let us = 0, ucits = 0, other = 0;
      for (const r of sub) {
        const g = domicileGroup(r);
        if (g === "US") us += r.AUM_USD;
        else if (g === "UCITS") ucits += r.AUM_USD;
        else other += r.AUM_USD;
      }
      return {
        category: cat,
        US: total ? (us / total) * 100 : 0,
        UCITS: total ? (ucits / total) * 100 : 0,
        Other: total ? (other / total) * 100 : 0,
        total,
      };
    })
    .filter((r) => r.total > 0);
}

/** UCITS NNB by Category (Month or YTD), with optional AFP and Category filters. */
export function getUcitsNnbByCategory(
  period: "Month" | "YTD",
  date: string,
  afps: AFP[],
  categories: Category[],
) {
  const field: keyof MasterRow = period === "YTD" ? "NNB_YTD_USD" : "NNB_Month_USD";
  const rows = MASTER_DATA.filter(
    (r) =>
      r.Date === date &&
      bucketOf(r) === "ETF" &&
      domicileGroup(r) === "UCITS" &&
      (afps.length === 0 || afps.includes(r.AFP)) &&
      (categories.length === 0 || categories.includes(r.Category)),
  );
  const m = new Map<Category, number>();
  for (const r of rows) m.set(r.Category, (m.get(r.Category) ?? 0) + (r[field] as number));
  return [...m.entries()]
    .map(([Category, NNB]) => ({ Category, NNB }))
    .filter((d) => d.NNB !== 0)
    .sort((a, b) => b.NNB - a.NNB);
}

/** Aggregated AUM_Org by AFP for a given ISIN, across all months in dataset (current month). */
export function getSecurityAumByAfp(isin: string, date: string) {
  const rows = MASTER_DATA.filter((r) => r.ISIN === isin && r.Date === date);
  const m = new Map<AFP, number>();
  for (const r of rows) m.set(r.AFP, (m.get(r.AFP) ?? 0) + r.AUM_USD);
  return [...m.entries()]
    .map(([AFP, AUM]) => ({ AFP, AUM }))
    .sort((a, b) => b.AUM - a.AUM);
}

// ---------- New Products (vs December 2025 baseline) ----------

export const NEW_PRODUCTS_BASELINE_MONTH = "2025-12";

export interface NewProductRow {
  isin: string;
  ticker: string;
  name: string;
  manager: Manager;
  category: Category;
  feeBps: number;
  ytdNnb: number;
  ytdNnbf: number;
  aum: number;
  byAfp: { AFP: AFP; ytdNnb: number }[];
}

/**
 * ETFs / MFs that did not exist (or had zero AUM) in the baseline month
 * but appear in the selected month. Aggregated across AFPs.
 */
export function getNewProducts(
  date: string,
  bucket: Bucket,
): NewProductRow[] {
  const baseline = NEW_PRODUCTS_BASELINE_MONTH;
  // ISINs with non-zero AUM in baseline
  const baselineIsins = new Set<string>();
  for (const r of MASTER_DATA) {
    if (r.Date === baseline && r.AUM_USD > 0) baselineIsins.add(r.ISIN);
  }
  const cur = MASTER_DATA.filter(
    (r) => r.Date === date && bucketOf(r) === bucket && !baselineIsins.has(r.ISIN),
  );
  const map = new Map<string, NewProductRow>();
  for (const r of cur) {
    let row = map.get(r.ISIN);
    if (!row) {
      row = {
        isin: r.ISIN,
        ticker: r.Ticker || r.ISIN,
        name: r.Name,
        manager: r.Manager,
        category: r.Category,
        feeBps: 0,
        ytdNnb: 0,
        ytdNnbf: 0,
        aum: 0,
        byAfp: [],
      };
      map.set(r.ISIN, row);
    }
    row.ytdNnb += r.NNB_YTD_USD;
    row.ytdNnbf += r.NNBF_YTD_USD;
    row.aum += r.AUM_USD;
  }
  // AUM-weighted fee + per-AFP breakdown
  for (const row of map.values()) {
    const rs = cur.filter((r) => r.ISIN === row.isin);
    const totalAum = rs.reduce((a, b) => a + b.AUM_USD, 0);
    row.feeBps = totalAum
      ? rs.reduce((a, b) => a + b.Fee_bps * b.AUM_USD, 0) / totalAum
      : (rs[0]?.Fee_bps ?? 0);
    const am = new Map<AFP, number>();
    for (const r of rs) am.set(r.AFP, (am.get(r.AFP) ?? 0) + r.NNB_YTD_USD);
    row.byAfp = [...am.entries()]
      .map(([AFP, ytdNnb]) => ({ AFP, ytdNnb }))
      .sort((a, b) => b.ytdNnb - a.ytdNnb);
  }
  return [...map.values()].sort((a, b) => b.ytdNnb - a.ytdNnb);
}

/** Aggregate YTD NNB by manager from a NewProductRow list, sorted desc. */
export function aggregateNewProductsByManager(rows: NewProductRow[]) {
  const m = new Map<Manager, number>();
  for (const r of rows) m.set(r.manager, (m.get(r.manager) ?? 0) + r.ytdNnb);
  return [...m.entries()]
    .map(([Manager, NNB]) => ({ Manager, NNB }))
    .sort((a, b) => b.NNB - a.NNB);
}

/**
 * Products that previously had AUM but do NOT appear (or have zero AUM) in the
 * selected month. Uses the latest prior month they appeared as the source for
 * fee / YTD NNB / AUM and AFP breakdown.
 */
export function getDroppedProducts(
  date: string,
  bucket: Bucket,
): NewProductRow[] {
  // ISINs present with AUM>0 in current month
  const currentIsins = new Set<string>();
  for (const r of MASTER_DATA) {
    if (r.Date === date && bucketOf(r) === bucket && r.AUM_USD > 0) {
      currentIsins.add(r.ISIN);
    }
  }
  // Per ISIN, latest prior month with AUM>0
  const latestByIsin = new Map<string, string>();
  for (const r of MASTER_DATA) {
    if (r.Date >= date) continue;
    if (bucketOf(r) !== bucket) continue;
    if (r.AUM_USD <= 0) continue;
    if (currentIsins.has(r.ISIN)) continue;
    const prev = latestByIsin.get(r.ISIN);
    if (!prev || r.Date > prev) latestByIsin.set(r.ISIN, r.Date);
  }
  const map = new Map<string, NewProductRow>();
  for (const [isin, lastDate] of latestByIsin.entries()) {
    const rs = MASTER_DATA.filter((r) => r.ISIN === isin && r.Date === lastDate);
    if (rs.length === 0) continue;
    const sample = rs[0];
    const totalAum = rs.reduce((a, b) => a + b.AUM_USD, 0);
    const am = new Map<AFP, number>();
    for (const r of rs) am.set(r.AFP, (am.get(r.AFP) ?? 0) + r.NNB_YTD_USD);
    map.set(isin, {
      isin,
      ticker: sample.Ticker || sample.ISIN,
      name: sample.Name,
      manager: sample.Manager,
      category: sample.Category,
      feeBps: totalAum
        ? rs.reduce((a, b) => a + b.Fee_bps * b.AUM_USD, 0) / totalAum
        : sample.Fee_bps,
      ytdNnb: rs.reduce((a, b) => a + b.NNB_YTD_USD, 0),
      ytdNnbf: rs.reduce((a, b) => a + b.NNBF_YTD_USD, 0),
      aum: totalAum,
      byAfp: [...am.entries()]
        .map(([AFP, ytdNnb]) => ({ AFP, ytdNnb }))
        .sort((a, b) => b.ytdNnb - a.ytdNnb),
    });
  }
  return [...map.values()].sort((a, b) => Math.abs(b.aum) - Math.abs(a.aum));
}

// ============================================================================
// Performance Analytics helpers
// ============================================================================

const PERF_BASELINE_MONTH = "2025-12";

function wavg(rows: MasterRow[], pick: (r: MasterRow) => number): number {
  let num = 0;
  let den = 0;
  for (const r of rows) {
    const w = r.AUM_USD;
    if (!w) continue;
    num += pick(r) * w;
    den += w;
  }
  return den > 0 ? num / den : 0;
}

export interface CumPerfPoint {
  month: string;
  [series: string]: number | string;
}

export function getCumulativePerformanceSeries(
  _asOf?: string,
): CumPerfPoint[] {
  const months = MONTHS.filter((m) => m >= PERF_BASELINE_MONTH);
  if (!months.length) return [];

  const out: CumPerfPoint[] = [];
  for (const m of months) {
    const monthRows = MASTER_DATA.filter((r) => r.Date === m);
    const point: CumPerfPoint = { month: m };
    // Per-AFP simple average of cumulative_performance
    const afpIndex: Record<string, number> = {};
    const afpAum: Record<string, number> = {};
    for (const a of AFPS) {
      const rs = monthRows.filter((r) => r.AFP === a && Number.isFinite(r.Cumulative_Perf) && r.Cumulative_Perf > 0);
      if (!rs.length) continue;
      const avg = rs.reduce((s, r) => s + r.Cumulative_Perf, 0) / rs.length;
      afpIndex[a] = avg;
      afpAum[a] = rs.reduce((s, r) => s + r.AUM_USD, 0);
      point[a] = avg;
    }
    // System: AUM-weighted avg of AFP index levels
    const totAum = Object.values(afpAum).reduce((a, b) => a + b, 0);
    if (totAum > 0) {
      const sys = Object.keys(afpIndex).reduce(
        (s, a) => s + afpIndex[a] * afpAum[a],
        0,
      ) / totAum;
      point.System = sys;
    }
    out.push(point);
  }
  return out;
}

export interface CategoryAfpBubble {
  group: AFP | "System";
  category: Category;
  weight: number; // 0..1 of total portfolio
  ytdPerf: number; // percent units
  aum: number;
  topHoldings: { name: string; aum: number }[];
}

export function getCategoryAfpBubbles(
  asOf: string,
  assetClass: "Equity" | "Fixed Income",
): CategoryAfpBubble[] {
  if (!asOf) return [];
  const monthRows = MASTER_DATA.filter((r) => r.Date === asOf);
  const out: CategoryAfpBubble[] = [];

  const buildFor = (group: AFP | "System", rows: MasterRow[]) => {
    const totalAum = rows.reduce((a, b) => a + b.AUM_USD, 0);
    if (!totalAum) return;
    const acRows = rows.filter((r) => r.Asset_Class === assetClass);
    const cats = Array.from(new Set(acRows.map((r) => r.Category)));
    for (const c of cats) {
      const cr = acRows.filter((r) => r.Category === c);
      const aum = cr.reduce((a, b) => a + b.AUM_USD, 0);
      if (aum <= 0) continue;
      out.push({
        group,
        category: c,
        weight: aum / totalAum,
        ytdPerf: wavg(cr, (r) => r.Perf_YTD),
        aum,
        topHoldings: topHoldingsFor(cr, 5),
      });
    }
  };

  buildFor("System", monthRows);
  for (const a of AFPS) buildFor(a, monthRows.filter((r) => r.AFP === a));
  return out;
}

export interface AssetClassBubble {
  group: AFP | "System";
  weight: number;
  ytdPerf: number;
}

export function getAssetClassWeightVsPerf(
  asOf: string,
  assetClass: "Equity" | "Fixed Income",
): AssetClassBubble[] {
  if (!asOf) return [];
  const monthRows = MASTER_DATA.filter((r) => r.Date === asOf);
  const out: AssetClassBubble[] = [];
  const buildFor = (group: AFP | "System", rows: MasterRow[]) => {
    const totalAum = rows.reduce((a, b) => a + b.AUM_USD, 0);
    if (!totalAum) return;
    const acRows = rows.filter((r) => r.Asset_Class === assetClass);
    const acAum = acRows.reduce((a, b) => a + b.AUM_USD, 0);
    out.push({
      group,
      weight: acAum / totalAum,
      ytdPerf: wavg(acRows, (r) => r.Perf_YTD),
    });
  };
  buildFor("System", monthRows);
  for (const a of AFPS) buildFor(a, monthRows.filter((r) => r.AFP === a));
  return out;
}

export interface CategoryDispersionPoint {
  group: AFP | "System";
  weight: number;
  ytdPerf: number;
  topHoldings: { name: string; aum: number }[];
}

export function getCategoryDispersion(
  asOf: string,
  assetClass: "Equity" | "Fixed Income",
  category: Category,
): { points: CategoryDispersionPoint[]; systemWeight: number; systemYtd: number } {
  if (!asOf || !category) return { points: [], systemWeight: 0, systemYtd: 0 };
  const monthRows = MASTER_DATA.filter(
    (r) => r.Date === asOf && r.Asset_Class === assetClass,
  );
  const points: CategoryDispersionPoint[] = [];

  const compute = (rows: MasterRow[]): { weight: number; ytdPerf: number } => {
    const totalAum = rows.reduce((a, b) => a + b.AUM_USD, 0);
    const cr = rows.filter((r) => r.Category === category);
    const cAum = cr.reduce((a, b) => a + b.AUM_USD, 0);
    return {
      weight: totalAum ? cAum / totalAum : 0,
      ytdPerf: wavg(cr, (r) => r.Perf_YTD),
    };
  };

  // System uses ALL asset-class rows for total denominator? Use whole portfolio:
  const systemAll = MASTER_DATA.filter((r) => r.Date === asOf);
  const sysTotalAum = systemAll.reduce((a, b) => a + b.AUM_USD, 0);
  const sysCatRows = monthRows.filter((r) => r.Category === category);
  const sysCatAum = sysCatRows.reduce((a, b) => a + b.AUM_USD, 0);
  const systemWeight = sysTotalAum ? sysCatAum / sysTotalAum : 0;
  const systemYtd = wavg(sysCatRows, (r) => r.Perf_YTD);
  points.push({
    group: "System",
    weight: systemWeight,
    ytdPerf: systemYtd,
    topHoldings: topHoldingsFor(sysCatRows, 5),
  });

  for (const a of AFPS) {
    const afpAll = systemAll.filter((r) => r.AFP === a);
    const totalAum = afpAll.reduce((s, b) => s + b.AUM_USD, 0);
    const cr = afpAll.filter((r) => r.Asset_Class === assetClass && r.Category === category);
    const cAum = cr.reduce((s, b) => s + b.AUM_USD, 0);
    if (cAum <= 0) continue;
    points.push({
      group: a,
      weight: totalAum ? cAum / totalAum : 0,
      ytdPerf: wavg(cr, (r) => r.Perf_YTD),
      topHoldings: topHoldingsFor(cr, 5),
    });
  }

  return { points, systemWeight, systemYtd };
}

function topHoldingsFor(rows: MasterRow[], n: number): { name: string; aum: number }[] {
  const map = new Map<string, { name: string; aum: number }>();
  for (const r of rows) {
    const key = r.ISIN || r.Ticker || r.Name;
    const label = r.Name || r.Ticker || r.ISIN;
    const cur = map.get(key);
    if (cur) cur.aum += r.AUM_USD;
    else map.set(key, { name: label, aum: r.AUM_USD });
  }
  return Array.from(map.values())
    .sort((a, b) => b.aum - a.aum)
    .slice(0, n);
}

// ---------- Manager Deep Dive selectors ----------

function productLabel(r: MasterRow) {
  return r.Asset_Type === "ETF" && r.Ticker ? r.Ticker : r.Name;
}

export type FundType = "All" | "ETF" | "Mutual Fund" | "Money Market";
export const FUND_TYPES: FundType[] = ["All", "ETF", "Mutual Fund", "Money Market"];
function matchesFundType(r: MasterRow, ft: FundType) {
  return ft === "All" ? true : bucketOf(r) === ft;
}

/** Per-AFP AUM for a single manager at a given date. */
export function getManagerAumByAfp(manager: Manager, date: string, fundType: FundType = "All") {
  const rows = MASTER_DATA.filter(
    (r) => r.Date === date && r.Manager === manager && matchesFundType(r, fundType),
  );
  const map = new Map<AFP, number>();
  for (const a of AFPS) map.set(a, 0);
  for (const r of rows) map.set(r.AFP, (map.get(r.AFP) ?? 0) + r.AUM_USD);
  return [...map.entries()]
    .map(([afp, aum]) => ({ name: afp, size: aum, afp, fill: afpColor(afp) }))
    .filter((d) => d.size > 0)
    .sort((a, b) => b.size - a.size);
}

/** Top-5 categories + Others for (manager, AFP, date). Used as the "by region" donut. */
export function getManagerAfpCategoryDonut(
  manager: Manager,
  afp: AFP,
  date: string,
  fundType: FundType = "All",
) {
  const rows = MASTER_DATA.filter(
    (r) =>
      r.Date === date &&
      r.Manager === manager &&
      r.AFP === afp &&
      matchesFundType(r, fundType),
  );
  const map = new Map<Category, number>();
  for (const r of rows) map.set(r.Category, (map.get(r.Category) ?? 0) + r.AUM_USD);
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 5);
  const rest = sorted.slice(5).reduce((a, [, v]) => a + v, 0);
  const items = top.map(([name, value]) => ({
    name,
    value,
    fill: categoryColor(name as Category),
  }));
  if (rest > 0) items.push({ name: "Others", value: rest, fill: CHART_COLORS.competitor });
  return items;
}

/** Top-n products by AUM for (manager, AFP, date). Label = ticker (ETF) or name. */
export function getManagerAfpTopProducts(
  manager: Manager,
  afp: AFP,
  date: string,
  n = 5,
  fundType: FundType = "All",
) {
  const rows = MASTER_DATA.filter(
    (r) =>
      r.Date === date &&
      r.Manager === manager &&
      r.AFP === afp &&
      matchesFundType(r, fundType),
  );
  const map = new Map<string, { isin: string; label: string; name: string; aum: number }>();
  for (const r of rows) {
    const cur = map.get(r.ISIN);
    if (cur) cur.aum += r.AUM_USD;
    else map.set(r.ISIN, { isin: r.ISIN, label: productLabel(r), name: r.Name, aum: r.AUM_USD });
  }
  return [...map.values()].sort((a, b) => b.aum - a.aum).slice(0, n);
}

/** AUM-weighted average Fee_bps for (manager, AFP, date). */
export function getManagerAfpTer(
  manager: Manager,
  afp: AFP,
  date: string,
  fundType: FundType = "All",
): number {
  const rows = MASTER_DATA.filter(
    (r) =>
      r.Date === date &&
      r.Manager === manager &&
      r.AFP === afp &&
      matchesFundType(r, fundType),
  );
  let num = 0;
  let den = 0;
  for (const r of rows) {
    num += r.Fee_bps * r.AUM_USD;
    den += r.AUM_USD;
  }
  return den ? num / den : 0;
}

/** NNB by Category × AFP for a manager. Returns one row per category with one numeric key per AFP. */
export function getManagerNnbByCategoryByAfp(
  manager: Manager,
  period: "Month" | "YTD",
  assetClass: "All" | "Equity" | "Fixed Income",
  date: string,
  fundType: FundType = "All",
) {
  const rows = MASTER_DATA.filter(
    (r) => r.Date === date && r.Manager === manager && matchesFundType(r, fundType),
  );
  const cats = CATEGORIES.filter((c) =>
    assetClass === "All" ? true : categoryAssetClass(c) === assetClass,
  );
  const metric = period === "Month" ? "NNB_Month_USD" : "NNB_YTD_USD";
  const data = cats.map((cat) => {
    const row: Record<string, number | string> = { category: cat };
    for (const a of AFPS) row[a] = 0;
    for (const r of rows.filter((r) => r.Category === cat)) {
      row[r.AFP] = (row[r.AFP] as number) + r[metric];
    }
    return row;
  });
  // Drop empty rows
  return data.filter((row) => AFPS.some((a) => Math.abs(row[a] as number) > 0));
}

/** Top-n + Bottom-n securities by signed metric for a manager. */
export function getManagerTopBottomSecurities(
  manager: Manager,
  metric: "NNB" | "NNBF",
  period: "Month" | "YTD",
  assetClass: "All" | "Equity" | "Fixed Income",
  date: string,
  n = 5,
  fundType: FundType = "All",
) {
  const key =
    metric === "NNB"
      ? period === "Month"
        ? "NNB_Month_USD"
        : "NNB_YTD_USD"
      : period === "Month"
        ? "NNBF_Month_USD"
        : "NNBF_YTD_USD";
  const rows = MASTER_DATA.filter((r) => {
    if (r.Date !== date) return false;
    if (r.Manager !== manager) return false;
    if (assetClass !== "All" && categoryAssetClass(r.Category) !== assetClass) return false;
    if (!matchesFundType(r, fundType)) return false;
    return true;
  });
  const map = new Map<string, { isin: string; label: string; name: string; value: number }>();
  for (const r of rows) {
    const cur = map.get(r.ISIN);
    const v = r[key];
    if (cur) cur.value += v;
    else map.set(r.ISIN, { isin: r.ISIN, label: productLabel(r), name: r.Name, value: v });
  }
  const arr = [...map.values()];
  const sorted = [...arr].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, n).filter((d) => d.value > 0);
  const bottom = sorted
    .slice(-n)
    .filter((d) => d.value < 0)
    .reverse(); // most negative first
  return { top, bottom };
}

/** Monthly per-AFP stacked series for a manager. Metric = AUM_USD or RRR_USD. */
export function getManagerMonthlyByAfp(
  manager: Manager,
  metric: "AUM_USD" | "RRR_USD",
  fundType: FundType = "All",
) {
  return MONTHS.map((m) => {
    const row: Record<string, number | string> = { m };
    for (const a of AFPS) row[a] = 0;
    for (const r of MASTER_DATA) {
      if (r.Date !== m || r.Manager !== manager) continue;
      if (!matchesFundType(r, fundType)) continue;
      row[r.AFP] = (row[r.AFP] as number) + r[metric];
    }
    return row;
  });
}

/** Composition of a security's NNB or NNBF by AFP for a given manager/date/period. */
export function getManagerSecurityByAfp(
  manager: Manager,
  isin: string,
  metric: "NNB" | "NNBF",
  period: "Month" | "YTD",
  date: string,
  fundType: FundType = "All",
) {
  const key =
    metric === "NNB"
      ? period === "Month"
        ? "NNB_Month_USD"
        : "NNB_YTD_USD"
      : period === "Month"
        ? "NNBF_Month_USD"
        : "NNBF_YTD_USD";
  return AFPS.map((a) => {
    const value = MASTER_DATA.filter(
      (r) =>
        r.Date === date &&
        r.Manager === manager &&
        r.ISIN === isin &&
        r.AFP === a &&
        matchesFundType(r, fundType),
    ).reduce((acc, r) => acc + r[key], 0);
    return { name: a, value, fill: afpColor(a) };
  }).filter((d) => Math.abs(d.value) > 0);
}

/** Monthly RRR composition by product for a manager. Top-5 ISINs recomputed each month + Others. */
export function getManagerRrrCompositionMonthly(manager: Manager, fundType: FundType = "All") {
  const productLabels = new Map<string, string>(); // isin -> label
  const data = MONTHS.map((m) => {
    const rows = MASTER_DATA.filter(
      (r) => r.Date === m && r.Manager === manager && matchesFundType(r, fundType),
    );
    const map = new Map<string, { label: string; value: number }>();
    for (const r of rows) {
      const cur = map.get(r.ISIN);
      if (cur) cur.value += r.RRR_USD;
      else map.set(r.ISIN, { label: productLabel(r), value: r.RRR_USD });
    }
    const sorted = [...map.entries()].sort(
      (a, b) => Math.abs(b[1].value) - Math.abs(a[1].value),
    );
    const top = sorted.slice(0, 5);
    const rest = sorted.slice(5).reduce((a, [, v]) => a + v.value, 0);
    const row: Record<string, number | string> = { m };
    for (const [isin, { label, value }] of top) {
      row[isin] = value;
      productLabels.set(isin, label);
    }
    row["__others"] = rest;
    return row;
  });
  return { data, productLabels };
}
