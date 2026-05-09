## Revenue & Fees Analytics — full screen build-out

Rename the existing screen to **Revenue & Fees Analytics** and replace its single chart with the five new charts below. Sidebar label updated to match.

### Layout (top → bottom)

1. **Top Managers — AUM Org & Weighted Avg Fee** (Composed: Bars + Line)
   - Bars: AUM Org for top 10 Managers by size + "Others" bucket.
   - Line: weighted avg fee (bps) per bar = Σ(Fee_bps · AUM) / Σ(AUM).
   - Toolbar: ETF / MF toggle.
   - Custom hover card per bar: Manager · Total AUM Org · Total RRR · Weighted Avg Fee (bps).

2. **Fee Heatmap — Category × Top 5 Managers**
   - Rows = Categories, Columns = top 5 Managers by AUM Org (system-wide).
   - Cell value = weighted avg fee (bps) for that Category × Manager slice.
   - Color: relative scale (min→max present in matrix), neutral→accent ramp from design tokens.
   - Tooltip shows Manager, Category, weighted fee, AUM.

3. **Fee vs NNB — Security Scatter**
   - X = NNB ($), Y = Fee (bps), one bubble per security, colored by Category.
   - Toggles: YTD / Month · Fee threshold (All / >20 bps / >40 bps).
   - Multi-filters: Category, Manager, AFP.
   - Hover card: compact 2-col table — AFP | AUM Org $ — for that security, sorted desc.

4. **RRR by AFP — Stacked Bar by Category**
   - X = AFPs, stacks = Categories, value = RRR ($).
   - Toolbar: Manager multi-filter, ETF / MF toggle.

5. **Category Fee Bubble — System vs Selected AFP**
   - X = Category (categorical axis), Y = weighted avg fee (bps).
   - Two bubbles per category:
     - Grey = system-wide weighted avg fee.
     - Green = weighted avg fee for the single selected AFP.
   - Bubble size = category share of total AUM Org (%).
   - Green shade = iShares/BlackRock market share within that category (lighter→darker).
   - Toolbar: ETF / MF / All toggle, single-select AFP dropdown.

### Data layer (`src/lib/mock-data.ts`)

Add pure selectors derived from `MASTER_DATA` (reusing `Fee_bps`, `RRR_USD`, `AUM_USD`, `bucketOf`, `managerColor`, `categoryColor`):

- `getManagerAumFee({ bucket })` → `[{ Manager, AUM, RRR, Fee_bps }]` top10 + Others.
- `getFeeHeatmap({ bucket })` → `{ categories, managers, cells: number[][] }` (top 5 managers by AUM).
- `getSecurityFeeNnb({ period, bucket?, managers, categories, afps, feeMin })` → `[{ id, name, ticker, Category, Manager, NNB, Fee_bps, byAfp:[{AFP,AUM}] }]`.
- `getRrrByAfpCategory({ bucket, managers })` → `{ rows:[{AFP, ...categoryKeys}], categories }`.
- `getCategoryFeeBubbles({ bucket, afp })` → `[{ Category, sysFee, afpFee, sharePct, blkSharePct }]`.

### Files touched

- `src/components/views/RevenueFeeAnalytics.tsx` — replace contents with the 5 new chart cards.
- `src/lib/mock-data.ts` — add selectors above.
- `src/components/shell/Sidebar.tsx` — relabel entry to "Revenue & Fees Analytics".
- New small widgets if needed: `FeeHeatmap.tsx` (custom SVG/CSS grid; recharts has no native heatmap). Other charts use existing recharts primitives.

### Out of scope

- No backend / schema changes; all data derived from existing `MASTER_DATA`.
- Other screens (Scorecard, AFP Deep Dive, Flows Intelligence, Securities) untouched.
- No new design tokens — reuse `managerColor`, `categoryColor`, `BUCKET_COLOR`, `CHART_COLORS` and existing primary/muted tokens.
