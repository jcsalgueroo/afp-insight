# Manager Deep Dive screen

A new screen between AFP Deep Dive and Flows Intelligence in the sidebar. All charts are scoped to a single selected Manager (default: BlackRock).

## Routing & navigation

- New route file `src/routes/manager.tsx` registering `/manager` with head meta.
- New view `src/components/views/ManagerDeepDive.tsx`.
- Update `src/components/shell/Sidebar.tsx` — insert `{ to: "/manager", label: "Manager Deep Dive", icon: Users }` between AFP Deep Dive and Flows Intelligence.
- `src/routeTree.gen.ts` regenerates automatically.

## Screen header

- Title + subtitle.
- `ManagerPicker` popover (single-select, default `"BlackRock"`, falls back to `MANAGERS[0]`). Local component state, independent of global filters. Reuses the `Popover` pattern used elsewhere.
- Uses the existing global `date` from `useDashboard` for any "at selected date" charts; monthly charts span all `MONTHS` in the data.

## Charts (in order)

### 1. Manager AUM treemap by AFP (with hover card)

- Treemap: one leaf per AFP. Leaf size = sum of `AUM_USD` for the selected manager at the global selected date in that AFP.
- On hover of an AFP leaf, an overlay card (top-right, same pattern as `AFPDeepDive`) shows three blocks for `manager × AFP × date`:
  1. Donut by **Category** (treating Category as region per your direction), top 5 + Others.
  2. Top 5 products by `AUM_USD`. Label rule: `Ticker` for ETFs; `Name` otherwise. Shows `AUM_USD` per row.
  3. AUM-weighted average TER = Σ(`Fee_bps` × `AUM_USD`) / Σ(`AUM_USD`), formatted as bps.

### 2. NNB by category — grouped bar

- One group per `Category` filtered to the selected manager.
- 4 bars per group (one per AFP), colored by `afpColor`.
- Toggles: Equity / Fixed Income / All (`ASSET_CLASS_TOGGLE`) and Month / YTD (`PERIOD_TOGGLE`).
- "All" filter is added per your answer; metric switches between `NNB_Month_USD` and `NNB_YTD_USD`.

### 3 & 4. Top 5 / Bottom 5 securities — two cards

- Universe: rows where `Manager === selectedManager` at the global selected date.
- One card for NNB, one card for NNBF.
- Each card has its own Month / YTD toggle and an All / Equity / Fixed Income toggle.
- Horizontal bar chart: top 5 positive + bottom 5 negative by chosen metric (`NNB_Month_USD`/`NNB_YTD_USD`/`NNBF_Month_USD`/`NNBF_YTD_USD`), aggregated by ISIN. Label = Ticker for ETFs, Name otherwise.

### 5 & 6. AUM Org by AFP and RRR Org by AFP — two stacked bar charts

- X axis: every month in `MONTHS`. Y axis: USD.
- Per month, stack one segment per AFP, colored by `afpColor`. Values filtered to selected manager.
- Metric 5 = `AUM_USD`. Metric 6 = `RRR_USD`.

### 7. RRR Org composition by product — monthly stacked bar

- Per month, recompute the 5 ISINs with the largest absolute `RRR_USD` for the selected manager that month; bucket the rest into "Others".
- Stack labels: Ticker (ETFs) / Name (else). Colors from a stable palette keyed by ISIN with "Others" gray.

## Data layer additions (`src/lib/mock-data.ts`)

Pure selectors, no schema changes:

- `getManagerAumByAfp(manager, date)` → `[{ afp, aum }]`.
- `getManagerAfpDonut(manager, afp, date)` → top-5 categories + Others.
- `getManagerAfpTopProducts(manager, afp, date, n=5)` → `[{ isin, label, name, aum }]`.
- `getManagerAfpTer(manager, afp, date)` → number (bps).
- `getManagerNnbByCategoryByAfp(manager, period, assetClass, date)` → `[{ category, [afp]: number }]`.
- `getManagerTopBottomSecurities(manager, metric, period, assetClass, date, n=5)` → `[{ isin, label, value }]`.
- `getManagerMonthlyByAfp(manager, metric)` → `[{ m, [afp]: number }]` across all `MONTHS`.
- `getManagerRrrCompositionMonthly(manager)` → `{ data: [{ m, [productKey]: number }], productsPerMonth }` recomputed per month with top-5 + Others.

Asset-class filtering reuses `categoryAssetClass` already in `mock-data.ts`.

## Files to add / edit

- Add `src/routes/manager.tsx`.
- Add `src/components/views/ManagerDeepDive.tsx`.
- Edit `src/components/shell/Sidebar.tsx` (insert nav item).
- Edit `src/lib/mock-data.ts` (selectors above).

## Out of scope

- No CSV/loader changes; uses existing `MasterRow` fields.
- No global filter changes; Manager filter is local to this screen.
- No new design tokens.
