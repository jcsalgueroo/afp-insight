## Add "Flows by Category" bubble chart to System Summary

A new chart goes at the bottom of Screen 1 (System Summary), below the Category Weights bubble chart.

### Chart spec

- **Type**: Recharts `ScatterChart` with one `<Scatter>` series whose points are categories.
- **X axis**: Total ETF flows (NNB_USD, sum across all managers) for the category.
- **Y axis**: Total Mutual Fund flows (NNB_USD, sum across all managers) for the category. Money Market is excluded (out of scope for ETF vs MF view).
- **Bubble size (ZAxis)**: iShares ETF NNB ÷ Total ETF NNB within that category, expressed as %. When total ETF NNB ≈ 0, fall back to a minimum bubble size and show "n/a" in the tooltip share.
- **Color**: single brand green (`--primary`) for all bubbles; category label rendered next to each point.
- **Quadrants**: X=0 and Y=0 reference lines so the four quadrants are visible (categories with negative ETF or MF flows are shown in their natural quadrant).
- **Tooltip**: Category, ETF NNB ($), MF NNB ($), iShares share of ETF NNB (%).

### Controls (chart header)

- **Period toggle** (`SegmentedToggle`): `Month` | `YTD`. Defaults to `Month` using the dashboard's globally selected month. `YTD` = cumulative Jan→selected month.
- **AFP filter** (`AfpFilterPopover`, local multi-select). Defaults to global filter selection but operates independently, matching the other Screen 1 charts.

### Data layer (`src/lib/mock-data.ts`)

Add one new selector:

```text
getCategoryFlowBubbles(f: Filters, afps: AFP[], period: "Month" | "YTD")
  → Array<{ category, etfNnb, mfNnb, iSharesShare }>
```

- Period = `Month`: rows where `Date === f.date`.
- Period = `YTD`: rows where Date ∈ months Jan→f.date (reuse existing `monthsYTD` helper).
- For each `Category` in `CATEGORIES` excluding `Money Market`:
  - `etfNnb` = sum of `NNB_USD` where `bucketOf(r) === "ETF"`.
  - `mfNnb` = sum of `NNB_USD` where `bucketOf(r) === "Mutual Fund"`.
  - `iSharesEtfNnb` = sum of `NNB_USD` where `brandOf(r) === "iShares"`.
  - `iSharesShare` = `iSharesEtfNnb / etfNnb` (null when |etfNnb| < epsilon).

### View wiring (`src/components/views/Scorecard.tsx`)

- Append a new `<Card>` below the existing Category Weights bubble chart, full width.
- Local state: `period: "Month" | "YTD"` and `afps: AFP[]` (initialized from global filter).
- Render header with title, `SegmentedToggle`, and `AfpFilterPopover`.
- Use existing chart styling (axis ticks formatted via `formatUSD({compact:true})`, ZAxis range tuned so smallest non-zero share ≈ 80px² and 100% ≈ 600px²).

### Out of scope

- No changes to other views, KPIs, routes, or design tokens.
- No backend.
