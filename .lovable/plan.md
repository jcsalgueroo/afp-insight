## AFP Deep Dive — Tooltip & Treemap polish

### 1. Treemap leaves: show weight % in bottom-right
In `FlatNode` (the custom Treemap content):
- Receive the leaf's `size` and the total of all leaves to compute `weight = size / total`. Pass `total` via a closure (compute once from `treeData`) or via the node's `root` prop that Recharts injects.
- Render a second `<text>` anchored bottom-right of the rect (`x + width - 6`, `y + height - 6`, `textAnchor="end"`) with the formatted percentage (e.g. `12.4%`).
- Only render the percentage when the leaf is large enough to fit it — gate on `width > 40 && height > 28` (separate from the existing name-label gate). Very small leaves stay clean.
- Keep the existing name label rule (`width > 60 && height > 24`) unchanged.

### 2. Treemap hover card: per-leaf, not card-wide
Today the donut overlay uses `group-hover` on the whole card and always shows the same Top-5-of-opposite-dimension donut. Change to a hover-driven, leaf-specific panel:
- Track `hoveredLeaf` state in `AFPDeepDive` (the leaf's `name` + `key`). Set it from `onMouseEnter` / `onMouseLeave` handlers added to the `<rect>` inside `FlatNode` (pass setter via context or props).
- Hide the panel when `hoveredLeaf == null` (replace the `group-hover:opacity-100` mechanism).
- Compute a leaf-scoped donut:
  - **By Manager mode** → hovered leaf is a manager. Donut shows that manager's Top-5 categories + Others (weights within that manager's AUM in the current bucket / AFP scope).
  - **By Category mode** → hovered leaf is a category. Donut shows that category's Top-5 managers + Others.
- Add a new selector `getAfpCompositionLeafDonut(afps, bucket, dimension, leafName, date)` in `mock-data.ts` that returns `{ items: {name,value,fill}[], title: string }`. Reuse the existing aggregation pipeline; just filter to the hovered manager or category before grouping the opposite dimension.
- Panel header changes to `"<Leaf name> — Top 5 <opposite> + Others"`.

### 3. Donut + legend fit inside the card
Current panel is `w-56 h-56` with the donut taking ~80% and the legend grid at the bottom — the legend overflows when there are 6 rows of long names. Restructure the panel so donut and legend both fit:
- Widen and reshape the panel to a horizontal layout: `w-72` (or `w-80`) and `h-auto` with `max-h` cap, so it scales to the legend rather than clipping.
- Inside: small header row, then a flex row → left: donut `w-28 h-28` (fixed), right: legend as a vertical list (`flex-col`, single column) with `truncate` on the name and `tabular-nums` on the percent. This ensures every legend row is fully visible.
- Keep total label centered inside the donut; reduce font sizes accordingly.
- Ensure the panel still uses `pointer-events-none` and stays positioned `absolute top-3 right-3`, but switch to `max-w-[calc(100%-1.5rem)]` to never exceed the chart area.

### 4. NNB tooltip — sort by signed value, not absolute
In `NnbTooltip` (`AFPDeepDive.tsx` ~line 670):
- Replace `.sort((a, b) => Math.abs(b.value) - Math.abs(a.value))` with a signed sort that lists all positive flows first (largest positive on top, descending) followed by all negative flows (largest in magnitude first, i.e. most negative last or first within the negatives — see below).
- Concrete order: `positives desc by value, then negatives desc by value` (so the breakdown reads `+$120M, +$40M, +$5M, −$8M, −$60M`). This puts positives first, sorted largest-to-smallest, then negatives sorted from least-negative to most-negative.
- Implementation: split into `pos = items.filter(v>0).sort((a,b)=>b.value-a.value)` and `neg = items.filter(v<0).sort((a,b)=>b.value-a.value)`, then concat.
- Net total header and color logic stay as-is.

### Technical notes
- All UI changes confined to `src/components/views/AFPDeepDive.tsx`.
- One additive selector in `src/lib/mock-data.ts`: `getAfpCompositionLeafDonut(...)`.
- For passing `hoveredLeaf` setter into `FlatNode`, simplest is a tiny module-scope React context (`TreemapHoverContext`) created in this file and consumed by `FlatNode`; avoids prop-drilling through Recharts' `content` prop.
- No design tokens / layout system changes.

### Out of scope
- All other charts and views.
- Data model / mock dataset changes.
