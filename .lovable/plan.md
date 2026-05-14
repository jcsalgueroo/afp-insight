## Root cause

`Perf_Month` in `MasterRow` is **not** the raw decimal from the dataset — `src/lib/data-loader.ts` line 77 multiplies the source column by 100 on ingest:

```ts
const perfMonth = num(r.month_performance_usd) * 100;
```

So by the time `getCumulativePerformanceSeries` reads `r.Perf_Month`, a 17.56% return is stored as `17.56`, not `0.1756`. Doing `value × (1 + 17.56)` then explodes the cumulative line — matching the symptom you described. Last turn we "fixed" the math the wrong way based on the assumption that `Perf_Month` was still decimal in memory.

The other screens (Scorecard, AFP Deep Dive, etc.) already depend on `Perf_Month` being in percent units (they format it as `xx.xx%` directly). Changing the loader would break them. The right fix is local to the cumulative calculation.

## Changes

### 1. `src/lib/mock-data.ts` — `getCumulativePerformanceSeries`

- Restore percent-aware compounding: `values[s] = values[s] * (1 + wp / 100)`. The weighted average still uses `AUM_USD` per AFP (per-AFP scope, which matches your confirmation). System line uses all rows that month.
- Remove the `portfolioTypes` parameter and the `ptSet` filter — no longer needed. Always compute across all portfolio types.
- Keep baseline = 100 at `2025-12`.

### 2. `src/components/views/PerformanceAnalytics.tsx` — Cumulative card

- Remove the `portfolios` state and the `<MultiSelectPopover>` from the card's `right` slot.
- Remove the `PORTFOLIO_TYPES` and `PortfolioType` imports if unused after this edit.
- Update the `getCumulativePerformanceSeries(date)` call signature.

### 3. No other charts touched

The three scatter charts and tooltips stay exactly as they are — this is only about the cumulative line and removing one filter.

## Verification

After the edit, the Dec 2025 anchor stays at 100 and the Jan→Nov 2026 values should land in the ~85–115 range you described, with each AFP's path differing based on its own AUM-weighted monthly returns. I'll spot-check the rendered chart in the preview.

## Open question (low risk)

There is no portfolio filter anymore, so the chart always reflects the full multi-portfolio book per AFP. Confirming that's what you want — i.e. one line per AFP aggregated across Type A/B/C/D/E together, not five lines × five portfolios. If you'd rather see per-portfolio breakdowns later, that's a different chart and we can add it as a separate card.
