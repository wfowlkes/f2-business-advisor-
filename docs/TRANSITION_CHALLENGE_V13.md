# F2 Learning Lab v1.3 — measured synthetic transition challenge

**Synthetic-only shadow routing. All merchant decision authority remains HOLD.**

The detector, persistence gates and seven-day blends were defined *before* replaying three unused seed groups (740001, 850002, 960003), each generating 1,080 daily observations per simulated merchant. The simulated historical reference cutoff is 2027-05-19, chosen for calendar-shift stress testing. This is **not actual future business data**.

The model uses only past observations at each decision day. There are nine known generator labels **only for grading**; routing sees neither the label nor future data. A single 28-day average is the no-switch comparator. "Detector match" is the proportion of days after day 780 when inferred scenario matches the simulator label; matching is not the same as outcome improvement or a calibrated probability. All numerical results are a synthetic testing example and may not generalize to real businesses.

## Findings and limitations

- The changing router reduced synthetic error on most investigated categories versus the fixed 28-day average, but the comparison baseline is simple and cannot establish benefit over merchant-specific static baselines.
- **Promotion fatigue:** 7-day switching made forecasts worse (14.95% vs 13.88% WAPE).
- **Supply disruption:** 30-day switching did not help (51.14% vs 50.58% WAPE). Even the 7-day result has high error despite relative improvement.
- **Volatile regime:** approximately 23.67 switches over 1,080 days per run, still too frequent for confidently applied automated routing. The 14-day cooldown plus a 28-day minimum residency reduces but does not eliminate churn.
- Scenario recognition is weak for growth (28%), decline (19%), abrupt drop (13%) and customer-behavior shift (21%) in the scoring period. Some of those generate beneficial forecasts despite a poor classifier; this does not validate the scenario labels.
- The date horizon uses **completed daily sales**; a daily data feed cannot truthfully detect an intraday change. No customer-facing notification is required for the experimental selector, but every proposed switch must remain internally inspectable.
- These are *challenge seeds from the same simulator family*, not fully independent external data. The router, including its 28-day minimum residency, was refined after observing an earlier synthetic challenge, so this report is a **development/diagnostic replay** rather than a clean prospectively untouched test of that refined control.

## Measured report

# Scenario Transition Learning Lab v1.3

**SYNTHETIC SHADOW ONLY — production HOLD**

| Simulated business | Detector match in last 300 days | Avg switches | 7d router WAPE | 7d static 28d WAPE | 7d wins (of 3) | 30d router WAPE | 30d static 28d WAPE | 30d wins |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Steady Retail | 98% | 2.67 | 3.91% | 5.39% | 3 | 2.67% | 4.92% | 3 |
| Rapid Growth | 28% | 22.67 | 3.36% | 5.93% | 3 | 1.94% | 5.69% | 3 |
| Struggling Store | 19% | 10.33 | 4.95% | 5.88% | 3 | 2.16% | 7.58% | 3 |
| Seasonal Store | 60% | 16 | 7.06% | 18.66% | 3 | 4.64% | 23.16% | 3 |
| Unpredictable Store | 40% | 23.67 | 29.97% | 35.78% | 3 | 20.91% | 26.15% | 3 |
| Sudden Demand Drop | 13% | 6.33 | 10.05% | 10.92% | 3 | 9.24% | 12.74% | 3 |
| Promotion Fatigue | 25% | 9 | 14.95% | 13.88% | 0 | 8.93% | 10.21% | 3 |
| Supply Disruption | 57% | 11.33 | 40.32% | 54.5% | 3 | 51.14% | 50.58% | 0 |
| Customer Behavior Shift | 21% | 6.67 | 4.86% | 5.81% | 3 | 3.56% | 4.45% | 3 |

**Important:** Detector match uses known simulator labels *for grading only*, never input to prediction. The static comparator uses a single 28-day average for all stores. An oracle-selected prior method is reported separately and is not available to a real detector. Missing, ambiguous and unreliable data HOLD; no model promotions.

No test on real Shopify merchants, no calibrated real-world detection probabilities.
