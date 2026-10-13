# F2 Learning Lab v1.4 — causal strategy bridges and anti-churn controls

**Research status: SYNTHETIC SHADOW ONLY. Production authority: HOLD.**

## Problem

The frozen v1.3 detector made excessive regime switches, particularly for volatile merchants, and its routing worsened short-horizon promotional demand and long-horizon supply-constrained demand. The earlier detector and its learned method permission rules are preserved verbatim for matched comparisons. No real Shopify orders were queried.

## New algorithms

### Promotion fatigue: refund-conditioned, pulse-resistant revenue forecast

Use only completed historical daily net sales, refund amounts, and (when present) refund-spike indicators. Recognize sustained elevated refund burden, with uncertainty HOLD when competing sharp sales-decline signals have similar strength. For the next 7 days, use a **conservative blend** of the old forecaster and a robust per-weekday estimate with campaign-spike suppression. No future promotions or refund events are assumed. During a confirmed promotion regime, mix **75%** of the new research bridge with **25%** of the frozen v1.3 routed forecast. For 30 days, retain **100% of v1.3** after development tests showed that the new approach increased error.

### Supply disruption: exposure-aware expected sales

A falling observed sales amount is not assumed to mean weakening customer demand when in-stock exposure is constrained. From the previous 84/56 days, estimate observed stockout frequency and a capped sales-severity ratio, then forecast the *expected realized revenue* under uncertain future supply exposure. The proposal mixes 65% exposure-aware expected revenue with 35% a 28-day static baseline. In the 30-day research output, mix **70%** of that bridge with **30%** the frozen v1.3 routed forecast. Retain **100% of v1.3 at 7 days**, because the supply bridge was inferior in development at that horizon.

These are historical expectation models, **not** predictions of the dates of future supply outages or promo events. Unknown inventory status and missing records cannot be replaced with fake values.

### Excessive switching: hysteresis and regime residency

Require 6 consecutive complete daily observations for a new regime, or 21 for a return to stable. Use competing-signal margin ≥0.13 as a threshold for unambiguous evidence, a 70-day minimum between switches, no more than 2 state transitions within 90 days, and a 10-day bridge for the specialist model. These thresholds were chosen during development, not tuned to the independent challenge. Retain a dated internal event ledger with alternative signals; no customer-visible notice is needed for each *synthetic* switch, though consequential changes to real forecasts would require separate disclosures and operational approval.

## Pre-registered evaluation and limitations

- Development seeds: 242424, 353535 (nine synthetic generator types, 7/30-day cutoffs). The freeze includes threshold values, routing weights and the per-horizon bridge eligibility described above.
- Independent challenge seeds: 731111, 842222, 953333. Replay identical simulated histories through frozen v1.3 and v1.4; calculate horizon-level WAPE on later completed outcomes. Every forecast made with data available at its own cutoff.
- Independent *calendar shift* probe: seed 365365, synthetic as-of 2027-07-17. Uses the same fixed methods and thresholds.
- Generator type is known only in the *scoring loop*, never passed into v1.4 detection/routing. The simulations use a common deterministic family, so these are not independent merchants and do not prove generalization.
- All outcomes for business decisions remain HOLD. The live Shopify endpoint is not changed. No auto-retraining or real-store forecasting is authorized by these tests.
- Material failure cases are not hidden: v1.4 changes nothing outside two gated specialist/horizon routes, so many scenarios have exactly the same error as v1.3. The supply 30-day forecast remains high-error even after improvement. A fixed 28-day average can outperform the specialist under some synthetic conditions; future selection needs stronger prospective evidence.

## Production safety gate

Before any real merchant use: verify read-only authenticated ingestion and financial reconciliation; establish confirmed real inventory availability and refund definitions; assess drift and missing-record data quality; perform leakage-free, chronological multi-merchant evaluation with a real-outcome static baseline and Shopify analytics comparison; calibrate interval coverage; measure business decision harm; add durable auditable storage and safe rollback. On any uncertainty keep previous approved model and surface consequential limitations. Internal strategy choices may be hidden from routine dashboard display, but material risk, degradation or changes in published forecasts must not be concealed.
