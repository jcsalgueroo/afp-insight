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
  const nnb = sumBy(cur, (r) => r.NNB_YTD_USD);
  const rrr = sumBy(cur, (r) => r.RRR_USD);
  const nnbf = sumBy(cur, (r) => r.NNBF_YTD_USD);

  const aumPrev = sumBy(prev, (r) => r.AUM_USD) || 1;
  const nnbPrev = sumBy(prev, (r) => r.NNB_YTD_USD) || 1;
  const rrrPrev = sumBy(prev, (r) => r.RRR_USD) || 1;
  const nnbfPrev = sumBy(prev, (r) => r.NNBF_YTD_USD) || 1;

  // 4-month sparkline
  const trend = (
    metric: "AUM_USD" | "NNB_USD" | "RRR_USD" | "NNB_YTD_USD" | "NNBF_YTD_USD",
  ) => {
    const startIdx = Math.max(0, MONTHS.indexOf(f.date) - 3);
    return MONTHS.slice(startIdx, MONTHS.indexOf(f.date) + 1).map((m) => {
      const rows = applyFilters(MASTER_DATA, { ...f, date: m }).filter((r) => r.Manager === "BlackRock");
      return { m, v: sumBy(rows, (r) => r[metric]) };
    });
  };

  return {
    aum,
    nnb,
    rrr,
    nnbf,
    aumDelta: (aum - sumBy(prev, (r) => r.AUM_USD)) / aumPrev,
    nnbDelta: (nnb - sumBy(prev, (r) => r.NNB_YTD_USD)) / Math.abs(nnbPrev),
    rrrDelta: (rrr - sumBy(prev, (r) => r.RRR_USD)) / Math.abs(rrrPrev),
    nnbfDelta: (nnbf - sumBy(prev, (r) => r.NNBF_YTD_USD)) / Math.abs(nnbfPrev),
    trendAUM: trend("AUM_USD"),
    trendNNB: trend("NNB_YTD_USD"),
    trendNNBF: trend("NNBF_YTD_USD"),
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
  bucket: Bucket,
  metric: "NNB" | "NNBF",
) {
  const months = monthsYTD(f.date);
  // Determine top brands across the whole YTD window
  const totals = new Map<string, number>();
  for (const m of months) {
    for (const r of rowsAt(m, f.afps).filter((r) => bucketOf(r) === bucket)) {
      const v = metric === "NNB" ? r.NNB_USD : (r.NNB_USD * r.Fee_bps) / 10000;
      const b = brandOf(r);
      totals.set(b, (totals.get(b) ?? 0) + v);
    }
  }
  const brands = [...totals.entries()].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 6).map(([k]) => k);
  const cum: Record<string, number> = Object.fromEntries(brands.map((b) => [b, 0]));
  const data = months.map((m) => {
    const row: Record<string, number | string> = { m };
    const monthly: Record<string, number> = Object.fromEntries(brands.map((b) => [b, 0]));
    for (const r of rowsAt(m, f.afps).filter((r) => bucketOf(r) === bucket)) {
      const b = brandOf(r);
      if (!brands.includes(b)) continue;
      const v = metric === "NNB" ? r.NNB_USD : (r.NNB_USD * r.Fee_bps) / 10000;
      monthly[b] += v;
    }
    for (const b of brands) {
      cum[b] += monthly[b];
      row[b] = cum[b];
    }
    return row;
  });
  return { data, brands };
}

// ---------- Category weight bubble data ----------

export function getCategoryWeightBubbles(f: Filters, afp: AFP) {
  const allRows = rowsAt(f.date, []);
  const afpRows = rowsAt(f.date, [afp]);
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
  return [...byMgr.values()].sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
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

/** Top 5 managers by NNB + Others. */
export function getNnbDonut(afps: AFP[], bucket: Bucket, period: Period, date: string) {
  const rows = flowRows(afps, bucket, period, date);
  const m = new Map<Manager, number>();
  for (const r of rows) m.set(r.Manager, (m.get(r.Manager) ?? 0) + r.NNB_USD);
  const sorted = [...m.entries()]
    .map(([Manager, NNB]) => ({ Manager: Manager as string, NNB }))
    .sort((a, b) => Math.abs(b.NNB) - Math.abs(a.NNB));
  const top = sorted.slice(0, 5);
  const others = sorted.slice(5);
  const othersSum = others.reduce((a, b) => a + b.NNB, 0);
  if (others.length) top.push({ Manager: "Others", NNB: othersSum });
  return top;
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
  return { data, stackKeys };
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
  const map = new Map<string, { isin: string; name: string; manager: Manager; nnb: number }>();
  for (const r of rows) {
    const cur = map.get(r.ISIN) ?? { isin: r.ISIN, name: r.Name, manager: r.Manager, nnb: 0 };
    cur.nnb += r.NNB_USD;
    map.set(r.ISIN, cur);
  }
  const all = [...map.values()].sort((a, b) => b.nnb - a.nnb);
  const top = all.slice(0, 5).map((x) => ({
    label: bucket === "ETF" ? tickerOf(x.isin) : x.name,
    nnb: x.nnb,
    manager: x.manager,
    isTop: true,
  }));
  const bottom = all
    .slice(-5)
    .reverse()
    .map((x) => ({
      label: bucket === "ETF" ? tickerOf(x.isin) : x.name,
      nnb: x.nnb,
      manager: x.manager,
      isTop: false,
    }));
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
) {
  const dates = period === "YTD" ? monthsYTD(date) : [date];
  const rows = MASTER_DATA.filter(
    (r) =>
      dates.includes(r.Date) &&
      (afps.length === 0 || afps.includes(r.AFP)) &&
      (managers.length === 0 || managers.includes(r.Manager)) &&
      (categories.length === 0 || categories.includes(r.Category)),
  );
  const map = new Map<
    string,
    { Manager: Manager; AUM: number; NNB: number; Perf: number; Name: string }
  >();
  for (const r of rows) {
    const cur = map.get(r.ISIN);
    if (cur) {
      cur.AUM += r.AUM_USD;
      cur.NNB += r.NNB_USD;
    } else {
      map.set(r.ISIN, {
        Manager: r.Manager,
        AUM: r.AUM_USD,
        NNB: r.NNB_USD,
        Perf: r.YTD_Perf,
        Name: r.Name,
      });
    }
  }
  return [...map.values()];
}

// ---------- Revenue & Fees Analytics selectors ----------

/** Top 10 managers by AUM (+ Others) with weighted fee & RRR for the selected bucket/month. */
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
    .sort((a, b) => b.AUM - a.AUM);
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
export function getFeeHeatmap(afps: AFP[], bucket: Bucket, date: string) {
  const rows = MASTER_DATA.filter(
    (r) =>
      r.Date === date &&
      (afps.length === 0 || afps.includes(r.AFP)) &&
      bucketOf(r) === bucket,
  );
  const cats = CATEGORIES.filter((c) =>
    bucket === "Money Market" ? c === "Money Market" : c !== "Money Market",
  );
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
      return { fee: aum ? fw / aum : 0, aum };
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
) {
  const dates = period === "YTD" ? monthsYTD(date) : [date];
  const rows = MASTER_DATA.filter(
    (r) =>
      dates.includes(r.Date) &&
      (afps.length === 0 || afps.includes(r.AFP)) &&
      (managers.length === 0 || managers.includes(r.Manager)) &&
      (categories.length === 0 || categories.includes(r.Category)),
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
  return { data, categories: cats as string[] };
}

/** Category fee bubbles: system vs selected AFP, with category AUM share & BLK share. */
export function getCategoryFeeBubbles(afp: AFP, bucket: Bucket | "All", date: string) {
  const all = MASTER_DATA.filter(
    (r) => r.Date === date && (bucket === "All" || bucketOf(r) === bucket),
  );
  const totalAll = sumBy(all, (r) => r.AUM_USD) || 1;
  const cats = CATEGORIES.filter((c) =>
    bucket === "Money Market" ? c === "Money Market" : true,
  );
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
}) {
  const { bucket, portfolioTypes, date } = opts;
  const ptSet = portfolioTypes.length ? new Set(portfolioTypes) : null;
  const rows = MASTER_DATA.filter(
    (r) =>
      r.Date === date &&
      (bucket === "All" || bucketOf(r) === bucket) &&
      (!ptSet || ptSet.has(r.Portfolio_Type)),
  );

  // Sort categories by total AUM desc
  const catTotals = new Map<Category, number>();
  for (const r of rows)
    catTotals.set(r.Category, (catTotals.get(r.Category) ?? 0) + r.AUM_USD);
  const categories = [...CATEGORIES]
    .filter((c) => (catTotals.get(c) ?? 0) > 0)
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
}): BelowWeightRow[] {
  const { bucket, portfolioTypes, date, threshold = 0.65 } = opts;
  const { categories, afps, cells } = getPenetrationHeatmap({ bucket, portfolioTypes, date });
  const ptSet = portfolioTypes.length ? new Set(portfolioTypes) : null;
  const rows = MASTER_DATA.filter(
    (r) =>
      r.Date === date &&
      (bucket === "All" || bucketOf(r) === bucket) &&
      (!ptSet || ptSet.has(r.Portfolio_Type)),
  );

  // YTD NNB by ISIN+AFP
  const ytdMonths = monthsYTD(date);
  const ytdRows = MASTER_DATA.filter(
    (r) =>
      ytdMonths.includes(r.Date) &&
      (bucket === "All" || bucketOf(r) === bucket) &&
      (!ptSet || ptSet.has(r.Portfolio_Type)),
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
