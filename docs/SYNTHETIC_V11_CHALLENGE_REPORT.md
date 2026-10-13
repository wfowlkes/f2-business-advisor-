# Learning Lab v1.1 — Shadow challenger and adversarial regimes

**SYNTHETIC-ONLY / NOT REAL SHOPIFY DATA / PRODUCTION DECISION AUTHORITY: HOLD.**

Date: 2026-10-13. Model and generator design were frozen before the two additional seed challenges. Prior synthetic v1.0 benchmarks remain untouched; the original five generated histories retain the same fingerprints at seed 101.

## Experiment design

- Four *additional* disturbance regimes: sudden structural demand decline during reserved holdout, periodic promotion fatigue with refunds, clustered fulfillment/supply shortages, and weekend-to-weekday customer behavior shift.
- Nine scenarios in total; 1,080 days of generated history per scenario and seed, with an initial 480-day training window, 300-day validation and 300-day untouched holdout.
- Original v1.0 champions (7-day mean, 28-day mean, same weekday) and original challengers (short trend and 364-day analogue) are **not modified**.
- **Fixed research-only shadow:** for each future weekday, forecast using `0.70 × (mean of matching weekdays in the last 28 days) + 0.30 × (mean of matching weekdays in the last 56 days)`. No future signals or oracle regime labels are used.
- Development group: base seed `101`, three replicates (`+7919` each). Separate challenge seed groups: `30303` and `70707`, three replicates each. These choices were made before the challenge results were inspected. No weights were changed after evaluation.
- Scoring: percentage change in WAPE of aggregated 7-day and 30-day sales forecast totals versus the **validation-selected original champion**. Positive improvement means lower synthetic error; negative means worse. Each cell below averages three independent runs' relative improvements, not necessarily the ratio of the displayed mean WAPEs.

## Fixed shadow challenger versus frozen champion — 30-day WAPE improvement

| Synthetic business regime | Development group 101 | Challenge 30303 | Challenge 70707 | Decision |
|---|---:|---:|---:|---|
| Steady retail | +16.86% | −1.55% | −1.24% | HOLD: fails out-of-sample consistency |
| Rapid growth | +10.69% | −11.15% | −0.81% | HOLD: fails challenges |
| Struggling store | −12.81% | −37.13% | −14.96% | HOLD: consistently worse |
| Seasonal store | −18.08% | −17.10% | −21.08% | HOLD: consistently worse |
| Unpredictable store | −12.43% | −25.26% | −16.86% | HOLD: consistently worse |
| Sudden demand drop | +0.83% | −10.98% | −8.16% | HOLD: weak/negative |
| Promotion fatigue | +9.25% | +9.93% | +7.63% | HOLD: gains below 10% research screening threshold |
| Supply disruption | +20.06% | +20.43% | +19.16% | Further synthetic research possible; production HOLD |
| Shopping-day pattern shift | +5.42% | +11.39% | +6.33% | HOLD: gains not consistently above 10% |

**Adversarial check:** Although supply-disruption simulation produced repeat improvement, the error remains very high. In seed group 30303, the baseline's 30-day WAPE was **57.47%**, compared with shadow **45.73%**. This is unsuitable for an automated real-world recommendation. The result also depends on a specific manually designed synthetic stockout pattern.

**Seven-day shadow failure:** On the seasonal scenario, the shadow WAPE was worse by 114.79%, 111.70%, and 108.73% across the three seed groups. Growth and decline simulations also suffered large negative 7-day changes. Therefore no general 7-day model promotion is defensible.

## Learning Lab control decisions

1. **LL-08 REGIME STRESS: PASS for scenario coverage / HOLD for forecast authority.** The extra scenarios now include shifts inside an independently reserved holdout, not only repeated calendar patterns. No future values influence model selection.
2. **LL-09 NEGATIVE RESULT LEDGER: PASS.** Both profitable-looking and unfavorable synthetic results are reported by regime and horizon. The existing frozen champion remains unchanged.
3. **LL-10 SHADOW PROMOTION GATE: HOLD.** The challenger would have to beat the frozen champion out of sample on multiple new independent simulated regimes *without material failures* before even becoming a candidate for a real-data study. It failed this requirement.
4. **AC-09 EMERGING OPPORTUNITY:** Evidence points to stratifying modeling research by volatility, stockout conditions and horizon, not assigning universal recency weights. Alternative explanation: the simulator embeds artificial regimes not representative of production operations. Prospective action: freeze candidate methods first, challenge on new generators/real authorized data, and compare against Shopify-native analytics. Owner: next Learning Lab controlled experiment. No predictive weights promoted.
5. **REAL-STORE VALIDATION: NOT STARTED.** These tests do not validate commercial profitability, Shopify comparative accuracy, calibrated uncertainty bounds, or suitability for merchants.

## Reproducibility

Run from the repository root using Node.js 22 or later:

```bash
node --test server/test/*.test.js tests/test_report.js
node -e "const L=require('./lab/synthetic.js'); for (const seed of [101,30303,70707]) {const r=L.batch({seed,seeds:3}); console.log(seed,r.businesses.map(b=>[b.type,b.summary[7].shadowImprovement,b.summary[30].shadowImprovement]));}"
```

The synthetic daily scheduled review also records the frozen original comparison and the research-only shadow's negative and positive results. No automation changes weights or sends merchant data to the public lab.
