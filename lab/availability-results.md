# F2 Learning Lab v1.5 — Supply availability research

**SYNTHETIC ONLY. Production authority HOLD. No real Shopify store or merchant inventory data.**

## What the high 30-day supply error means

Realized revenue is constrained by inventory availability. Without known future replenishment commitments, stockout timing is partially unknowable. Rather than pretending it is known, this research separates conditional demand (if in stock) from estimated realized sales and holds decisions when future availability is uncertain.

| Cohort | Mode | Seed | Frozen v1.4 WAPE | New availability WAPE | Skill-gated WAPE | Switched folds | High-uncertainty folds |
|---|---|---:|---:|---:|---:|---:|---:|
| development | recurring-supply | 194807 | 40.34% | 30.3% | 40.12% | 4/10 | 10/10 |
| development | recurring-supply | 286431 | 39.36% | 29.62% | 39.15% | 4/10 | 10/10 |
| untouched_same_generator | recurring-supply | 591733 | 39.77% | 29.7% | 39.4% | 4/10 | 10/10 |
| untouched_same_generator | recurring-supply | 618407 | 40.08% | 29.7% | 39.7% | 4/10 | 10/10 |
| untouched_same_generator | recurring-supply | 729109 | 39.67% | 29.41% | 39.49% | 4/10 | 10/10 |
| independent_generator | markov | 1301 | 23.09% | 19.49% | 22.59% | 5/10 | 10/10 |
| independent_generator | markov | 2309 | 27.31% | 30.01% | 28.89% | 2/10 | 10/10 |
| independent_generator | markov | 3307 | 12.05% | 9.24% | 8.23% | 8/10 | 10/10 |
| independent_generator | supplier | 1301 | 17.35% | 12.85% | 14.88% | 2/10 | 10/10 |
| independent_generator | supplier | 2309 | 31.05% | 28.39% | 34.4% | 3/10 | 10/10 |
| independent_generator | supplier | 3307 | 26.99% | 29.76% | 27.95% | 2/10 | 10/10 |
| independent_generator | seasonal | 1301 | 17.74% | 18.98% | 18.13% | 1/10 | 10/10 |
| independent_generator | seasonal | 2309 | 30.42% | 24.04% | 28.12% | 6/10 | 10/10 |
| independent_generator | seasonal | 3307 | 26.64% | 21.33% | 23.42% | 4/10 | 10/10 |
| independent_generator | intermittent | 1301 | 6.97% | 4.49% | 4.93% | 9/10 | 10/10 |
| independent_generator | intermittent | 2309 | 12.2% | 9.76% | 12.18% | 4/10 | 10/10 |
| independent_generator | intermittent | 3307 | 9.3% | 8.68% | 9.61% | 2/10 | 10/10 |
| shifted_calendar | recurring-supply | 591733 | 36.77% | 28.21% | 36.81% | 4/10 | 10/10 |
| shifted_calendar | recurring-supply | 618407 | 36.99% | 28.24% | 37.01% | 4/10 | 10/10 |

## Interpretation
- Favor lower WAPE only if observed on previously unused data without future information leakage.
- If an alternate supply process defeats the candidate, preserve the frozen bridge and widen conditional uncertainty; report all losses.
- Without a supplier shipment calendar, inventory-in-transit, fulfillment restrictions, SKU-level stock position, and observed replenishment lead times, no mathematical method can guarantee a low-error 30-day realized-sales forecast.
- Recurrence detection is explicitly gated by completed observations and prior state agreement; it is not allowed to read future stockouts.
- No production method changes, inventory actions, promises of interval coverage, or real-world Shopify advantage are authorized.

## Recommended next data contract
- Store-date daily sales, stockouts, refunds (aggregate-only), current stock available, inventory commitments and expected inbound quantities/dates, lead-time reliability, and promotion schedule.
- An inbound plan is a **forecast/commitment** and must be labeled as such, never substituted for actual future inventory or presented as verified outcomes.
- With no confirmed future availability, surface full-stock / all-constrained conditional scenarios and keep downstream inventory/revenue decisions on HOLD.
- Continue independent chronological testing and calibrated interval checks once operational data is authorized.
