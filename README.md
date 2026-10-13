
### Synthetic Lab v1.1 — adversarial challenge expansion

- Nine total synthetic business regimes, including four new demand/operational shifts.
- Research-only 70/30 recency-weighted weekday shadow challenger, scored separately so frozen v1 comparisons are preserved.
- Chronologically isolated training, validation and holdout; three preregistered seed groups used to document failures and successes without changing predictive weights.
- [Read the full fixed-method stress challenge](docs/SYNTHETIC_V11_CHALLENGE_REPORT.md). **No merchant forecasts are approved; all decisions HOLD.**

## Scenario-specific forecasting research v1.2

Explore [the preselected method versus challenge matrix](lab/strategies.html), including 9 store regimes × 7/30-day horizons × 12 forecasting methods. Pre-registered development validation seeds select one method per synthetic type and horizon. Three different synthetic challenge seed groups independently grade those methods without test-time model changes. [Read the complete findings](docs/SCENARIO_METHODS_V12.md). All merchant decisions remain **HOLD**.

The [second calendar-shift challenge](docs/SCENARIO_RESULTS_V12.md) preserves adverse results and flags promotion cycle phase uncertainty. Frozen method choices remain research only.

## Adaptive scenario transitions — Learning Lab v1.3

The [synthetic scenario transition inspector](lab/transitions.html) detects daily regime indicators from **past data only**, requires three complete daily confirmations, observes a 14-day cooldown plus 28-day minimum residency, and blends 7/30-day research forecasts for seven updates. It records reversible changes and keeps the existing customer interface unchanged. See the [transition protocol](docs/SCENARIO_TRANSITIONS_V13.md) and [measured synthetic challenge](docs/TRANSITION_CHALLENGE_V13.md). **Shadow simulation only; no live merchant auto-switching or production predictive authorization.**

## Causal strategy bridge research — v1.4

The new [synthetic bridge scorecard](lab/bridge.html) inspects promotion fatigue (7-day refund/pulse-resistant forecast), supply disruption (30-day historical stockout-exposure estimate) and hysteresis against the **unchanged, frozen v1.3 dynamic router**. It uses 6 complete-day confirmations, 70-day minimum residency, a 2-per-90-day switching cap, and a 10-day blend when eligible. Unsupported regime/horizon pairs use the original v1.3 forecast without a change. See the [algorithm design](docs/BRIDGE_METHODS_V14.md) and [measured challenge outcomes](lab/bridge-results.md). All synthetic and HOLD. No real Shopify data or merchant routing changes.


## F2 Learning Lab 1.5 — Supply Availability Research (synthetic-only)

Open the [Supply Availability Research dashboard](lab/availability.html) (`/lab/availability.html` on a synthetic-mode Render service). It separates hypothetical full-availability revenue from inventory-constrained sales, estimates future stockout risk only from completed observations, tests two different approaches to hazard/recurrence, and uses historical skill-gating for a shadow-only experimental forecast. Includes 19 independent and same-generator synthetic evaluation cases with documented failures. Read [the evidence and data contract](docs/SUPPLY_AVAILABILITY_V15.md). This does not change the authorized Shopify backend or permit real-business recommendations; decision authority remains HOLD.
