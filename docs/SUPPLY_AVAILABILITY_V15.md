# F2 Learning Lab v1.5 — Supply availability, unknown future inventory, and decision HOLD

**SYNTHETIC RESEARCH ONLY — 2026-10-13. No Shopify sales, customer records, inbound purchase orders, production model promotion, or investment/operational recommendations are involved.**

## Root-cause finding

A 30-day **realized-sales** forecast cannot be identified solely from recent sales when future inventory availability is unknown. A recent 30-day window with constrained supply can be followed by a fully replenished month, or vice versa. A point estimator mislabels that supply change as a demand change and can yield extremely high WAPE.

The existing 47.93% figure was the v1.4 *dynamic hybrid router* for three prior synthetic seeds; the isolated frozen v1.4 supply bridge on the new predeclared cohorts averages 39.84% WAPE. These are different comparison targets and **must not be conflated**.

## Proposed solution (shadow only)

1. **Demand proxy:** construct an in-stock same-weekday *full-availability revenue scenario*. This is not directly observed lost demand and must not be labeled independently validated demand.
2. **Supply risk:** measure prior true/false stockout flags and estimate conditional stockout probability using a smoothed two-state Markov process. Permit a *recurrence hypothesis* only when a prior event lag has repeated agreement with lift and precision safeguards. If no recurrence qualifies, use the Markov fallback.
3. **Realized sales:** blend conditional stocked and constrained realized-sales proxies with forecasted availability risk to get an **experimental** next-30-day estimate.
4. **Risk bounds:** also output hypothetical "fully stocked" and "fully constrained" trajectories. These are broad *scenario extremes*, **not calibrated probability or confidence intervals**.
5. **Skill gate:** compare historical completed non-overlapping 30-day scores with frozen v1.4 supply bridge at earlier cutoffs. Require at least 3 valid folds, 10% improvement, >=60% win share, <=20% signed bias, and no dramatic deterioration on latest test. Only a synthetically qualified shadow path may use the proposed point forecast; otherwise the old method remains the research comparator. The production authority remains HOLD even if this gate passes.
6. **Supply plan contract:** accept *optional*, explicitly identified future availability assumptions known by the forecast cutoff (`date`, `knownAt`, `source: MERCHANT_DECLARED_PLAN`, `stockoutProbability`), reject malformed/future-leaking/duplicate data. These are **assumptions**, never verified stockouts or actual future sales. The deployed private Shopify bridge does not ingest this plan.

## Comparison (new seeds pre-registered separately from algorithm development)

Methods and thresholds were frozen before testing the three new recurring-supply challenge seeds (591733/618407/729109), four independent synthetic generator mechanisms with seeds 1301/2309/3307, and two shifted-calendar tests. Complete seed-by-seed results, including failures, are in [`lab/availability-results.md`](../lab/availability-results.md), generated with `node lab/availability_report.js`.

| Synthetic cohort | Cases | Frozen v1.4 supply bridge mean WAPE | Pure availability candidate mean WAPE | Historical skill-gated mean WAPE | Pure candidate wins |
|---|---:|---:|---:|---:|---:|
| New recurring-supply challenge | 3 | 39.84% | 29.60% | 39.53% | 3 / 3 |
| Four independently designed supply generators | 12 | 20.09% | 18.09% | 19.44% | 9 / 12 |
| Shifted synthetic calendar | 2 | 36.88% | 28.23% | 36.91% | 2 / 2 |

**Tradeoff:** The unrestricted experimental estimator has larger gains in recurring synthetic data but worsens some new stochastic supply regimes. The conservative historical skill gate prevents some mistakes but also forfeits much of the improvement. This is not a solved general forecast problem, nor approval to use model-switching in production. The independent generators are *different synthetic rules*, not real businesses. These averages are unweighted across cases, not pooled WAPE across merchants.

## Verification and governance

- Chronological cutoffs; only data known on or before each cutoff can affect the forecast.
- Demand/outage scenario separation; **no** future oracle stockout flags or generator regime labels used by the forecasting model.
- Missing dates/availability flags cause HOLD; no silent zero-fill or fallback to false stockout.
- Unreconciled financial metrics, unknown future replenishment, and absent calibrated intervals remain HOLD.
- Frozen v1.4 transition and hybrid algorithms are **unchanged**. New calculations operate separately in the synthetic lab.
- Future deployment requires authorized daily stock availability/aggregates, SKU inventory and inbound confirmed quantities/dates, lead-time variance, cancellations/backorders, promotion and forecast evaluation, privacy security review, calibrated probabilistic outcome intervals, and chronological multi-store real-data trials.

## Operational response

When inventory arrival data are missing, **do not authorize an unqualified 30-day revenue projection for a disrupted business**. Keep the regular customer interface consistent but attach an internal signal: `SUPPLY-UNCERTAINTY`, `FORECAST-HOLD`, and bounded conditional what-if outcomes. Do not hide material uncertainty from a merchant when advice would otherwise be consequential. When authorized inbound plans become available, measure their reliability prospectively and retry the conditional forecast under documented assumptions.
