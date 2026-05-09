## Summary of changes

### 1. System Summary — add 2 new 100% stacked area charts

New row with two side-by-side cards:
- **ETF AUM Org — Composition by Category** (100% stacked area)
- **Mutual Fund AUM Org — Composition by Category** (100% stacked area)

Both cards share a single multi-select `AfpFilterPopover` (defaults to All) rendered in a small toolbar above the row so it controls both charts. X-axis spans every available month in the dataset (`MONTHS`), Y-axis is 0–100% with each Category as a stacked band using existing `categoryColor()`. Tooltip shows category $ AUM Org and % of bucket total for the hovered month.

New selector in `src/lib/mock-data.ts`: `getCategoryCompositionSeries(afps, bucket)` → for each month, returns `{ m, [category]: pctShare }` plus a `__raw` map for $ tooltips. Reuses `MASTER_DATA` filtered by bucket and AFPs.

### 2. System Summary — remove 3 charts (move to Flows)

Delete from `Scorecard.tsx`:
- "YTD NNB by Manager" card
- "YTD NNBF by Manager" card
- "Flows by Category — ETF vs Mutual Fund" scatter card

Drop now-unused local state (`nnbBucket`, `nnbAfps`, `nnbfBucket`, `nnbfAfps`, `flowPeriod`, `flowAfps`) and related `useMemo`s.

### 3. Flows screen → renamed "Flows Intelligence", gains the 3 moved charts

- Sidebar label `src/components/shell/Sidebar.tsx`: "Flows & Fees" → "Flows Intelligence".
- Route head title in `src/routes/flows.tsx`: update `<title>` to "Flows Intelligence — AFP Portfolio Intelligence".
- `src/components/views/Flows.tsx` heading text → "Flows Intelligence".
- **Keep** existing charts: NNB Waterfall, Performance vs Flows, AUM vs Avg Fee.
- **Append** the 3 moved charts (YTD NNB by Manager, YTD NNBF by Manager, Flows by Category) at the bottom, with their existing local toggles/filters preserved 1:1. Reuse `CardShell` pattern from Scorecard (or copy the small helper into Flows).

### 4. AFP Deep Dive — Positions table sort

Confirmed already correct (categories sorted by total AUM desc, items within a category sorted by AUM desc). No code change.

## Technical notes

- New selector signature:
  ```ts
  getCategoryCompositionSeries(afps: AFP[], bucket: Bucket):
    Array<{ m: string; [cat: string]: number }>
  ```
  Values are 0–1 percentages; tooltip computes $ from a parallel map or the function returns `{ pct, raw }` per row — implement as `{ m, total, ...catPct, __raw: Record<Category,number> }` to keep recharts area `dataKey` straightforward.

- Excludes Money Market only inside the ETF/MF series naturally because `bucket` filter already excludes other buckets. Categories with 0 AUM in a month are still emitted (value 0) so the stack stays continuous.

- Recharts setup: `<AreaChart stackOffset="expand">` gives the 100% effect automatically when each series uses `stackId="1"` and raw $ values, but to keep tooltips showing real $ we'll feed % directly and put $ in `__raw` for the formatter. Y-axis `tickFormatter={(v)=>`${(v*100).toFixed(0)}%`}`, domain `[0,1]`.

- Shared filter for the two new charts uses local `useState<AFP[]>([])` in `Scorecard`, passed into both `getCategoryCompositionSeries` calls.

## Files touched

- `src/lib/mock-data.ts` — add `getCategoryCompositionSeries`.
- `src/components/views/Scorecard.tsx` — remove 3 charts + their state; add 2 new area-chart cards with shared AFP filter.
- `src/components/views/Flows.tsx` — rename heading, append 3 moved charts (with their local state & toggles).
- `src/components/shell/Sidebar.tsx` — rename nav label.
- `src/routes/flows.tsx` — update head title/description.

## Out of scope

- No backend or data-model changes.
- No design-token changes.
- AFP Deep Dive Positions table — verified, no edit needed.
