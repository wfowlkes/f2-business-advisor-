
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
