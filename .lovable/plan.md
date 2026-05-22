## Goal

Make the dashboard work on networks that block `docs.google.com` by embedding the latest data as a JSON snapshot bundled with the app. Keep a "Refresh from source" option for when live fetching is available (e.g. from home). Show a small "Data as of" indicator in the top nav.

## Approach (Option A — bundled JSON snapshot)

1. **Add a snapshot file** at `src/data/snapshot.json` containing the normalized `MasterRow[]` and `DisplacementRow[]` (the same shape `data-loader.ts` already produces), plus a `generatedAt` ISO date string.
2. **Default load = snapshot** (synchronous, no network). The dashboard opens instantly with no dependency on Google Sheets.
3. **Keep live fetch as an opt-in** via a small "Refresh from source" button in the top nav. From a work network this will fail silently (toast); from home it works and replaces the in-memory data for the session.
4. **"Data as of" badge** in the top nav (next to the "As of <month>" picker) showing the snapshot's `generatedAt` date.
5. **Monthly refresh workflow**: when you ask me to "refresh the data", I'll pull both CSVs, regenerate `snapshot.json`, and that's it — you sanity-check at the database level.

## Files changed

- **New** `src/data/snapshot.json` — pre-normalized rows + `generatedAt`. Minified (no pretty-print) to stay gzip-friendly.
- **New** `scripts/refresh-snapshot.ts` — one-shot Node script I run on refresh: fetches both CSVs, runs the same normalization logic, writes `snapshot.json`.
- **Edit** `src/lib/data-loader.ts`:
  - Import `snapshot.json` and call `setLiveData(...)` immediately at module load (status flips to `ready` synchronously).
  - Expose `snapshotDate` from the store.
  - Keep `load()` as an explicit "refresh from Google" action (still uses the existing fetch + normalize path).
- **Edit** `src/components/shell/DataGate.tsx` — since snapshot is ready synchronously, the loading spinner won't appear on first paint. Keep the error/retry UI for the manual refresh case.
- **Edit** `src/components/shell/TopNav.tsx` — add a small "Data as of <date>" badge and a "Refresh" icon button that calls `load()` and shows a toast on success/failure.
- **Refactor** the normalization helpers (`normalizeMaster`, `normalizeDisplacement`, etc.) out of `data-loader.ts` into `src/lib/data-normalize.ts` so both the runtime fetch and the build-time `scripts/refresh-snapshot.ts` share one source of truth.

## Refresh workflow (when you ask me to refresh)

1. I run `scripts/refresh-snapshot.ts` — fetches both Google CSVs, normalizes, writes `src/data/snapshot.json` with a fresh `generatedAt`.
2. You publish. The new snapshot ships with the build; the "Data as of" badge updates.

## Notes

- Snapshot is plain JSON imported as an ES module — Vite tree-shakes/minifies it into the JS bundle. Expected size: a few hundred KB gzipped; well within acceptable bundle budgets for an internal tool.
- No change to any chart, selector, or business logic — the in-memory data shape is identical.
- The live `load()` path is preserved, so nothing breaks from home / unrestricted networks.
