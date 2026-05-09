## AFP Portfolio Intelligence — Implementation Plan

A multi-view analytical dashboard styled as a native BlackRock/iShares institutional tool. Light theme only, iShares Green (#00B140) reserved for BlackRock data and primary actions.

### 1. Design System Setup

Update `src/styles.css` tokens (light only, no dark mode):
- `--background: #FFFFFF`, `--surface-alt: #F5F5F5`, `--foreground: #000000`, `--muted-foreground: #6D6D6D`, `--border: #E5E5E5`
- `--primary: #00B140` (iShares green), `--nav: #000000`
- Data viz: `--blk: #00B140`, `--blk-alt: #000000`, `--competitor: #999999`, `--positive: #34A853`, `--negative: #D93025`, `--grid: #E5E5E5`
- Add Inter via Google Fonts; use `font-mono` (JetBrains Mono) for tabular numbers
- Card radius 4–6px, `shadow-sm`, 1px border

### 2. Mock Data Layer (`src/lib/mock-data.ts`)

Generate deterministic data (seeded) for ~6 AFPs × 4 Portfolio_Types × 12 months × ~80 ISINs:
- `MasterData[]` with all required fields (AFP, Portfolio_Type A/B/C/D/E, ISIN, Name, Manager [BlackRock, Vanguard, State Street, Invesco, JPMorgan, Other], Category [Equity DM, Equity EM, Fixed Income IG, HY, Money Market], Asset_Type, AUM_USD, NNB_USD, RRR_USD, Fee_bps, YTD_Perf)
- `DisplacementMapping[]` linking ~30 competitor ISINs → BLK alternatives with Match_Type, fee/perf advantages
- Helper selectors: `getKPIs`, `getMarketShare`, `getAFPTreemap`, `getDisplacementOpps`, `getNNBByManager`, etc.

### 3. Global State (`src/lib/dashboard-store.ts`)

Lightweight Zustand (or React context) store for:
- `selectedDate` (month), `selectedAFPs[]`, `blkOnly` toggle
- Shared across nav bar and all views

### 4. Routes (TanStack file-based)

- `src/routes/__root.tsx` — wrap with shell (TopNav + Sidebar + Outlet), QueryClientProvider preserved
- `src/routes/index.tsx` — redirect or render Executive Scorecard
- `src/routes/scorecard.tsx` — View 1
- `src/routes/afp.tsx` — View 2
- `src/routes/flows.tsx` — View 3
- `src/routes/securities.tsx` — View 4

Each route sets unique `head()` metadata.

### 5. Shell Components (`src/components/shell/`)

- `TopNav.tsx` — black bar, white "AFP Portfolio Intelligence" wordmark left; right side: Date dropdown, AFP multi-select (Shadcn Popover + Checkbox list), "BlackRock Only" Switch
- `Sidebar.tsx` — light gray (`#F5F5F5`) bg, 4 nav links with icons (BarChart3, PieChart, TrendingUp, Table), active = black text + green left border, inactive = gray text

### 6. View 1 — Executive Scorecard (`src/components/views/Scorecard.tsx`)

- 4 KPI cards (BLK RRR, Total BLK AUM, BLK YTD NNB, BLK YTD NNBF): big mono number, MoM delta in muted green/red with arrow, 4-month Recharts `<Sparkline>` (mini LineChart, no axes)
- Toggle group (AUM / NNB / RRR) above
- 100% stacked horizontal `BarChart` — Top 5 Managers' share, BlackRock = green, others = gray shades

### 7. View 2 — AFP Deep Dive (`src/components/views/AFPDeepDive.tsx`)

- AFP single-select dropdown at top
- Recharts `Treemap`: Manager → Category (BLK nodes green, others gray)
- Grouped `BarChart` by Portfolio_Type: BLK (green) vs Competitor (gray) AUM
- Displacement Opportunities table with Match_Type filter Select above; columns: Competitor, AUM (mono right-aligned), Fee bps, BLK Alternative, Match badge (Direct=green, Close=black outline, Broad=gray), Fee Advantage (muted green)

### 8. View 3 — Flows & Fee Intelligence (`src/components/views/Flows.tsx`)

- Waterfall via custom stacked `BarChart` (transparent base + delta) for NNB by Manager
- `ScatterChart`: X=YTD_Perf, Y=NNB_USD, size by AUM (ZAxis), colored by Manager (BLK green, others gray palette)
- `ComposedChart`: bars=AUM (left axis), line=avg Fee_bps (right axis, 2px stroke)

### 9. View 4 — Security-Level Detail (`src/components/views/Securities.tsx`)

- Shadcn Data Table using `@tanstack/react-table`: sortable headers, global search input, pagination (25/page), numeric columns right-aligned mono, sticky `#F5F5F5` uppercase header, no vertical borders, thin horizontal rules
- Columns: Date, AFP, Portfolio_Type, ISIN, Name, Manager (badge: green for BLK), Category, AUM, NNB, RRR, Fee bps, YTD %

### 10. Shared UI Helpers

- `KpiCard`, `Sparkline`, `DeltaBadge`, `ManagerBadge`, `MatchTypeBadge`, `formatUSD`, `formatBps`, `formatPct`
- Recharts theme config: `CartesianGrid stroke="#E5E5E5"`, no gradients, flat fills, Inter tick fonts

### Technical Notes

- Install: `bun add zustand recharts @tanstack/react-table` (recharts may already be present — verify)
- All colors via CSS tokens / Tailwind arbitrary values mapping to tokens; no raw hex in JSX except chart `fill`/`stroke` props pulling from a central `chartColors` constant
- Deterministic mock data via seeded RNG so charts are stable across renders
- No backend / Lovable Cloud needed — pure frontend
- Sidebar collapse not requested but include subtle active state per spec

```text
+---------------------------------------------------+
| BLACK TOP NAV   [Date v] [AFPs v]   [BLK Only ●] |
+--------+------------------------------------------+
|Sidebar | View content (white / #F5F5F5 sections)  |
| • Score|   KPIs / Charts / Tables                 |
| • AFP  |                                          |
| • Flows|                                          |
| • Secs |                                          |
+--------+------------------------------------------+
```
