## Goal

Reorganize the System Summary (Scorecard) layout and add an ETF/MF toggle to the Category Weights chart.

## Layout changes (`src/components/views/Scorecard.tsx`)

1. **Below KPI row**: render the **Category Weights — AFP vs System** card full-width as the prominent next section.
2. **Below that**: a 2-column row on `lg+` using `grid-cols-1 lg:grid-cols-3`:
   - **AUM Org — Evolution by Asset Type** spans `lg:col-span-2` (2/3 width).
   - **Top 5 Managers — Market Share** donut spans `lg:col-span-1` (1/3 width).
3. The existing AUM Org Composition by Category (ETF / MF stacked area pair) section stays where it is at the bottom.
4. On mobile (`< lg`), all cards stack full-width in the same vertical order.

## Category Weights chart enhancements

1. Add bucket state `weightsBucket: Bucket` (`"ETF" | "Mutual Fund"`, default `"ETF"`) in `Scorecard`.
2. Render a `SegmentedToggle` in the card header right slot alongside the existing AFP picker, with options ETF / MF (reuse `BUCKET_TOGGLE` minus Money Market, or define a local 2-option array).
3. Update `getCategoryWeightBubbles` in `src/lib/mock-data.ts` to accept an optional `bucket?: Bucket` argument:
   - When provided, filter `allRows` and `afpRows` to only that bucket via `bucketOf(r) === bucket` before computing `totalAll`, `totalAfp`, `aggWeight`, `afpWeight`, and `sizeShare`.
   - Default behavior (no bucket) unchanged so other call sites keep working.
4. Wire `bubbles` memo to depend on `weightsBucket` and pass it through.
5. Update the card subtitle to reflect the active bucket (e.g. `Bubble size = (iShares + BlackRock) share within Category — {bucket}`).

## Out of scope

- No KPI changes, no color-token changes, no other views, no responsive shell changes.
