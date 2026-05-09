## Product Penetration — new screen

Add a fifth dashboard screen showing BlackRock/iShares' market share across each (Category × AFP) cell, plus a follow-up table of weak cells.

### Sidebar & route
- `src/components/shell/Sidebar.tsx` — add entry "Product Penetration" (icon: `Crosshair` or `Target`), route `/penetration`.
- `src/routes/penetration.tsx` — new route file.
- `src/components/views/ProductPenetration.tsx` — new view.

### Section 1 — BlackRock Share Heatmap
- **Rows**: Categories, sorted desc by aggregated AUM Org across all selected AFPs/Portfolio Types/bucket.
- **Columns**: AFPs (all six, fixed left→right).
- **Cell value**: `BLK_AUM / Total_AUM` for that (Category, AFP) slice → 0–100%.
- **Color**: white (0%) → green (100%) linear ramp using design tokens (reuse `categoryColor`/primary green).
- **Toolbar**:
  - ETF / Mutual Fund / All segmented toggle (`SegmentedToggle`).
  - Portfolio Type multi-select (`MultiSelectPopover`, options A–E, default = all).
- **Hover card** (per cell): top-3 managers in that (Category, AFP) cell with name + % share, plus header showing Category, AFP, BLK share %.

### Section 2 — Punching Below our Weight
- Identifies all (Category, AFP) cells where BLK share < 65% (after applying the heatmap's bucket + portfolio filters).
- Header includes a **Group By** segmented toggle: `Category → AFP` (default) | `AFP → Category`.
- Renders as a grouped table (`Table` primitive) with sticky group headers:
  - Outer group header: Category (or AFP) — shows aggregate AUM Org & avg BLK share %.
  - Inner group header: AFP (or Category) — shows that cell's BLK share % and AUM.
  - Rows = every security held in that cell (BlackRock + competitors).
- **Columns**: Ticker / Name · Manager · AUM Org (USD) · YTD Perf (USD %) · YTD NNB (USD).
  - "Ticker / Name": ETFs show ticker (derive from ISIN tail), Mutual Funds show full name — reuse the convention from the Securities screen.
  - Base-currency YTD column omitted for now (per user) — note in column header tooltip.

### Data layer (`src/lib/mock-data.ts`)
Add pure selectors derived from `MASTER_DATA`:
- `getPenetrationHeatmap({ bucket, portfolioTypes })` → `{ categories: Category[]; afps: AFP[]; cells: { blkShare:number; totalAUM:number; topManagers:[{Manager, sharePct}] }[][] }`. Categories pre-sorted by total AUM desc.
- `getBelowWeightSecurities({ bucket, portfolioTypes, threshold:0.65 })` → flat list `[{ Category, AFP, blkShare, ISIN, Ticker, Name, Manager, Asset_Type, AUM_USD, YTD_Perf, NNB_USD }]` ready for either grouping.

Bucket filter helpers (`bucketOf`) already exist; reuse.

### Widgets
- Reuse `SegmentedToggle`, `MultiSelectPopover`, `Card`, `Table`.
- New small `Heatmap` rendered as CSS grid (no recharts heatmap primitive); hover card via `Popover` or a lightweight absolute-positioned div on `onMouseEnter`.

### Out of scope
- No backend / schema changes.
- No edits to other screens.
- No new design tokens — green ramp uses existing primary; whites/borders use existing tokens.
- Base-currency performance column deferred until real FX data exists.
