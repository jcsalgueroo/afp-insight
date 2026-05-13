# Flows Intelligence — Chart Overhaul

Scope: `src/components/views/Flows.tsx` (UI) and `src/lib/mock-data.ts` (selectors). No business-logic / data-model changes.

## 1. NNB by Manager — donut → bar chart

- Replace `RPieChart` with a horizontal `BarChart` (`layout="vertical"`).
- Keep current toggles: Bucket (ETF/MF/MM), Period (Month/YTD), AFP filter.
- Reuse `getNnbDonut` (rename internally to a manager-level NNB selector — same shape `{Manager, NNB}`) but **drop "Others"** and **return all managers with NNB ≠ 0**, sorted by NNB descending.
- Diverging around 0: `ReferenceLine x={0}`, bar fill = `managerColor(Manager)`; positives extend right, negatives left.
- Remove the donut center label (Total NNB); show total as small text in the card header (right side or subtitle).

## 2. Cumulative NNB — prune zero rows / stack keys

- In `getCumulativeNnbStacked`, after building `data`:
  - Filter out X categories whose row sum across all stack keys is 0.
  - Filter out stack keys whose total across all rows is 0 (before / instead of the existing top-N collapse, so empty keys never become "Others").
- Behavior: ETF bucket hides Allianz on the X axis (Manager mode) and hides MM-only categories (already handled), and similarly hides empty stack keys.

## 3. Performance vs Flows — ETF/MF toggle + per-security bubbles + rich hover

- Add `SegmentedToggle` for `ETF` | `Mutual Fund` (default ETF) — replaces nothing, sits alongside existing Period/AFP/Managers/Categories filters.
- Update `getScatterFiltered` to accept `bucket: "ETF" | "Mutual Fund"` and filter rows via `bucketOf(r) === bucket`. Each row already aggregates per ISIN so each bubble is one security; include `Ticker` (via `tickerOf(isin)`) and `Bucket` in the returned shape.
- Color bubbles by Manager (existing `scatterByManager` grouping works).
- Custom Recharts `Tooltip content={...}` showing:
  - Manager (bold)
  - Ticker (ETF) or Name (MF)
  - AUM — `formatUSD`
  - Performance — `${perf.toFixed(2)}%` (NO dollar sign, percentage formatting)
- Y axis still NNB, X axis still Perf%.

## 4. Move "Flows by Category — ETF vs MF" directly below Performance vs Flows

- Reorder JSX in `Flows.tsx` so the `Flows by Category` `CardShell` renders immediately after `Performance vs Flows`, before Top/Bottom 5 and the rest.

## 5. Top 5 / Bottom 5 — hover card with AFP breakdown

- Extend `getTopBottomSecurities` rows with `isin` and `afpBreakdown: {AFP, NNB}[]` (sorted by `|NNB|` desc, computed from `flowRows` filtered by ISIN).
- Replace default Recharts tooltip with a custom `content` component:
  - Manager
  - Label (Ticker or Name) — already present
  - NNB total — `formatUSD`
  - Table: AFP → NNB (signed), one row per AFP that traded.

## 6. Monthly Flows by Bucket — diverging stacked bars

- Recharts stacks signed values natively. Add `ReferenceLine y={0}`. Confirm bars use a single `stackId` (already do). Negative bucket totals will render below zero automatically; no selector change required (values are already signed).
- Add `stackOffset="sign"` on `BarChart` to get true diverging stacking (positives up, negatives down per bar).

## 7. YTD NNB by Manager + YTD NNBF by Manager — stacked diverging bars (per-month)

- Replace `AreaChart` with `BarChart` + `stackOffset="sign"` and `ReferenceLine y={0}`.
- Update `getYtdByManagerSeries` to return **per-month signed values** (not the running cumulative). Same shape `{ data: [{m, [brand]: monthlyNNB}], brands }`. This way managers with negative monthly NNB appear below zero; the YTD framing is preserved by spanning all YTD months on the X axis.
- Same for NNBF (already uses the same selector with `metric="NNBF"`).
- Brands still chosen by absolute YTD totals; bar fill = `brandColor(b)`; legend unchanged.

## Technical notes

- Files touched:
  - `src/components/views/Flows.tsx` — JSX reorder, chart-type swaps, custom tooltip components, new ETF/MF toggle state.
  - `src/lib/mock-data.ts` — `getNnbDonut` (rename/repurpose for full bar list), `getCumulativeNnbStacked` (zero pruning), `getScatterFiltered` (bucket param + ticker), `getTopBottomSecurities` (afpBreakdown), `getYtdByManagerSeries` (per-month, not cumulative).
- All new colors from existing `managerColor` / `brandColor` / `BUCKET_COLOR` helpers — no raw hex.
- Custom tooltips render with existing `tooltipStyle` look-and-feel inside a `bg-popover border border-border rounded-md shadow-md p-2 text-xs` container.
- No changes to other views, routes, data-loader, or shell components.
