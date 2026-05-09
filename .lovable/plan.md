## Flows Intelligence overhaul + new Revenue & Fee Analytics screen

### 1. Flows Intelligence — chart changes

Replace and add charts on `src/components/views/Flows.tsx`. Final layout (top-to-bottom):

1. **NNB by Manager — Donut** *(replaces Waterfall)*
   - Top 5 managers by NNB + "Others" slice.
   - Toolbar: ETF/MF toggle, YTD/Month toggle, multi-select AFP filter.
   - Center label = total NNB; tooltip shows $ + % share.

2. **Cumulative NNB — Stacked Bar** *(new)*
   - Single bars (one value per Manager or per Category) stacked by the other dimension.
   - Toolbar: ETF/MF toggle, YTD/Month toggle, sort-by toggle (Manager | Category), AFP multi-filter.
   - "By Manager": X = Managers, stack segments = Categories. "By Category": X = Categories, stack = Managers.

3. **Performance vs Flows — Scatter** *(existing, expanded controls)*
   - Toolbar: YTD/Month toggle (drives both perf & flows axes), AFP multi-filter, Manager multi-filter, Category multi-filter.
   - Bubble size still = AUM.

4. **Top 5 / Bottom 5 Securities by Flows — Bar** *(new)*
   - Single horizontal bar chart, 10 rows: top 5 inflows (positive, green) + bottom 5 outflows (negative, red), sorted by flow.
   - ETFs labeled by Ticker, Mutual Funds by Fund Name (driven by ETF/MF toggle).
   - Toolbar: ETF/MF toggle, YTD/Month toggle, AFP multi-filter, Manager multi-filter.

5. **Monthly Flows by Bucket — Stacked Bar** *(new)*
   - X = all available months (`MONTHS`), stacked $ NNB by ETF / Mutual Fund / Money Market using `BUCKET_COLOR`.
   - No toggles (AFP filter optional — include AFP multi-filter for consistency).

6. **Keep**: YTD NNB by Manager (area), YTD NNBF by Manager (area), Flows by Category scatter.

7. **Remove**: NNB Waterfall, AUM vs Avg Fee (moves to new screen).

### 2. New screen: Revenue & Fee Analytics

- New route `src/routes/revenue.tsx` with head meta.
- New view `src/components/views/RevenueFeeAnalytics.tsx`.
- Sidebar entry under/after "Flows Intelligence" labeled **Revenue & Fee Analytics**.
- Initial content: the **AUM vs Avg Fee by Manager** card moved verbatim from Flows.

### 3. Data selectors (`src/lib/mock-data.ts`)

Add small helpers (all pure, derived from `MASTER_DATA`):

- `getNnbDonut(afps, bucket, period: "Month"|"YTD")` → `[{ Manager, NNB }]` top5 + Others.
- `getCumulativeNnbStacked(afps, bucket, period, sortBy: "Manager"|"Category")` → `{ rows: [{key, ...stackKeys}], stackKeys: string[] }`.
- `getTopBottomSecurities(afps, managers, bucket, period)` → `[{ label, NNB, isTop }]` (5 highest + 5 lowest by NNB; label = ticker for ETF, fund name for MF).
- `getMonthlyBucketFlows(afps)` → `[{ m, ETF, "Mutual Fund", "Money Market" }]` for all `MONTHS`.
- Extend `getScatter` (or add `getScatterFiltered`) to accept `{managers, categories, period}` so Performance vs Flows can filter & switch YTD/Month.

Mock-data already exposes `MASTER_DATA` rows with monthly NNB / NNB_YTD-style fields; helpers reuse `bucketOf`, `brandOf`, `tickerOf`.

### 4. Files touched

- `src/lib/mock-data.ts` — new selectors above.
- `src/components/views/Flows.tsx` — restructure per layout list.
- `src/components/views/RevenueFeeAnalytics.tsx` — new file.
- `src/routes/revenue.tsx` — new route.
- `src/components/shell/Sidebar.tsx` — add nav entry.
- `src/routes/flows.tsx` — title unchanged.

### Out of scope

- No backend / schema changes.
- No new design tokens; reuse `managerColor`, `categoryColor`, `BUCKET_COLOR`, `CHART_COLORS`.
- Existing Scorecard / AFP Deep Dive / Securities screens untouched.
