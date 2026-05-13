## AFP Deep Dive — Restructure

### 1. Portfolio Composition (treemap)
- Replace nested Manager→Category treemap with a single-level treemap.
- Add new toggle `By Manager | By Category` next to the existing ETF/MF/MM toggle.
- Leaves:
  - **By Manager** mode: one rectangle per manager (Top 5 + Others), sized by AUM in scope.
  - **By Category** mode: one rectangle per category, sized by AUM in scope.
- Coloring: managers use `managerColor`; categories use `categoryColor`. Drop the "muted red dominant" logic.
- Hover: when the user hovers the chart card, show a small donut overlay (top-right of the chart area) containing the **opposite** dimension's Top 5 + Others, filtered by the current ETF/MF/MM toggle:
  - In **By Manager** mode → donut of Top 5 Categories + Others.
  - In **By Category** mode → donut of Top 5 Managers + Others.
- Add data selector `getAfpCompositionFlat(afps, bucket, dimension, date)` and `getAfpCompositionDonut(afps, bucket, dimension, date)` in `mock-data.ts`.

### 2. NNB by Manager — diverging stacked bar
- Switch the chart from a single-sided stacked bar to a **diverging horizontal stacked bar**:
  - Each manager row has a positive stack (right of zero) for categories with NNB > 0 and a negative stack (left of zero) for categories with NNB < 0.
  - Implementation: split each category series into `{Cat}__pos` and `{Cat}__neg` keyed Bars on stackIds `pos` / `neg`; legend shows one entry per category (color = `categoryColor`).
  - X-axis centered on 0; reference line at 0.
- Custom Tooltip on bar hover:
  - Header: manager name + **net NNB** (signed, formatted USD) for the current period (Month/YTD).
  - Body: category breakdown rows sorted by `|value|` desc, each row showing color swatch, category, signed USD; positive in default color, negative in `text-negative`.
- Reuse existing selector output but compute net + sorted breakdown in the tooltip component.

### 3. Displacement Opportunities — grouped & collapsible
- Group rows hierarchically: **Asset Class → Category → rows**.
- Asset Class derived per opportunity by mapping `Category` to `Asset_Class` via the existing `categoryAssetClass` map (Equity / Fixed Income / Money Market / Other).
- Rendering:
  - Asset Class header row (with row count + total competitor AUM); click to expand/collapse.
  - When expanded, show Category sub-headers (with row count + total AUM); click to expand/collapse.
  - All groups **collapsed by default**.
  - Independent expansion (multiple groups can be open at once); state held in two `Set<string>` in component state.
- Match filter remains in header.

### 4. Positions table — Asset Class toggle + grouped collapse
- Add `Equity | Fixed Income | Money Market | All` toggle in the header (alongside existing Bucket, Portfolio, Search).
- Filter `positions` by selected asset class (mapping via `categoryAssetClass`).
- Replace flat per-category rows with a collapsible grouping:
  - Default view: **only category header rows visible** (category name, total AUM, count, % of portfolio).
  - Click a category header to expand and reveal the product rows beneath it.
  - Independent expansion; state in `Set<Category>`.
- Search behavior: when a search term is active, auto-expand any category that has matches.

### Technical notes
- All changes confined to `src/components/views/AFPDeepDive.tsx` and additive selectors/types in `src/lib/mock-data.ts`.
- New helpers in `mock-data.ts`:
  - `getAfpCompositionFlat(afps, bucket, dimension, date)` → `{ key, name, size, fill }[]`
  - `getAfpCompositionDonut(afps, bucket, dimension, date)` → top-5 + Others list of opposite dimension
  - `categoryAssetClass(category)` helper if not already exported
- Diverging bar: pre-split each category into `pos`/`neg` keys at the selector level so Recharts stack ids work cleanly; legend filters duplicates.
- Hover donut on the composition card: small absolute-positioned panel (e.g. `w-48 h-48`) revealed via card `group-hover` Tailwind state, rendered with a `PieChart`.
- No design token or layout-system changes.

### Out of scope
- Other views (Scorecard, Flows, etc.) untouched.
- No data model changes beyond reading existing `Asset_Class` / category mapping.
