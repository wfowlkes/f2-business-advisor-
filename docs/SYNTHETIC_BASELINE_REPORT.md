# Learning Lab — Synthetic Baseline Evaluation v1.0

**Measured locally** on 2026-10-13 using `F2 Synthetic Lab 1.0`, reproducible seed `101` (and increments `+7919`, `+15838`), 1080 days per simulated store, 5 business types, 3 runs each, reference as-of date 2026-10-12. **This is NOT a real-store performance result.**

- Model families: champion chosen from 7-day mean, 28-day mean, same-weekday mean; challenger chosen from capped short-trend and scaled 364-day (same weekday) analogue.
- Chronological splits: 480 initial training days, 300 validation days for selection, 300 holdout days reserved for final grading.
- Metrics below are the **means across three independent synthetic runs**. WAPE refers to the errors of horizon-level sales totals, not daily point WAPE. Improvement means the *mean of each run's percentage reduction in WAPE*; negative means worse.

| Synthetic business | 7d champion WAPE | 7d challenger WAPE | 7d improvement | 30d champion WAPE | 30d challenger WAPE | 30d improvement |
|---|---:|---:|---:|---:|---:|---:|
| Steady retail | 4.76% | 3.90% | +17.83% | 4.21% | 2.13% | +47.94% |
| Rapid growth | 4.14% | 3.83% | +6.75% | 4.59% | 3.44% | +22.83% |
| Struggling store | 4.75% | 4.40% | +2.29% | 7.12% | 2.43% | +66.06% |
| Seasonal store | 8.51% | 3.87% | +54.57% | 14.20% | 3.05% | +78.43% |
| Unpredictable store | 32.09% | 31.22% | +2.57% | 18.20% | 30.63% | **−68.32%** |

## Learning Lab results

**What worked in the simulated test:** 30-day challenger performance was stronger in the steady, growth, struggling, and seasonal scenarios; annual analogue can exploit deliberately injected holiday signals. This does **not** establish superiority on actual commerce businesses.

**What did not work:** The 30-day challenger on the volatile scenario **increased** mean WAPE from 18.20% to 30.63%. This is a material failure. No general model promotion is appropriate; controls must preserve HOLD and keep the champion in such conditions. The 7-day challenger yielded marginal gains on growth, declining and volatile stores, frequently not meeting a 10% threshold.

**Adversarial alternatives:** Synthetic holiday seasonality can exaggerate analogue success; a seeded seasonal generator may align too conveniently with an algorithm designed to exploit repetition. Promotions, unmodeled competitors, inventory shortages, returns and changing customer behavior might invalidate the pattern in actual stores. Selection uncertainty across synthetic seeds matters.

**Next prospective test:** Hold candidate weights and algorithms fixed, evaluate **previously unused seeds** (e.g. 7727, 15646, 23565) and different synthetic regimes, then compare with realistic permitted historical business data and Shopify baselines only when available. Do not select new weights after seeing those prospective outcomes. Track confidence interval calibration and decision costs before considering real-world authorization.

**Control decision:** No model promoted. Production accuracy and incremental business improvement **UNVALIDATED / HOLD**. These results were produced by the local test code, not asserted as completed on real Shopify orders.
