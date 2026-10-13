# Learning Lab v1.4 — Adversarial bridge evaluation

**SYNTHETIC-ONLY. Production decisions HOLD.**

Frozen v1.3 dynamic router is the primary comparator. New v1.4 research uses a causal promotion/refund bridge for 7d and observed stockout exposure bridge for 30d. All other horizons are identical to the frozen v1.3 forecast.

| Condition | V1.3 switches | V1.4 switches | 7d v1.3 WAPE | 7d v1.4 WAPE | 30d v1.3 WAPE | 30d v1.4 WAPE |
|---|---:|---:|---:|---:|---:|---:|
| Steady Retail | 2 | 0 | 3.6% | 3.6% | 1.74% | 1.74% |
| Rapid Growth | 19.67 | 4.67 | 2.98% | 2.98% | 2.14% | 2.14% |
| Struggling Store | 8.33 | 2 | 5.21% | 5.21% | 2.22% | 2.22% |
| Seasonal Store | 15.33 | 9 | 6.65% | 6.65% | 5.06% | 5.06% |
| Unpredictable Store | 24 | 8.33 | 30.83% | 30.83% | 20.01% | 20.01% |
| Sudden Demand Drop | 3.67 | 2 | 9.24% | 9.24% | 9.05% | 9.05% |
| Promotion Fatigue | 4.67 | 1 | 16.74% | 14.8% | 10.81% | 10.81% |
| Supply Disruption | 8.67 | 1.33 | 39.99% | 39.99% | 52.26% | 47.93% |
| Customer Behavior Shift | 3.67 | 2 | 4% | 4% | 4.13% | 4.13% |

## Shifted-calendar challenge

- Unpredictable Store: 7d 31.93% → 31.93%; 30d 15.49% → 15.49%.
- Promotion Fatigue: 7d 15.53% → 13.28%; 30d 10.16% → 10.16%.
- Supply Disruption: 7d 39.19% → 39.19%; 30d 46.9% → 42.96%.

## Research controls
- Selection: retrospective development seeds 242424/353535; untouched challenge seeds 731111/842222/953333; shifted calendar 365365.
- The previously frozen v1.3 router is never rewritten. A per-horizon gated overlay uses only inferred regime signals and dates, not hidden simulator scenario IDs.
- All output is simulated, always HOLD; no live merchant data or financial decisions are accessed or modified.
- Switching counts are indicator state transitions, not proof of better consumer outcomes.
- A zero change in WAPE is by design: that regime/horizon reuses the prior router.
- The repeated test generator family does NOT establish performance on real sales data.
- Browser-loaded files and downloads are not an immutable audit store.
