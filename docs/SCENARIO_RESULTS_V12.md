# F2 Scenario-Specific Forecasting — F2 Scenario Research 1.2

**SYNTHETIC ONLY — independent challenge evaluation, not real Shopify accuracy. ALL production decisions HOLD.**

Development seed groups: 121121, 232232, 343343. Unseen challenge groups: 454454, 565565, 676676.
Models and scenario-specific selections were fixed using development **validation** data. The challenge holdout was inspected after selection.
The simulated business type is known to the experiment. No real-business classifier or universal champion has been validated.

| Scenario | 7-day selected | 7d WAPE baseline → selected | 7d change | 7d decision | 30-day selected | 30d WAPE baseline → selected | 30d change | 30d decision |
|---|---|---|---:|---|---|---|---:|---|
| Steady Retail | regime reset | 4.58% → 3.5% | 23.58% | RESEARCH CANDIDATE — PROSPECTIVE TEST REQUIRED | yearly analogue | 3.33% → 2.05% | 38.44% | RESEARCH CANDIDATE — PROSPECTIVE TEST REQUIRED |
| Rapid Growth | yearly analogue | 3.35% → 2.99% | 10.75% | RESEARCH CANDIDATE — PROSPECTIVE TEST REQUIRED | yearly analogue | 4.04% → 2.32% | 42.57% | RESEARCH CANDIDATE — PROSPECTIVE TEST REQUIRED |
| Struggling Store | 7-day average | 3.89% → 3.89% | 0% | HOLD — NO PROMOTION | yearly analogue | 6.35% → 2.54% | 60% | RESEARCH CANDIDATE — PROSPECTIVE TEST REQUIRED |
| Seasonal Store | yearly analogue | 8.69% → 4.33% | 50.17% | RESEARCH CANDIDATE — PROSPECTIVE TEST REQUIRED | yearly analogue | 13.64% → 3.09% | 77.35% | RESEARCH CANDIDATE — PROSPECTIVE TEST REQUIRED |
| Unpredictable Store | stockout-aware | 35.03% → 32.94% | 5.97% | HOLD — NO PROMOTION | promotion pulse | 19.72% → 17.4% | 11.76% | RESEARCH CANDIDATE — PROSPECTIVE TEST REQUIRED |
| Sudden Demand Drop | yearly analogue | 9.93% → 7.75% | 21.95% | HOLD — NO PROMOTION | yearly analogue | 13.52% → 9.43% | 30.25% | HOLD — NO PROMOTION |
| Promotion Fatigue | promotion pulse | 15.44% → 14.94% | 3.24% | HOLD — NO PROMOTION | promotion pulse | 11.09% → 13.75% | -23.99% | FAIL — KEEP BASELINE |
| Supply Disruption | 7-day average | 33.67% → 33.67% | 0% | HOLD — NO PROMOTION | 7-day average | 56.81% → 56.81% | 0% | HOLD — NO PROMOTION |
| Customer Behavior Shift | regime reset | 5.19% → 4.02% | 22.54% | RESEARCH CANDIDATE — PROSPECTIVE TEST REQUIRED | yearly analogue | 4.34% → 3.13% | 27.88% | RESEARCH CANDIDATE — PROSPECTIVE TEST REQUIRED |

## Method rankings and alternative hypotheses

The first listed ranking is **retrospective** performance over the challenge sets, NOT the method used for forecasts. It must never be substituted after the fact.

### Steady Retail
- **7d:** preselected **regime reset** (3.5% WAPE, 0.71% bias), validation-selected baseline **28-day average** (4.58% WAPE). Independent improvement **23.58%**. 3/3 challenge groups cleared +10%; 0/3 groups worse. **RESEARCH CANDIDATE — PROSPECTIVE TEST REQUIRED**. Retrospective top five: yearly analogue (2.88% WAPE); seasonal normalized (2.88% WAPE); 7-day average (3.14% WAPE); regime reset (3.5% WAPE); damped trend (3.9% WAPE).
- **30d:** preselected **yearly analogue** (2.05% WAPE, -0.41% bias), validation-selected baseline **28-day average** (3.33% WAPE). Independent improvement **38.44%**. 3/3 challenge groups cleared +10%; 0/3 groups worse. **RESEARCH CANDIDATE — PROSPECTIVE TEST REQUIRED**. Retrospective top five: yearly analogue (2.05% WAPE); seasonal normalized (2.05% WAPE); promotion pulse (2.43% WAPE); regime reset (2.49% WAPE); damped trend (2.56% WAPE).

### Rapid Growth
- **7d:** preselected **yearly analogue** (2.99% WAPE, 0.1% bias), validation-selected baseline **7-day average** (3.35% WAPE). Independent improvement **10.75%**. 2/3 challenge groups cleared +10%; 0/3 groups worse. **RESEARCH CANDIDATE — PROSPECTIVE TEST REQUIRED**. Retrospective top five: yearly analogue (2.99% WAPE); seasonal normalized (2.99% WAPE); 7-day average (3.35% WAPE); regime reset (3.7% WAPE); trend (4.22% WAPE).
- **30d:** preselected **yearly analogue** (2.32% WAPE, 0.13% bias), validation-selected baseline **7-day average** (4.04% WAPE). Independent improvement **42.57%**. 3/3 challenge groups cleared +10%; 0/3 groups worse. **RESEARCH CANDIDATE — PROSPECTIVE TEST REQUIRED**. Retrospective top five: yearly analogue (2.32% WAPE); seasonal normalized (2.32% WAPE); regime reset (3.49% WAPE); damped trend (3.6% WAPE); 28-day average (3.93% WAPE).

### Struggling Store
- **7d:** preselected **7-day average** (3.89% WAPE, 2.06% bias), validation-selected baseline **7-day average** (3.89% WAPE). Independent improvement **0%**. 0/3 challenge groups cleared +10%; 0/3 groups worse. **HOLD — NO PROMOTION**. Retrospective top five: yearly analogue (2.81% WAPE); seasonal normalized (2.81% WAPE); 7-day average (3.89% WAPE); regime reset (4.75% WAPE); trend (4.89% WAPE).
- **30d:** preselected **yearly analogue** (2.54% WAPE, 2.06% bias), validation-selected baseline **7-day average** (6.35% WAPE). Independent improvement **60%**. 3/3 challenge groups cleared +10%; 0/3 groups worse. **RESEARCH CANDIDATE — PROSPECTIVE TEST REQUIRED**. Retrospective top five: yearly analogue (2.54% WAPE); seasonal normalized (2.54% WAPE); 7-day average (6.35% WAPE); regime reset (6.68% WAPE); trend (7.36% WAPE).

### Seasonal Store
- **7d:** preselected **yearly analogue** (4.33% WAPE, -0.33% bias), validation-selected baseline **7-day average** (8.69% WAPE). Independent improvement **50.17%**. 3/3 challenge groups cleared +10%; 0/3 groups worse. **RESEARCH CANDIDATE — PROSPECTIVE TEST REQUIRED**. Retrospective top five: yearly analogue (4.33% WAPE); seasonal normalized (4.33% WAPE); 7-day average (8.69% WAPE); regime reset (12.15% WAPE); trend (15.2% WAPE).
- **30d:** preselected **yearly analogue** (3.09% WAPE, -0.41% bias), validation-selected baseline **7-day average** (13.64% WAPE). Independent improvement **77.35%**. 3/3 challenge groups cleared +10%; 0/3 groups worse. **RESEARCH CANDIDATE — PROSPECTIVE TEST REQUIRED**. Retrospective top five: yearly analogue (3.09% WAPE); seasonal normalized (3.09% WAPE); regime reset (11.69% WAPE); 7-day average (13.64% WAPE); adaptive weekday (16.52% WAPE).

### Unpredictable Store
- **7d:** preselected **stockout-aware** (32.94% WAPE, 7.51% bias), validation-selected baseline **same weekday** (35.03% WAPE). Independent improvement **5.97%**. 0/3 challenge groups cleared +10%; 0/3 groups worse. **HOLD — NO PROMOTION**. Retrospective top five: damped trend (32.69% WAPE); trend (32.84% WAPE); stockout-aware (32.94% WAPE); promotion pulse (33.95% WAPE); 7-day average (34.45% WAPE).
- **30d:** preselected **promotion pulse** (17.4% WAPE, 0.44% bias), validation-selected baseline **same weekday** (19.72% WAPE). Independent improvement **11.76%**. 3/3 challenge groups cleared +10%; 0/3 groups worse. **RESEARCH CANDIDATE — PROSPECTIVE TEST REQUIRED**. Retrospective top five: damped trend (16.77% WAPE); promotion pulse (17.4% WAPE); stockout-aware (19.39% WAPE); same weekday (19.72% WAPE); robust weekday (19.76% WAPE).

### Sudden Demand Drop
- **7d:** preselected **yearly analogue** (7.75% WAPE, 5.41% bias), validation-selected baseline **28-day average** (9.93% WAPE). Independent improvement **21.95%**. 3/3 challenge groups cleared +10%; 0/3 groups worse. **HOLD — NO PROMOTION**. Retrospective top five: 7-day average (5.67% WAPE); yearly analogue (7.75% WAPE); seasonal normalized (7.75% WAPE); regime reset (7.95% WAPE); trend (9.51% WAPE).
- **30d:** preselected **yearly analogue** (9.43% WAPE, 8.11% bias), validation-selected baseline **7-day average** (13.52% WAPE). Independent improvement **30.25%**. 3/3 challenge groups cleared +10%; 0/3 groups worse. **HOLD — NO PROMOTION**. Retrospective top five: yearly analogue (9.43% WAPE); seasonal normalized (9.43% WAPE); regime reset (12.07% WAPE); 28-day average (12.61% WAPE); 7-day average (13.52% WAPE).

### Promotion Fatigue
- **7d:** preselected **promotion pulse** (14.94% WAPE, 10.55% bias), validation-selected baseline **same weekday** (15.44% WAPE). Independent improvement **3.24%**. 0/3 challenge groups cleared +10%; 0/3 groups worse. **HOLD — NO PROMOTION**. Retrospective top five: 28-day average (13.35% WAPE); adaptive weekday (13.74% WAPE); robust weekday (13.97% WAPE); regime reset (14.71% WAPE); promotion pulse (14.94% WAPE).
- **30d:** preselected **promotion pulse** (13.75% WAPE, 13.49% bias), validation-selected baseline **same weekday** (11.09% WAPE). Independent improvement **-23.99%**. 0/3 challenge groups cleared +10%; 3/3 groups worse. **FAIL — KEEP BASELINE**. Retrospective top five: yearly analogue (7.82% WAPE); seasonal normalized (7.82% WAPE); 28-day average (9.61% WAPE); adaptive weekday (9.82% WAPE); same weekday (11.09% WAPE).

### Supply Disruption
- **7d:** preselected **7-day average** (33.67% WAPE, 0.82% bias), validation-selected baseline **7-day average** (33.67% WAPE). Independent improvement **0%**. 0/3 challenge groups cleared +10%; 0/3 groups worse. **HOLD — NO PROMOTION**. Retrospective top five: 7-day average (33.67% WAPE); regime reset (43.75% WAPE); trend (48.26% WAPE); damped trend (48.98% WAPE); seasonal normalized (50.67% WAPE).
- **30d:** preselected **7-day average** (56.81% WAPE, 7.25% bias), validation-selected baseline **7-day average** (56.81% WAPE). Independent improvement **0%**. 0/3 challenge groups cleared +10%; 0/3 groups worse. **HOLD — NO PROMOTION**. Retrospective top five: damped trend (31.44% WAPE); promotion pulse (32.95% WAPE); same weekday (33.41% WAPE); robust weekday (36.93% WAPE); stockout-aware (41.14% WAPE).

### Customer Behavior Shift
- **7d:** preselected **regime reset** (4.02% WAPE, 1.01% bias), validation-selected baseline **28-day average** (5.19% WAPE). Independent improvement **22.54%**. 3/3 challenge groups cleared +10%; 0/3 groups worse. **RESEARCH CANDIDATE — PROSPECTIVE TEST REQUIRED**. Retrospective top five: yearly analogue (3.13% WAPE); seasonal normalized (3.13% WAPE); 7-day average (3.93% WAPE); regime reset (4.02% WAPE); damped trend (4.59% WAPE).
- **30d:** preselected **yearly analogue** (3.13% WAPE, 0.49% bias), validation-selected baseline **28-day average** (4.34% WAPE). Independent improvement **27.88%**. 3/3 challenge groups cleared +10%; 0/3 groups worse. **RESEARCH CANDIDATE — PROSPECTIVE TEST REQUIRED**. Retrospective top five: regime reset (2.9% WAPE); yearly analogue (3.13% WAPE); seasonal normalized (3.13% WAPE); promotion pulse (3.18% WAPE); same weekday (3.49% WAPE).

## Learning Lab governance

- LL-09: Scenario and horizon selections are frozen using development validation only; no use of future test labels to select forecasting strategy.
- LL-10: Record all adverse results including high absolute WAPE, poor bias, and scenario-specific failures. Compare to each seed’s validation-selected baseline.
- LL-11: Generator type is an experimental oracle category. Real regime inference is NOT available and scenario-specific results may collapse on another simulator.
- LL-12: Positive synthetic results are only prospective research candidates; no Shopify reconciliation, uncertainty interval coverage, decision utility or measured profitability.
- HOLD on production recommendations, live Shopify usage, automatic model promotion, and business impact claims.

## Next prospective work

- Freeze candidate research settings in code; evaluate generators with changed shock timing, asymmetric seasons, inventory lead times and promotion schedules.
- Develop a **causal, as-of-cutoff** regime detector using only observable prior signals, then test confusion and strategy-routing errors.
- Require improved accuracy on a different generator and real authorized chronological sales history before any merchant-facing model recommendation.

## Secondary frozen calendar shift (same generator, not external validation)

Simulation calendar end 2027-04-17; new challenge seeds 787878, 898989, 909090. Selections and model formulas unchanged.

| Scenario | 7d mean WAPE change | 7d negative groups | 30d mean WAPE change | 30d negative groups |
|---|---:|---:|---:|---:|
| Steady Retail | 22.08% | 0/3 | 44.23% | 0/3 |
| Rapid Growth | 14.89% | 0/3 | 65.33% | 0/3 |
| Struggling Store | 0% | 0/3 | 51.86% | 0/3 |
| Seasonal Store | 54.38% | 0/3 | 85.45% | 0/3 |
| Unpredictable Store | 5.55% | 0/3 | 10.54% | 0/3 |
| Sudden Demand Drop | 24.63% | 0/3 | 23.36% | 0/3 |
| Promotion Fatigue | -4.03% | 3/3 | -24.44% | 3/3 |
| Supply Disruption | 0% | 0/3 | 0% | 0/3 |
| Customer Behavior Shift | 19.3% | 0/3 | 52.25% | 0/3 |

The promotion-fatigue method again underperformed on both horizons. Supply-disruption methods did not improve because the frozen selection was the reference itself. These failures stay in the ledger.

