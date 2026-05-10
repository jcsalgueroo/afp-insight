# YTD KPIs, color palette, and crowded-chart readability

## 1. Fix YTD KPI values

In `src/lib/mock-data.ts › getKPIs`, the `nnb` and `nnbf` values are currently month NNB and a synthetic `nnb * 0.0035` proxy. Replace with the YTD columns already loaded by `data-loader.ts`:

- `nnb` = sum of `NNB_YTD_USD` (BlackRock rows, current month)
- `nnbf` = sum of `NNBF_YTD_USD` (BlackRock rows, current month)
- `nnbDelta` / `nnbfDelta`: compare current YTD vs previous month's YTD (still meaningful — YTD growth MoM).
- `trendNNB` (sparkline used for both NNB and NNBF cards): switch to YTD trajectory across the trailing 4 months using `NNB_YTD_USD`. Add a separate `trendNNBF` from `NNBF_YTD_USD` so each KPI card has its own sparkline.
- Update `Scorecard.tsx` so the NNBF card uses `k.trendNNBF` instead of reusing `k.trendNNB`.

Labels stay "BLK YTD NNB" and "BLK YTD NNBF" (already correct).

## 2. Expand color palette

In `src/styles.css`, add new semantic tokens (oklch equivalents of the requested hex values, plus a couple of shades for stack depth):

- `--accent-lime` (#32CD32), `--accent-lime-soft` (lighter shade)
- `--accent-yellow-green` (#9ACD32)
- `--accent-yellow` (#FFFF00), `--accent-gold` (#FFD700)
- `--accent-orange` (#FFA500), `--accent-orange-soft` (lighter shade)

Register each in the `@theme inline` block as `--color-accent-*` so Tailwind utilities like `bg-accent-lime` work. Also define dark-mode variants tuned for legibility on the dark surface.

In `src/lib/mock-data.ts`:

- Replace the gray-heavy `CHART_COLORS.grayPalette` consumption for non-BlackRock managers with a new `MANAGER_PALETTE` that mixes the new accent colors (BlackRock stays green `#00B140`, iShares stays the green brand). Keep `competitor` gray as a fallback for any overflow beyond the palette.
- Replace `CATEGORY_PALETTE` with a richer palette built from the new tokens (greens → lime → yellow-green → gold → orange) so adjacent stacked categories are visually distinct. Keep "Money Market" pinned to a neutral gray.
- Update `BUCKET_COLOR` so Mutual Fund and Money Market use distinguishable accent colors (e.g. ETF = brand green, MF = orange, MM = gold) instead of black + gray.

Touched downstream usages (no logic changes — colors flow through existing `categoryColor`, `managerColor`, `brandColor`, `BUCKET_COLOR`): `Scorecard`, `Flows`, `AFPDeepDive`, `RevenueFeeAnalytics`, `ProductPenetration`.

## 3. Improve readability of crowded category charts

Add a shared helper in `mock-data.ts`:

```text
collapseToTopN(seriesRows, keys, N=6, otherLabel="Others")
  → { rows, keys }  // small keys merged into a single "Others" series
```

Apply it to the selectors that feed crowded stacked charts:

- `getCategoryCompositionSeries` (Scorecard ETF/MF Composition) — collapse categories beyond top 6 by total AUM share into "Others".
- `getNnbByManagerStacked` (AFP Deep Dive NNB by Manager stacked by category) — same treatment for the category stack keys.
- `getCumulativeNnbStacked` (Flows) — collapse the stack keys (Manager or Category) beyond top 6.
- `getRrrByAfpCategory` (Revenue & Fees) — collapse categories beyond top 6.

"Others" is rendered with a neutral gray (`competitor` token) so it visually recedes. The top-6 cutoff is a constant exported from `mock-data.ts` (`STACK_TOP_N = 6`) so it's easy to tune later.

No legend layout, chart height, or interactivity changes — those were not selected.

## 4. Out of scope

- No new routes, no auth/data-layer changes, no shell/responsive changes.
- No KPI label changes.
- No chart-type changes (stacked area / bar shapes preserved).

## Technical notes

- All KPI math stays in `getKPIs`; `Scorecard.tsx` only changes the `trend` prop on the NNBF card.
- The new color tokens are defined as oklch values in `src/styles.css` per the design-system rule, but the chart palettes in `mock-data.ts` continue to use hex strings (Recharts requires concrete color strings, not CSS variables) — the hex values mirror the oklch tokens.
- `collapseToTopN` operates on already-aggregated rows, so existing total/percent math still adds up (the merged "Others" sums the dropped series exactly).
