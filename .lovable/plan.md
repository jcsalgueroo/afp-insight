# Performance Analytics screen + Flows quadrant labels

## 1. Sidebar + route
- `src/components/shell/Sidebar.tsx`: insert new entry **"Performance Analytics"** (icon: `LineChart` from lucide-react) between **Flows Intelligence** and **Revenue & Fees Analytics**.
- New route `src/routes/performance.tsx` → renders `PerformanceAnalytics` view.
- New view file `src/components/views/PerformanceAnalytics.tsx`.

## 2. Data helpers (in `src/lib/mock-data.ts`)
All helpers operate on `MASTER_DATA` (all asset types — ETF, MF, MM) and respect the global As‑Of date from `useDashboard`.

- `getCumulativePerformanceSeries(portfolioTypes: PortfolioType[], asOf: string)`
  - Filter rows by `Portfolio_Type ∈ portfolioTypes` (empty = all).
  - For each month from `2025-12` through `asOf` (sorted), build 6 series: one per AFP + `"System"`.
  - For each AFP at month M: weighted average of `Perf_Month` using `AUM_USD` as weights across that AFP's rows in M (within selected portfolios). System = same calculation pooling all AFPs.
  - Cumulative value: starts at **100** at `2025-12`; each subsequent month V_t = V_{t-1} × (1 + wavg_t). `Perf_Month` is treated as a percent (e.g. 1.23 → 1.23%) — confirm by the same convention already used elsewhere (`Perf_YTD` is shown with `.toFixed(2)%`).
  - Returns `{ month, [AFP1]…[AFPn], System }[]`.

- `getCategoryAfpBubbles(asOf, assetClass: "Equity"|"Fixed Income")`
  - For each AFP and each Category present in that AFP at `asOf` (filtered to `Asset_Class = assetClass`):
    - x = sum(AUM in category for that AFP) / sum(AUM for that AFP at asOf, all asset classes) → portfolio weight (decimal)
    - y = AUM-weighted average of `Perf_YTD` in that category for that AFP
    - label = Category, group = AFP
  - Plus the same calculation for the System (all AFPs aggregated). System always returned.
  - Output grouped by AFP/System for separate `<Scatter>` series with distinct colors.

- `getAssetClassWeightVsPerf(asOf, assetClass)`
  - For each AFP + System: x = AUM weight of `assetClass` within total portfolio at asOf, y = AUM-weighted `Perf_YTD` of that asset class. One bubble each.

- `getCategoryDispersion(asOf, assetClass, category)`
  - System point: x = system weight in category, y = system YTD wavg.
  - One bubble per AFP at (afp weight in category, afp YTD wavg in category). Empty if AFP doesn't hold the category.

## 3. View layout (`PerformanceAnalytics.tsx`)
Reuses `CardShell` pattern, `SegmentedToggle`, `AfpFilterPopover`, `MultiSelectPopover`, recharts.

```text
┌─────────────────────────────────────────────────────────┐
│ Cumulative Performance (line chart)                     │
│   right: Portfolio filter (defaults: all)               │
│   5 AFP lines + System line, indexed to 100 at 2025-12  │
├──────────────────────────┬──────────────────────────────┤
│ Category positioning     │ Asset-class positioning      │
│ Scatter: weight × YTD    │ Scatter: weight × YTD        │
│ bubbles per Category×AFP │ one bubble per AFP+System    │
│ toggle Equity / FI       │ toggle Equity / FI           │
│ AFP filter (single sel)  │                              │
│ + System always shown    │                              │
├─────────────────────────────────────────────────────────┤
│ Category dispersion vs System                           │
│ Scatter, ReferenceLine x=systemWeight, y=systemYTD     │
│ Equity/FI toggle + Category single-select filter        │
└─────────────────────────────────────────────────────────┘
```

- Portfolio filter for chart 1: a `MultiSelectPopover` over `PORTFOLIO_TYPES`, label "Portfolios". Empty = all.
- AFP single-select for chart 2: small popover (or `Select`) listing each AFP; System bubbles always rendered as a separate `<Scatter>` series with distinct color (`CHART_COLORS.blk` or a system gray).
- Category single-select for chart 4: `Select` of `CATEGORIES`.
- Colors: reuse `managerColor` for AFPs is wrong here — AFPs need their own palette. Add `afpColor(afp)` derived from `CHART_COLORS` cycling, plus a fixed `SYSTEM_COLOR` token.

## 4. Flows Intelligence — Performance vs Flows quadrants (`src/components/views/Flows.tsx`)
- Add 4 quadrant labels rendered as recharts `<Label>` inside `<ReferenceArea>` (or absolute-positioned overlays):
  - NE = "Performance Chasing"
  - SE = "Profit Taking"
  - SW = "Stopping Losses"
  - NW = "High Conviction"
- Add a `SegmentedToggle` (or small `Select`) "Quadrant: All / NE / SE / SW / NW" in the card header.
- When a quadrant is selected, filter `scatter` data to points with the matching sign of `Perf` (x) and `NNB` (y) before grouping by manager. "All" keeps current behavior.

## 5. Notes / conventions
- All numbers reuse existing formatters (`formatUSD`, `.toFixed(2)%`).
- No DB/schema changes; pure frontend over already-loaded `MASTER_DATA`.
- New route registered automatically via TanStack file-based routing (do not edit `routeTree.gen.ts`).
- Add `LineChart`/`Line` import where needed in the new view.
