// Deterministic mock data for AFP Portfolio Intelligence

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const rnd = (min: number, max: number) => min + rand() * (max - min);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

export const AFPS = ["AFP Habitat", "AFP Cuprum", "AFP Provida", "AFP Capital", "AFP PlanVital", "AFP Modelo"] as const;
export const PORTFOLIO_TYPES = ["Type A", "Type B", "Type C", "Type D", "Type E"] as const;
export const MANAGERS = ["BlackRock", "Vanguard", "State Street", "Invesco", "JPMorgan", "Schroders"] as const;
export const CATEGORIES = ["Equity DM", "Equity EM", "Fixed Income IG", "High Yield", "Money Market"] as const;
export const ASSET_TYPES = ["ETF", "Mutual Fund", "Index Fund"] as const;
export const MATCH_TYPES = ["Direct", "Close", "Broad"] as const;

export type Manager = (typeof MANAGERS)[number];
export type AFP = (typeof AFPS)[number];
export type PortfolioType = (typeof PORTFOLIO_TYPES)[number];
export type Category = (typeof CATEGORIES)[number];
export type MatchType = (typeof MATCH_TYPES)[number];

export interface MasterRow {
  Date: string; // YYYY-MM
  AFP: AFP;
  Portfolio_Type: PortfolioType;
  ISIN: string;
  Name: string;
  Manager: Manager;
  Category: Category;
  Asset_Type: string;
  AUM_USD: number;
  NNB_USD: number;
  RRR_USD: number;
  Fee_bps: number;
  YTD_Perf: number;
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
  Fee_Advantage_bps: number;
  Perf_Advantage_pct: number;
  AFP: AFP;
}

function genISIN(i: number) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return `US${letters[i % 26]}${letters[(i * 3) % 26]}${String(100000 + i).slice(-6)}`;
}

function fundName(manager: Manager, category: Category, i: number) {
  const cat = category.replace(" ", "");
  return `${manager} ${cat} Fund ${String.fromCharCode(65 + (i % 26))}`;
}

// Generate 12 months of data ending current month
const today = new Date();
const months: string[] = [];
for (let i = 11; i >= 0; i--) {
  const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
  months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
}
export const MONTHS = months;

// Build a stable security universe (~80 ISINs)
interface Security {
  ISIN: string;
  Name: string;
  Manager: Manager;
  Category: Category;
  Asset_Type: string;
  baseFee: number;
}
const SECURITIES: Security[] = [];
for (let i = 0; i < 80; i++) {
  const manager = MANAGERS[i % MANAGERS.length];
  const category = CATEGORIES[i % CATEGORIES.length];
  SECURITIES.push({
    ISIN: genISIN(i),
    Name: fundName(manager, category, i),
    Manager: manager,
    Category: category,
    Asset_Type: ASSET_TYPES[i % ASSET_TYPES.length],
    baseFee: Math.round(rnd(8, 75)),
  });
}

function generateMaster(): MasterRow[] {
  const rows: MasterRow[] = [];
  for (const month of MONTHS) {
    for (const afp of AFPS) {
      for (const ptype of PORTFOLIO_TYPES) {
        // each AFP-portfolio holds ~25 securities
        const holdings = SECURITIES.filter((_, idx) => idx % 3 === (AFPS.indexOf(afp) + PORTFOLIO_TYPES.indexOf(ptype)) % 3);
        for (const sec of holdings) {
          const aumBase = rnd(20, 800) * 1_000_000;
          const monthIdx = MONTHS.indexOf(month);
          const drift = 1 + (monthIdx - 6) * 0.01 + (sec.Manager === "BlackRock" ? 0.04 : 0);
          const aum = aumBase * drift;
          const nnb = (rand() - 0.45) * aum * 0.08;
          const rrr = nnb * rnd(0.01, 0.04);
          rows.push({
            Date: month,
            AFP: afp,
            Portfolio_Type: ptype,
            ISIN: sec.ISIN,
            Name: sec.Name,
            Manager: sec.Manager,
            Category: sec.Category,
            Asset_Type: sec.Asset_Type,
            AUM_USD: Math.round(aum),
            NNB_USD: Math.round(nnb),
            RRR_USD: Math.round(rrr),
            Fee_bps: sec.baseFee,
            YTD_Perf: parseFloat((rnd(-8, 22)).toFixed(2)),
          });
        }
      }
    }
  }
  return rows;
}

export const MASTER_DATA: MasterRow[] = generateMaster();

function generateDisplacement(): DisplacementRow[] {
  const competitorSecs = SECURITIES.filter((s) => s.Manager !== "BlackRock");
  const blkSecs = SECURITIES.filter((s) => s.Manager === "BlackRock");
  const rows: DisplacementRow[] = [];
  for (let i = 0; i < 60; i++) {
    const c = competitorSecs[i % competitorSecs.length];
    const blk = blkSecs[i % blkSecs.length];
    const matchType = MATCH_TYPES[i % 3];
    const feeAdv = Math.round(rnd(2, 35));
    rows.push({
      Competitor_ISIN: c.ISIN,
      Competitor_Name: c.Name,
      Competitor_Manager: c.Manager,
      Competitor_AUM: Math.round(rnd(50, 1200) * 1_000_000),
      Competitor_Fee_bps: c.baseFee,
      Match_Type: matchType,
      BLK_Alternative_Name: blk.Name,
      BLK_ISIN: blk.ISIN,
      Fee_Advantage_bps: feeAdv,
      Perf_Advantage_pct: parseFloat(rnd(-1.5, 4.5).toFixed(2)),
      AFP: AFPS[i % AFPS.length],
    });
  }
  return rows;
}

export const DISPLACEMENT_DATA: DisplacementRow[] = generateDisplacement();

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
  const nnb = sumBy(cur, (r) => r.NNB_USD);
  const rrr = sumBy(cur, (r) => r.RRR_USD);
  const nnbf = nnb * 0.0035; // proxy

  const aumPrev = sumBy(prev, (r) => r.AUM_USD) || 1;
  const nnbPrev = sumBy(prev, (r) => r.NNB_USD) || 1;
  const rrrPrev = sumBy(prev, (r) => r.RRR_USD) || 1;

  // 4-month sparkline
  const trend = (metric: "AUM_USD" | "NNB_USD" | "RRR_USD") => {
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
    nnbDelta: (nnb - sumBy(prev, (r) => r.NNB_USD)) / Math.abs(nnbPrev),
    rrrDelta: (rrr - sumBy(prev, (r) => r.RRR_USD)) / Math.abs(rrrPrev),
    nnbfDelta: (nnbf - nnbPrev * 0.0035) / Math.abs(nnbPrev * 0.0035),
    trendAUM: trend("AUM_USD"),
    trendNNB: trend("NNB_USD"),
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

export function managerColor(m: Manager) {
  if (m === "BlackRock") return CHART_COLORS.blk;
  const idx = MANAGERS.filter((x) => x !== "BlackRock").indexOf(m);
  return CHART_COLORS.grayPalette[idx + 1] ?? CHART_COLORS.competitor;
}

// ---------- Brand & bucket helpers ----------

export type Bucket = "ETF" | "Mutual Fund" | "Money Market";
export const BUCKETS: Bucket[] = ["ETF", "Mutual Fund", "Money Market"];

export function brandOf(r: MasterRow): string {
  if (r.Manager === "BlackRock") return r.Asset_Type === "ETF" ? "iShares" : "BlackRock";
  return r.Manager;
}

export function bucketOf(r: MasterRow): Bucket {
  if (r.Category === "Money Market") return "Money Market";
  if (r.Asset_Type === "ETF") return "ETF";
  return "Mutual Fund";
}

export function brandColor(b: string) {
  if (b === "iShares") return CHART_COLORS.blk;
  if (b === "BlackRock") return CHART_COLORS.blkAlt;
  if (b === "Others") return "#CCCCCC";
  // grey palette for rest
  const others = MANAGERS.filter((x) => x !== "BlackRock") as string[];
  const idx = others.indexOf(b);
  return CHART_COLORS.grayPalette[(idx >= 0 ? idx : 0) + 1] ?? CHART_COLORS.competitor;
}

export const BUCKET_COLOR: Record<Bucket, string> = {
  ETF: CHART_COLORS.blk,
  "Mutual Fund": CHART_COLORS.blkAlt,
  "Money Market": "#B8B8B8",
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

const CATEGORY_COLORS: Record<Category, string> = {
  "Equity DM": "#00B140",
  "Equity EM": "#1F7A3A",
  "Fixed Income IG": "#000000",
  "High Yield": "#7A7A7A",
  "Money Market": "#B8B8B8",
};
export function categoryColor(c: Category) {
  return CATEGORY_COLORS[c];
}

/** Derive a fake ticker from an ISIN (last 4 alphanumerics). */
export function tickerOf(isin: string) {
  return isin.slice(-4).toUpperCase();
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