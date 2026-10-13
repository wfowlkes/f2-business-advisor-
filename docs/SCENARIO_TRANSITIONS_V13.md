# F2 Learning Lab — internal scenario transition framework v1.3

**Operational state: SYNTHETIC SHADOW. Production/merchant decision authority: HOLD.**

## What is a scenario change?

A *scenario* is a testable description of the observed business environment, not a business's permanent identity. A store may go from growth → supply constraint → recovery, and later show sustained decline; strategies must support both forward and reverse paths. The detection engine never sees the simulator's `type` label when it makes an inference. That ground-truth label may be used *only* after the trial to grade quality.

## Hidden internal indicator (not a hidden customer-impacting intervention)

The data-only indicator looks for (a) abrupt 7-/28-day revenue changes, (b) sustained quarter-over-quarter growth/decline, (c) an unusually strong seasonal contrast, (d) shopping-day share migration, (e) sustained stockout clusters, (f) refund-share spikes, and (g) highly variable demand. These are heuristic *signal strengths*, **not calibrated probabilities**.

When inputs are incomplete, daily dates are missing, or the evidence is ambiguous, the indicator enters HOLD. In particular, a daily aggregated feed cannot identify an intraday change. At best it responds once new verified daily data arrive. Intraday detection would require a separately verified high-frequency feed.

## Transition lifecycle

1. **OBSERVE:** one newly completed daily record advances the internal indicator. Never use future-date flags or outcomes, unverified customer records, simulation labels, or any private Shopify data in the synthetic version.
2. **CONFIRM:** require three consecutive dates with a consistent, sufficiently strong candidate regime. If conditions are ambiguous, abstain.
3. **GUARD:** check 14-day cooldown and 28-day minimum residency since the last switch, source quality, and method-specific research authorization. No rapid flip-flopping or unapproved method deployment.
4. **SHADOW SWITCH:** compute both prior and new 7/30-day forecasts, blend over seven daily updates, and keep immutable already-produced forecast cutoffs. Log both alternative and previous method.
5. **REASSESS/REVERSE:** always process changes back to stable, previously seen, or any other detected scenario using the same confirmation and cooldown rules. No irreversible scenario classification.
6. **AUDIT:** append the observed date, prior/current regime, evidence, alternative indications, detector version, method and status. Never silently rewrite an earlier frozen prediction.
7. **EVALUATE:** run chronological non-overlapping 7/30-day tests; report WAPE, signed bias, detection match, transition count and worst-case failures against a no-switch 28-day baseline. A generator-label-aware oracle strategy is an *unavailable upper-bound research reference*, never an input to the dynamic selector.

## Strategy migration governance

`methodFor` accepts only a versioned, frozen v1.2 mapping and a per-scenario/horizon research gate. The gate uses **already published** old synthetic challenges and old shifted-calendar experiments. Routes without supportive evidence fall back to the original baseline. No new numerical model weights are promoted. Method routing is currently demonstrated only in the synthetic lab.

An actual merchant application would additionally require secure and accurate verified store data, independent prospective merchant holdouts, persistence and per-tenant immutable audit records, permission/version controls, route-specific calibration and business-effect measurements. The dashboard may suppress routine change notifications, but merchant-impacting changes must remain administratively inspectable, reversable and governed by explicit authorization.

## Important limitations

- Training detector thresholds on familiar synthetic generators can overfit them; unseen seeds are **not** an external validity test.
- Synthetic conditions are not independent businesses or true causal mechanisms.
- Classifier quality cannot be assessed from a single high match count: also measure false alarms on unchanged businesses, detection lag after structural shifts, excessive switches, and revenue forecast error.
- Today's Render demo has no production Shopify stream, durable multi-tenant audit database, or real-world approval gate. **Do not enable automatic production switching** based solely on this implementation.
- All actual sales forecasts and operational recommendations remain HOLD, even when a synthetic test passes.
