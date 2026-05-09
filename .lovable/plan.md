## Screen 1 Rework — "System Summary"

Rename "Executive Scorecard" → "System Summary" (page title, sidebar label, route head metadata). Route stays `/scorecard` and `/`.

### Conventions added to mock-data layer

- **Brand helper** `brand(row)`: `BlackRock` + `Asset_Type=ETF` → `"iShares"`; `BlackRock` + non-ETF → `"BlackRock"`; else manager name.
- **Asset bucket helper** `assetBucket(row)`: `Category=Money Market` → `"Money Market"`; `Asset_Type=ETF` → `"ETF"`; else (Mutual Fund + Index Fund) → `"Mutual Fund"`.
- **YTD helper**: cumulative sum of monthly values from Jan of selected year through selected month.
- New selectors: `getBrandKpis`, `getAumOrgByBucketSeries`, `getTopManagersPie`, `getYtdByManagerSeries` (NNB & NNBF), `getCategoryWeightBubbles`.
- Brand color tokens: iShares = `--primary` (#00B140), BlackRock = `--nav` (#000000), competitors = grey palette.

### Layout (top to bottom)

```text
[ KPI 1 ][ KPI 2 ][ KPI 3 ][ KPI 4 ][ KPI 5 ][ KPI 6 ]   (responsive: 6→3→2→1)

[ AUM Org Evolution — stacked area, full width ]
  toggle: AUM Org | Monthly NNB        filter: AFP multi-select

[ Top 5 Managers — pie ][ Category Weights — bubble ]
  toggle: ETF | MF        filter: AFP single-select

[ YTD NNB by Manager — area ][ YTD NNBF by Manager — area ]
  each: toggle ETF|MF, AFP multi-select filter
```

### KPI cards (6 total, each with sparkline + MoM delta)

1. BLK RRR (monthly) — existing
2. Total BLK AUM — existing
3. BLK YTD NNB — existing (switch to true YTD cumulative)
4. BLK YTD NNBF — existing (NNB × Fee_bps)
5. **iShares Market Share within ETF AUM Org** = iShares ETF AUM ÷ total ETF AUM (system-wide). Sparkline = last 4 months of that ratio.
6. **BlackRock Market Share within Mutual Funds** = BlackRock MF AUM ÷ total MF AUM. Same sparkline treatment.

### Charts

1. **AUM Org Evolution (stacked area)** — Recharts `AreaChart` with stacked `<Area>` per bucket (ETF / Mutual Fund / Money Market). X = month (12 months). Local toggle switches dataKey set between `AUM_USD` and `NNB_USD` (chart re-titles to "Monthly NNB Evolution"). Local AFP multi-select Popover (independent of global filter, defaults to global selection). Colors: ETF=green, MF=black, MM=grey.

2. **Top 5 Managers (pie)** — replaces the horizontal stacked bar. Donut `PieChart` showing top 5 managers by AUM in selected bucket; remainder grouped as "Others". Toggle ETF | MF restricts the pool. iShares/BlackRock slices use brand colors; others greyscale. Legend with % labels.

3. **YTD NNB by Manager (area)** — stacked `AreaChart`, X = months Jan→selected, Y = cumulative NNB per manager. Toggle ETF|MF, local AFP multi-select.

4. **YTD NNBF by Manager (area)** — identical structure but Y = cumulative NNB × Fee_bps/10000.

5. **Category Weights (bubble)** — `ScatterChart` with two series:
   - Grey series: aggregate system weight per Category (Y = % of total AUM Org).
   - Green series: weight per Category for the AFP selected in local filter.
   - X = Category (ordinal via numeric index + custom tick).
   - Bubble size (ZAxis) = (iShares + BlackRock) AUM share within that Category, applied to both points so the size encodes the same dimension regardless of color.
   - Side-by-side offset achieved by nudging X by ±0.15.

### Files

- **Edit** `src/lib/mock-data.ts` — add helpers + 6 new selectors. No regen of base data.
- **Edit** `src/components/views/Scorecard.tsx` — replace contents with new layout (rename component is optional; keep export name).
- **Edit** `src/components/shell/Sidebar.tsx` — change label "Scorecard" → "System Summary".
- **Edit** `src/routes/scorecard.tsx` and `src/routes/index.tsx` — update `head()` title to "System Summary".
- **New** `src/components/widgets/AfpFilterPopover.tsx` — reusable AFP multi-select popover (used by 3 charts).
- **New** `src/components/widgets/BucketToggle.tsx` — reusable ETF/MF (and ETF/MF/AUM-NNB variants) segmented control.

### Out of scope

- Other views (AFP Deep Dive, Flows, Securities) untouched.
- No backend / Lovable Cloud needed.
- No design-system token changes beyond reusing existing brand colors.
