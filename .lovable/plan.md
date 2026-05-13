## Goal

Major restructure of the System Summary view: remove the global BlackRock-only toggle, swap several charts for new visualizations, add a new asset_class data field, and add a new Top5+Others share-evolution chart.

## 1. Remove BlackRock Only toggle (global)

- `src/components/shell/TopNav.tsx`: remove the BLK Only switch UI and the `blkOnly` / `setBlkOnly` reads.
- `src/lib/dashboard-store.ts`: keep `blkOnly` in the store for now (other views still reference it via filters), but it will be permanently `false` (no setter usage in UI). Default stays `false`. We will not rip it out of selectors to avoid scope creep across other views.
- `Scorecard.tsx`: stop reading `blkOnly` from the store; pass `blkOnly: false` in filter objects.

## 2. Add asset_class to data model

- `src/lib/mock-data.ts`:
  - Add `Asset_Class: string` to `MasterRow` (values typically "Equity", "Fixed Income", possibly "Money Market" / "Other").
  - Add `ASSET_CLASSES` runtime registry populated in `setLiveData()` (distinct, sorted).
- `src/lib/data-loader.ts`: in `normalizeMaster`, map `r.asset_class` (trimmed) into the new field.
- New helper `assetClassOf(r)` for readability.

## 3. Category Weights — switch to grouped bar chart

`src/components/views/Scorecard.tsx` + `getCategoryWeightBubbles` (rename / new selector).

- New selector `getCategoryWeightBars(filters, afp, { bucket?: "ETF"|"Mutual Fund"|"All", assetClass?: "Equity"|"Fixed Income"|"All" })` returning per-category:
  - `category`
  - `aggWeight` (% of system total in that scope)
  - `afpWeight` (% of selected AFP total in that scope)
  - `aggBlkShare` (BlackRock share of category AUM, system, 0..1)
  - `afpBlkShare` (BlackRock share of category AUM, selected AFP, 0..1)
- Render Recharts `BarChart` with X = Category, Y = Weight (%), two grouped bars per category (System grey, AFP green).
- Color shading: per-bar `<Cell>` using a fixed 0–100% scale.
  - Grey ramp light→dark, green ramp light→dark. Use `color-mix(in oklab, var(--muted) X%, var(--foreground) Y%)`-equivalent precomputed hex via a small helper (`shadeGrey(share)`, `shadeGreen(share)`) interpolating between two anchors.
- Custom tooltip (`content={<CategoryWeightTooltip />}`): on hover of any bar in a category, card shows Category title, then a 2-row table with System weight + System BLK share %, AFP weight + AFP BLK share %.
- Header controls: `AfpSinglePicker` (existing) + two `SegmentedToggle`s — Bucket: `ETF | MF | All` and Asset Class: `Equity | Fixed Income | All`. Defaults: ETF, Equity.

## 4. Top 5 Managers donut — rich hover card

- Add new selector `getManagerAfpBreakdown(filters, manager, bucket)` returning `[{ AFP, AUM }]` for that manager in that bucket on the as-of date.
- Add `getOthersManagerBreakdown(filters, bucket)` returning `[{ Manager, AUM }]` for managers outside the top 5.
- Custom Pie tooltip (`content={<TopManagersTooltip />}`):
  - Top 5 slice → header = manager name, total AUM Org, then list of AFPs sorted desc with `formatUSD` and % of that manager's AUM.
  - "Others" slice → header = "Others", total AUM, then list of underlying managers sorted desc with AUM + % of Others.
- No changes to the donut shape, colors, or legend.

## 5. Monthly NNB chart — switch to grouped bar chart

- Replace the existing AUM Org / Monthly NNB area card's NNB mode with a dedicated bar chart.
- New selector `getMonthlyNnbByBucketSeries(afps)` returning `[{ m, ETF, "Mutual Fund", "Money Market" }]` over **all available months** using `NNB_Month_USD`.
- Recharts `BarChart` with three grouped bars per month colored by `BUCKET_COLOR`. Time axis ticks formatted via existing `shortMonth` (year shown for January).
- The existing AUM Org evolution stays as the area chart in `AUM_USD` mode. The metric toggle becomes a chart-type switch:
  - `AUM Org` → stacked area (current behavior)
  - `Monthly NNB` → grouped bar chart (new)

## 6. AUM Org Composition by Category — switch to 100% stacked bar

- Replace the two stacked area cards (ETF, Mutual Fund) with two stacked **bar** charts.
- One bar per month covering all available history; segments are categories; values normalized so each bar sums to 100%.
- Reuse existing `getCategoryCompositionSeries` data shape; switch `<Area stackId>` for `<Bar stackId>` and keep the `__raw` payload for tooltips. Y-axis remains 0–100%.

## 7. New chart: Top 5 + Others — share evolution line chart

Placed directly under the Category Weights card.

- New selector `getTopManagersShareSeries(afps, bucket)`:
  - Determine top 5 managers across ALL available months in scope (by total AUM in selected bucket across selected AFPs).
  - For each month, compute share of each top-5 manager + an "Others" aggregate as % of total bucket AUM in selected AFPs (sums to 100%).
- Recharts `LineChart` with 6 lines, colored via `managerColor` + grey for Others. Y-axis 0–100%.
- Header controls:
  - `SegmentedToggle` Bucket: `ETF | MF | MM` (default ETF).
  - `AfpFilterPopover` multi-select AFPs (default all).

## 8. Layout (`Scorecard.tsx`)

```text
KPI row
Category Weights bar chart (full width)
Top5+Others share line chart (full width, new)
[ AUM Org / Monthly NNB chart  (col-span-2) ] [ Top 5 donut (col-span-1) ]
AUM Org Composition: ETF stacked-bar | MF stacked-bar
```

## Out of scope

- Other views (`AFPDeepDive`, `Flows`, etc.) keep current charts and selectors.
- No KPI/card content changes.
- Design tokens unchanged; new shading uses existing brand green and neutral greys.
- We won't purge the `blkOnly` field from the store/selectors since other views still depend on the filter shape; the global toggle is simply removed from the UI.
