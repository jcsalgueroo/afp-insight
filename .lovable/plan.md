## Replace mock data with live Google Sheets CSVs

Wire the dashboard to two live Google Sheets CSV endpoints (MasterData + DisplacementMapping), parse with PapaParse, store in a Zustand global store, and feed every existing chart/table through hooks. UI/visuals stay identical except for two new toggles (Money Market bucket option, Month/YTD performance toggle).

### 1. Dependencies
- `bun add papaparse` and `bun add -d @types/papaparse`.

### 2. New files

**`src/lib/data-sources.ts`** — CSV URL constants + `fetchCsv<T>(url, { numericFields })` helper using `Papa.parse` with `header: true, skipEmptyLines: true`. Numeric coercion is explicit (per field list) rather than `dynamicTyping`, so blanks become `0`/`null` predictably.

**`src/lib/normalize.ts`** — Pure mappers from raw CSV row → existing typed rows.

`MasterRow` mapping (per confirmed walkthrough):
| UI field | Live column | Transform |
|---|---|---|
| `Date` | `fecha_corte` | normalize to `YYYY-MM` |
| `AFP` | `standardized_afp` | string |
| `Portfolio_Type` | `standardized_portfolio` | string |
| `Category` | `category` | string |
| `Asset_Type` | `type` | `'ETF' \| 'Mutual Fund' \| 'Money Market'` |
| `Manager` | `manager` | merge `iShares` → `BlackRock` |
| `Ticker` | `ticker` | string (ETFs only — populated for ETFs, blank otherwise) |
| `Name` | `name` | string (security name for **all** asset types) |
| `ISIN` | — | **ignored** (not used by UI) |
| `AUM_USD` | `aum_org` | number |
| `RRR_USD` | `rrr_org` | number |
| `NNB_Month_USD` | `month_nnb` | number |
| `NNB_YTD_USD` | `ytd_nnb` | number |
| `NNBF_Month_USD` | `month_nnbf` | number (annualized fee impact, month) |
| `NNBF_YTD_USD` | `ytd_nnbf` | number (annualized fee impact, YTD) |
| `Perf_Month` | `month_performance_usd` | × 100 |
| `Perf_YTD` | `ytd_performance_usd` (fallback `month_performance_usd` if absent) | × 100 |
| `Fee_bps` | `fee` (decimal) | × 10000 |

**Ticker vs Name display rule** (consistent across Securities table, Punching-Below table, scatter tooltips, etc.):
- `Asset_Type === 'ETF'` → primary label = `Ticker`, secondary line = `Name`.
- `Asset_Type === 'Mutual Fund' | 'Money Market'` → primary label = `Name`, no ticker line.
- Securities table: replace the current `ISIN` column with a `Ticker` column; keep `Name` column. ISIN-based row keys swap to a synthesized key (`AFP|Portfolio|Date|Ticker||Name`).

`DisplacementRow` mapping: keep current shape; `AFP` from `held_by_afps` (comma-split → one row per AFP), `Fee_Advantage_bps`, `Perf_Advantage_pct` ×100, `BLK_*` from `blk_alternative_*` columns (including `blk_alternative_ticker` / `blk_alternative_name` displayed by the same Ticker-vs-Name rule).

Ignored MasterData columns (per user): `aun`, `rrr`, `patrimonio`, `precio`, `total_unidades`, `fx_rate`, `moneda`, raw `afp`, raw `portfolio`/`portfolio_type`, base-currency perf, `isin`/`identifier`.

**`src/lib/data-store.ts`** — Zustand store:
```
{ master, displacement,
  afps, portfolioTypes, categories, managers, months, // derived
  status: 'idle'|'loading'|'ready'|'error',
  error: string | null,
  load() }
```
On `load()`, fetch both URLs in parallel, normalize, derive distinct filter lists, set `status`. Hooks: `useMasterData()`, `useDisplacementData()`, `useFilterOptions()`, `useDataStatus()`.

**`src/components/shell/DataGate.tsx`** — Wraps `<Outlet />` in `__root.tsx`. Calls `load()` on mount; renders skeleton during loading, error card with retry on failure, children when ready.

### 3. Edits to `src/lib/mock-data.ts`
- Loosen `AFP`, `PortfolioType`, `Category`, `Manager` to `string` aliases (preserve type names so imports keep compiling).
- Extend `MasterRow` with the new NNB / NNBF / perf fields and make `Ticker` optional (ETF-only).
- Remove `generateMaster()` / `generateDisplacement()` module-load calls and the exported `MASTER_DATA` / `DISPLACEMENT_DATA` constants. Replace `MONTHS`, `AFPS`, `PORTFOLIO_TYPES`, `CATEGORIES`, `MANAGERS` exports with re-exports from the store (or remove and update consumers to use `useFilterOptions()`).
- Convert every selector (`getManagerAumFee`, `getCategoryFlows`, `getPenetrationHeatmap`, `getBelowWeightSecurities`, etc.) to take `(master: MasterRow[], …filters)` as first arg. Each view will pass `useMasterData()` in.

### 4. New UI toggles
- **Bucket toggle**: `All / ETF / MF / MM` everywhere it currently shows `All / ETF / MF`. Add `'Money Market'` to `Bucket` union; extend `bucketOf()`.
- **NNB scope toggle** (Month / YTD) on Flows, Securities scatter, Revenue scatter — drives whether selectors read `NNB_Month_USD` or `NNB_YTD_USD`.
- **Perf scope toggle** (Month / YTD) on Performance scatter and tables that show `YTD Perf` — drives `Perf_Month` vs `Perf_YTD`. Column header label updates accordingly.
- Punching-Below table: keep current "YTD NNB" column but source from `NNB_YTD_USD`; add adjacent "YTD NNBF" column showing annualized revenue impact.

### 5. Component updates
Every view importing `MASTER_DATA` / constants from `mock-data.ts` switches to `useMasterData()` + `useFilterOptions()`:
- `Scorecard`, `Flows`, `Securities`, `RevenueFeeAnalytics`, `AFPDeepDive`, `ProductPenetration`.
- Securities table: drop `ISIN` column, add `Ticker` column (left of `Name`); MFs/MMs show blank ticker.
- Filter popovers (`AfpFilterPopover`, etc.) read options from `useFilterOptions()`.
- `dashboard-store.ts` `date` initializer becomes `null`; populated to latest month via store subscription once `status === 'ready'`.

### 6. Loading & error UX
- Skeleton: top KPI cards greyed out; full-page spinner with text "Loading live AFP data…".
- Error: red card with message + Retry button calling `load()` again.

### 7. Out of scope
- No backend, no caching layer, no auth.
- No chart redesigns, no new screens, no routing changes.
- CSVs fetched directly from `docs.google.com` (CORS-safe). PapaParse runs in the browser.
- Base-currency performance, FX, patrimonio, precio, ISIN remain ignored.

### Open assumptions (call out if wrong)
- Live CSVs include the columns named above with those exact headers (especially `category`, `ticker`, `name`, `ytd_performance_usd`, `month_nnbf`, `ytd_nnbf`, `fee`).
- `fecha_corte` parses to a YYYY-MM month bucket (one row per security per month).
- DisplacementMapping schema unchanged from previous round.