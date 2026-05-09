## AFP Deep Dive — overhaul

### 1. Remove global AFP filter

- `src/components/shell/TopNav.tsx`: delete the AFPs popover trigger + content. Keep date selector and BlackRock-Only toggle.
- `src/lib/dashboard-store.ts`: remove `afps`, `setAfps`, `toggleAfp` from store.
- Update every call site that reads `afps` from the store: `Scorecard`, `Flows`, `Securities`, `AFPDeepDive`. They keep working with their existing local AFP state (Scorecard already uses local popovers); where a screen still depended on the global value, default to `[]` (= all).

### 2. AFP Deep Dive — local AFP filter

A single `AfpFilterPopover` (multi-select, defaults to All) at the top of the screen replaces the current single-AFP `<select>`. All widgets on the screen consume this local list. When more than one AFP is selected, charts show aggregated values; the donut/positions table that need a single AFP fall back to the first selected (or All-aggregated when none).

### 3. Portfolio Composition treemap

Replace current treemap. Controls in card header:
- `SegmentedToggle` ETF | Mutual Fund (default ETF). Money Market excluded.
- Hierarchy: **Manager (Top 5 by AUM_USD within bucket + "Other") → Category**.
- Color rule (BlackRock and iShares cells only, leaf level):
  - Compute each category's AUM_USD within the **selected AFP(s)** for the current bucket, grouped by Manager.
  - For BlackRock/iShares leaves: if any other manager has a higher AUM in that same Category+bucket+AFP scope, paint the leaf `--destructive` at ~55% opacity ("muted red"); else paint with the existing brand green.
  - All non-BLK/iShares leaves keep their current `managerColor`.
- Tooltip: Manager, Category, AUM, share within bucket.

New selector: `getAFPCompositionTree(afps, bucket)` returning `{ manager, children: [{ category, size, dominant: boolean }] }[]`.

### 4. ETF vs Mutual Fund donut

New card next to/under treemap:
- Recharts `PieChart` with `innerRadius` for donut.
- Two slices: ETF AUM and Mutual Fund AUM for the selected AFP(s).
- Header control: `Categories` multi-select popover (mirrors `AfpFilterPopover` pattern). Default = All categories. Money Market included as a category option.
- Center label: total AUM. Legend with $ and %.

New selector: `getAfpEtfMfDonut(afps, categories)`.

### 5. Aggregated NNB stacked bar by Manager

New card, full width:
- Recharts horizontal stacked `BarChart` (managers on Y, NNB stacked by Category on X), sorted largest → smallest absolute total NNB.
- Header controls:
  - `SegmentedToggle` Period: Month | YTD (Month uses dashboard date; YTD = Jan→date cumulative).
  - `SegmentedToggle` Bucket: ETF | Mutual Fund.
- Stack colors: `managerColor`-style palette per Category (reuse `CHART_COLORS` + a small Category color map).
- Tooltip: per-category NNB plus total.

New selector: `getNnbByManagerStacked(afps, period, bucket)`.

### 6. Displacement Opportunities table — Performance Advantage column

- Add column "Perf Adv." between "Match" and "Fee Adv.", using existing `Perf_Advantage_pct` (already on `DISPLACEMENT_DATA`).
- Format: `+X.XX%` green when ≥0, red when <0. Right-aligned, tabular-nums.

### 7. Positions table

New card at the bottom:
- Header controls:
  - `SegmentedToggle` ETF | Mutual Fund (default ETF). Drives identifier column: ETF → "Ticker" (use a derived ticker from ISIN, e.g., last 4 chars uppercased — mock data has no real ticker), MF → "Fund Name".
  - Portfolio filter: single-select dropdown listing "All portfolios" + each `Portfolio_Type` for the selected AFP(s).
  - Search input filtering by identifier or Manager (case-insensitive).
- Single AFP required: if multiple AFPs selected in the screen filter, use aggregate; the table aggregates rows by `(Category, ISIN)` for the matched AFP(s) and Portfolio scope.
- Columns: Category (group header rows) | Ticker/Fund Name | Manager | AUM Org ($) | % of Portfolio | Month NNB | YTD NNB.
- Rows grouped by Category with subtotals; sortable by AUM desc within category.

New selector: `getAfpPositions(afps, portfolio: PortfolioType | "All", bucket, monthDate)` returning rows with `{ category, isin, ticker, name, manager, aum, weight, monthNnb, ytdNnb }`.

### Files touched

- `src/lib/dashboard-store.ts` — drop AFP state.
- `src/components/shell/TopNav.tsx` — drop AFP popover.
- `src/lib/mock-data.ts` — add 4 new selectors listed above; tiny ticker helper.
- `src/components/views/AFPDeepDive.tsx` — full rebuild around local filter + the 5 widgets above and updated table.
- `src/components/views/Scorecard.tsx`, `Flows.tsx`, `Securities.tsx` — replace `useDashboard().afps` reads with `[]` (or local state where they already had it).

### Out of scope

- No backend/data model changes (uses existing `MASTER_DATA`, `DISPLACEMENT_DATA`).
- No design-token changes beyond reusing `--destructive` for the muted-red treemap leaves.
- Real ticker symbols are not in the mock data; ETF identifier is derived from ISIN.
