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


## Additional untouched synthetic-seed challenge

After recording the default-seed results above, I ran the **same frozen generator and forecasting methods** on two other seed groups (7727 and 23565), three stores per scenario per group. No new weights, thresholds, algorithms or scenario definitions were selected in response to these outcomes.

| Simulated business | 30d improvement (seed 7727) | 30d improvement (seed 23565) | Signal |
|---|---:|---:|---|
| Steady retail | +46.57% | +21.42% | Positive within this generator |
| Rapid growth | +58.47% | +63.40% | Positive within this generator |
| Struggling store | +58.21% | +63.05% | Positive within this generator |
| Seasonal store | +75.84% | +79.71% | Strong but potentially simulator-specific |
| Unpredictable store | **−94.98%** | **−98.29%** | Repeat substantial failure |

For 7-day forecasts, challenge-set outcomes were less stable: steady retail improvement was **−1.77%** and **−0.96%**, growth was **+13.78%** and **−8.63%**, decline was **+15.07%** and **−16.37%**, and volatile retail was **−0.67%** and **+5.06%**. This prevents any defensible general claim that the challenger is superior at a 7-day horizon.

**Next Learning Lab control adjustment (proposed, not a deployed predictive weight):** enforce scenario-specific gates and negative-result reporting. Candidate approval should be blocked in volatile regimes until a prospectively frozen alternative passes further challenge sets. Even positive repeated synthetic results do not justify a real business promotion.
