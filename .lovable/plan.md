# Password Gate + Mobile Responsiveness

## 1. Password gate

- New file `src/components/shell/PasswordGate.tsx`:
  - Checks `sessionStorage.getItem("afp-unlocked") === "1"` on mount.
  - If not unlocked, renders a centered full-screen card with the AFP logo/title, a single password input, "Unlock" button, and an inline error on wrong password.
  - On correct password (`BismarckInColombia!`), sets the sessionStorage flag and renders children. Re-prompts on every new tab/window.
- Wrap the app in `src/routes/__root.tsx` so the gate sits outside `TopNav`/`Sidebar`/`DataGate` (no chrome visible until unlocked, and no live data fetched).
- Hardcoded client-side per your choice — note this is soft gating only (password is visible in the JS bundle).

## 2. Responsive shell (TopNav + Sidebar)

- Replace the fixed `w-56` sidebar with a responsive pattern:
  - **≥ md (768px+)**: current persistent sidebar, unchanged.
  - **< md**: sidebar hidden; a hamburger button in `TopNav` opens it as a slide-in drawer using the existing `Sheet` component. Tapping a nav item closes the drawer.
- `TopNav` adjustments for narrow widths:
  - Show hamburger on the left (mobile only).
  - Shorten the brand label to "AFP" under ~480px; keep full label on larger screens.
  - "As of" label hidden on mobile (keep the month value + chevron).
  - "BlackRock Only" label shortened to "BLK Only" on mobile; switch stays.
  - Reduce horizontal padding (`px-3 sm:px-6`) and gap (`gap-3 sm:gap-6`).

## 3. Responsive content

- **Page padding**: every view container switches from fixed padding to `p-3 sm:p-6` and removes any `min-w` that forces horizontal page scroll.
- **KPI / chart grids** in `Scorecard`, `AFPDeepDive`, `Flows`, `RevenueFeeAnalytics`, `ProductPenetration`: change `grid-cols-2`/`grid-cols-3`/`grid-cols-4` to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-{n}` so cards stack on phones.
- **Filter rows** (AFP filter, segmented toggles, multi-selects): wrap with `flex flex-wrap gap-2` so controls reflow instead of overflowing.
- **Tables** (Securities, Punching-Below, AFP breakdowns): wrap each `<Table>` in `<div className="w-full overflow-x-auto">` and add `min-w-[640px]` on the inner table so columns keep their width but the page itself doesn't horizontally scroll.
- **Charts**: ensure each Recharts wrapper uses `ResponsiveContainer` with `width="100%"` and a fixed height — verify and fix any chart still using fixed pixel widths.
- **Segmented toggles / popover triggers**: allow `text-xs` and `whitespace-nowrap` so labels like "Money Market" don't break layout.

## 4. Out of scope

- No backend, no auth provider, no route changes, no chart redesigns, no data-layer changes.
- Desktop layout stays visually identical at ≥ md.

## Technical notes

- Sidebar drawer: reuse `src/components/shell/Sidebar.tsx` content inside a `Sheet` rendered from `TopNav`; expose an `onNavigate` callback so menu clicks close the sheet.
- `PasswordGate` short-circuits before `DataGate`, so CSV fetches don't run for locked visitors.
- Mobile breakpoint: Tailwind `md` (768px). The `sm` breakpoint (640px) is used for two-column KPI grids on large phones / small tablets.
