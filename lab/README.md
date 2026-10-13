# F2 Synthetic Business Testing Lab v1.0

This is a reproducible, **100% synthetic** browser-based business forecasting test facility. It operates entirely in JavaScript with no external API, plugins, storage, credentials, hosting bill, or Shopify installation required. **No outcome here establishes real merchant accuracy.**

## Run

- GitHub Pages: `/lab/` under the F2 Commerce site.
- Render: `/lab/` when `F2_DEMO_MODE=true`; the route is disabled when demo mode is off. `/api/snapshot` remains bearer-key protected regardless of demo mode.
- Offline: open `lab/index.html` from a local static HTTP server rooted at the repository (e.g. `python3 -m http.server 8000`). Or run `node --test tests/test_synthetic_lab.js`.
- Press **Run Learning Lab**, select 1/3/5 independent seeds and browse scenarios. Change the reproducible seed to retest.
- **Export snapshot JSON** records results for later comparison. It is not an immutable institutional ledger.

## Scenarios

- `stable`: modest growth, weekly demand, ordinary refunds
- `growth`: accelerating demand and rising order counts
- `decline`: contraction and elevated refunds
- `seasonal`: unusually strong holiday peaks and subdued off-season
- `volatile`: sharp sales shocks, refund spikes and stockout-limited supply

Each has 1080 daily observations (reference end date **2026-10-12**), with `net_sales`, `orders`, `refunds`, `new_customers`, `returning_customers`, `inventory_units` and explicit shock flags. There are no customer records, names, emails or transaction IDs. The 3-seed default makes 15 synthetic stores. Seeds create deterministic datasets; identical settings yield identical outputs.

## Leakage-resistant evaluation

- Days 1–480: initial training window (for 1080-day histories).
- Days 481–780: 300-day chronological **validation** window. A champion is selected from simple baselines (7-day mean, 28-day mean, same-weekday mean); a challenger is selected from trend / prior-year analogue, using only validation observations and earlier history.
- Days 781–1080: 300-day **untouched selection-wise holdout**. Frozen methods are graded without re-selection. Every forecast is constructed only from daily observations dated before its cutoff; no horizon crosses a split boundary.
- Both 7-day and 30-day forecasts are evaluated using **non-overlapping** windows. Score WAPE, signed bias, and average fold absolute error. This tests known simulated outcomes, not unknown future Shopify orders.
- The 7- and 30-day post-history figures are **unrealized synthetic forecasts**; future outcomes are not known and approval remains HOLD.

## Learning Lab governance

- Track input provenance, seed, scenario, deterministic fingerprint, time split, model selection, holdout errors, opportunity signals and adversarial alternatives.
- Challenger improvement threshold for **a candidate only**: at least 10% smaller WAPE on holdout and better validation WAPE, absolute holdout bias no more than 5%, 8+ nonoverlapping evaluation folds, plus qualifying results in 2/3 seeded runs by default. This does **not** authorize live model deployment or production decisions.
- Do not auto-update weights, recalibrate from holdout, selectively discard bad scenarios or retrospectively change frozen baselines.
- Real Shopify feature validation, merchant-specific calibration, customer privacy compliance, refund reconciliation, business profitability, and measured impact compared with Shopify native analytics are entirely **out of scope and not validated**.
- All production decision authority stays **HOLD**. No bets, wagers or monetary outcome assertions.

See [Synthetic Baseline Report](../docs/SYNTHETIC_BASELINE_REPORT.md) for actual measured results of the reproducible default experiment, including a case where the challenger becomes substantially worse.
