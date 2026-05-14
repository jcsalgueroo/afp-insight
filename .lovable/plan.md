# Performance Analytics — math fix + richer hover cards

## 1. Cumulative Portfolio Performance — math fix
File: `src/lib/mock-data.ts`, `getCumulativePerformanceSeries`.

`Perf_Month` is a plain decimal (0.1756 = 17.56%), not a percent.
- Change line 1956 from `values[s] * (1 + wp / 100)` to `values[s] * (1 + wp)`.
- Weighting stays AUM-weighted via `AUM_USD` (the field used as "AUM Org" throughout the app — confirm same source).
- No change to `getCumulativePerformanceSeries` signature; the line chart in `PerformanceAnalytics.tsx` keeps current axis/format.

Note: `Perf_YTD` continues to be treated as percent units (used in scatter Y axes shown as `xx.xx%`). Only `Perf_Month` math is corrected. Flag: if `Perf_YTD` is also a decimal in the source, it would need the same correction — call this out and ask if the YTD scatter values currently look 100× too large.

## 2. Category Positioning by AFP — rich hover card
File: `src/components/views/PerformanceAnalytics.tsx`, `src/lib/mock-data.ts`.

Add a custom recharts `<Tooltip content={...}>` showing for the hovered bubble:
- AFP name
- Category name
- Category weight (% of AFP total portfolio AUM, current month)
- AUM-weighted YTD performance for AFP × Category
- Top 5 holdings in that AFP × Category at `asOf`, ranked by `AUM_USD`, with: Ticker/ISIN/Name (use Name when available else Ticker), `AUM_USD` formatted via `formatUSD`.

Data plumbing: extend `CategoryAfpBubble` (or attach a parallel lookup) so each bubble payload carries `topHoldings: { name: string; aum: number }[]` precomputed in `getCategoryAfpBubbles`. Avoid recomputing inside the tooltip render.

For the System group: top 5 across all AFPs in that category.

## 3. Asset-Class Weight vs Performance — remove labels, add hover card
File: `src/components/views/PerformanceAnalytics.tsx`.

- Remove the per-bubble `<LabelList dataKey="group">` (the chip showing AFP next to the dot).
- Keep the legend (one entry per AFP + System) so colors are still readable. If user wants the legend removed too, easy follow-up — confirm.
- Add a custom tooltip showing: AFP name, asset-class weight (%), YTD performance (%).

## 4. Category Dispersion vs System — rich hover card
File: `src/components/views/PerformanceAnalytics.tsx`, `src/lib/mock-data.ts`.

Add a custom tooltip per bubble showing:
- AFP name (or "System")
- Selected Category name
- Weight in category (% of AFP total portfolio AUM)
- AUM-weighted YTD performance for AFP × Category
- Top 5 holdings in that AFP × Category at `asOf` ranked by `AUM_USD`.

Data plumbing: extend `getCategoryDispersion` return so each point includes `topHoldings`. System point shows top 5 across all AFPs in that category.

## 5. Shared bits
- One reusable `<HoldingsTooltip>` component in `PerformanceAnalytics.tsx` rendering the card (re-used by sections 2 and 4).
- Holdings list helper `topHoldingsFor(rows, n=5)` in `mock-data.ts` to keep logic in one place.
- No styling changes outside the tooltip cards; reuse `bg-popover`, `border`, `shadow-md` tokens.

## Open question
- Should `Perf_YTD` also be reinterpreted as a decimal (so 0.1756 → 17.56%)? Today the scatter axes assume it's already in percent units. If it's actually a decimal in the data, all four scatter charts would need a `* 100` on the Y values.
