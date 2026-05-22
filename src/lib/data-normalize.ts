import type { DisplacementRow, MasterRow } from "./mock-data";

type Raw = Record<string, string>;

function num(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const s = String(v).replace(/,/g, "").trim();
  if (s === "" || s === "-") return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function s(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
}

function toMonth(v: string): string {
  const t = v.trim();
  if (/^\d{4}-\d{2}/.test(t)) return t.slice(0, 7);
  const d = new Date(t);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return t;
}

function normalizeManager(m: string): string {
  return m === "iShares" ? "BlackRock" : m;
}

function normalizeAssetType(t: string): string {
  const x = t.trim();
  if (x === "Money Market" || x === "MoneyMarket") return "Money Market";
  if (x === "ETF") return "ETF";
  return "Mutual Fund";
}

function normalizeMatchType(t: string): string {
  const x = t.toLowerCase();
  if (x === "direct") return "Direct";
  if (x === "close") return "Close";
  if (x === "broad") return "Broad";
  return t || "Direct";
}

export function normalizeMaster(rows: Raw[]): MasterRow[] {
  return rows
    .filter((r) => s(r.fecha_corte) && s(r.standardized_afp))
    .map<MasterRow>((r) => {
      const ticker = s(r.ticker);
      const cleanTicker = ticker === "-" ? "" : ticker;
      const monthNnb = num(r.month_nnb);
      const ytdNnb = num(r.ytd_nnb);
      const monthNnbf = num(r.month_nnbf);
      const ytdNnbf = num(r.ytd_nnbf);
      const perfMonth = num(r.month_performance_usd) * 100;
      const perfYtdRaw = r.ytd_performance_usd;
      const perfYtd =
        perfYtdRaw === undefined || perfYtdRaw === ""
          ? perfMonth
          : num(perfYtdRaw) * 100;
      const isin = s(r.isin) || `${s(r.standardized_afp)}|${s(r.name)}`;
      return {
        Date: toMonth(s(r.fecha_corte)),
        AFP: s(r.standardized_afp),
        Portfolio_Type: s(r.standardized_portfolio),
        ISIN: isin,
        Name: s(r.name),
        Ticker: cleanTicker,
        Manager: normalizeManager(s(r.manager)),
        Category: s(r.category),
        Asset_Type: normalizeAssetType(s(r.type)),
        AUM_USD: num(r.aum_org),
        NNB_USD: monthNnb,
        RRR_USD: num(r.rrr_org),
        Fee_bps: num(r.fee) * 10000,
        YTD_Perf: perfYtd,
        NNB_Month_USD: monthNnb,
        NNB_YTD_USD: ytdNnb,
        NNBF_Month_USD: monthNnbf,
        NNBF_YTD_USD: ytdNnbf,
        Perf_Month: perfMonth,
        Perf_YTD: perfYtd,
        Asset_Class: s(r.asset_class),
        Domicile: s(r.domicile),
        Cumulative_Perf: num(r.cumulative_performance),
      };
    });
}

export function normalizeDisplacement(rows: Raw[]): DisplacementRow[] {
  const out: DisplacementRow[] = [];
  for (const r of rows) {
    if (!s(r.competitor_name)) continue;
    const heldBy = s(r.held_by_afps);
    const afps = heldBy
      ? heldBy.split(",").map((x) => x.trim()).filter(Boolean)
      : [""];
    for (const afp of afps) {
      out.push({
        Competitor_ISIN: s(r.competitor_isin),
        Competitor_Name: s(r.competitor_name),
        Competitor_Manager: s(r.competitor_manager),
        Competitor_AUM: num(r.competitor_aum_usd),
        Competitor_Fee_bps: num(r.competitor_fee_bps),
        Match_Type: normalizeMatchType(s(r.match_type)),
        BLK_Alternative_Name: s(r.blk_alternative_name),
        BLK_ISIN: s(r.blk_alternative_isin),
        BLK_Ticker: "",
        Fee_Advantage_bps: num(r.fee_advantage_bps),
        Perf_Advantage_pct: num(r.perf_advantage_pct),
        AFP: afp,
      });
    }
  }
  return out;
}

export const MASTER_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRRGCqrN2k4fx0iZNl8GYu5q2xOqWP6j9v7Fh8Wn5vt1Gr_RrmB3MGHpWR6-xID6h_6LCog70fwZfZv/pub?gid=0&single=true&output=csv";
export const DISPLACEMENT_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRzeXt9uY_D6xWsiqP54HR8y71qPQ8_PBPR4iS9W-6q2sNdFw6BrqF8kwVZ75yvfzi6vJrnM35II_B8/pub?gid=692693879&single=true&output=csv";