# F2 Commerce Intelligence — Offline Preview 0.3

A credit-free **offline prototype** for F2 Commerce Intelligence. Open `index.html` in a modern desktop or mobile browser (or deploy the static files on GitHub Pages). It has **no dependencies**, hosting requirement, Replit credits or Shopify credentials.

## What works now

- Explore an unmistakably **synthetic** 400-day retail example.
- Import a **daily aggregate** CSV in the format `date,net_sales,orders` (see `sample_daily.csv`).
- Run 7-day and 30-day walk-forward baseline and challenger comparisons, with chronological validation / holdout separation.
- View revenue trend, horizon forecasts, WAPE, bias and Learning Lab HOLD reasons.
- Download an audit JSON summarizing tests and controls.
- This app processes imported CSV locally in the browser session and has no server-side CSV upload. Never import personal or raw order data.

## What is not done

- **Not an installed or embedded Shopify app.** It cannot automatically synchronize orders.
- No merchant OAuth, multi-tenant server, database, production auth or background jobs.
- No verified shop profitability uplift; no calibrated prediction intervals or model promotions.
- No complete inventory ingestion yet: relevant recommendations remain HOLD.
- Audit JSON downloaded by the user is **not** an immutable ledger.

## Importing data from Shopify

Use an approved **daily aggregated** Shopify analytics export, with at least `date,net_sales,orders`. Dates must be valid `YYYY-MM-DD`; revenue should be in a verified store reporting currency (demo displays USD; imported currency is not assumed). Include every calendar day, recording genuine zero-sales days as 0. Do **not** assume missing days equal zero. **Do not** upload a raw order-level CSV containing customer PII; pre-aggregate in an authorized tool first.

A label of `net_sales` or `total_sales` does not independently verify financial reconciliation. Refund/tax/shipping definitions need to be verified separately. This prototype does not assert reconciliation merely because column headers match.

For a store without sufficient verified transactions, the correct output is HOLD. This starter does not connect to or disclose any merchant's private store data.

## Tests

If Node is installed, run `node tests/test_core.js`. All tests are offline and use no user data.


## Free browser preview (GitHub Pages)

This is a static demo, **not** a Shopify-connected app. In **Settings → Pages** choose **Deploy from a branch**, branch `main`, folder `/(root)`, then **Save**. See [GitHub Pages instructions](docs/GITHUB_PAGES.md). Until configured, source code in GitHub does not imply the website is deployed.

## Shopify Phase 1

See [the read-only integration plan](docs/SHOPIFY_READ_ONLY_PLAN.md). Never put Shopify credentials or real merchant/customer data in this public GitHub repository.

## Next production step

Integrate these components into the existing F2 app or another host after secure independent Shopify app registration, merchant OAuth, least-privilege read-only scopes, historical access approval when required, multi-tenant isolation, and an authenticated database-backed immutable Learning Lab ledger. **Do not deploy this prototype as a publicly accessible merchant application**; it has no user authentication. Publishing the source code does not make it production-ready.


## Synthetic Business Testing Lab v1.0

- Open [the synthetic testing dashboard](lab/) in the free browser preview, or `/lab/` on the Render development service when `F2_DEMO_MODE=true`.
- Five deterministic simulated merchant regimes × adjustable random seeds; 1080 days of synthetic sales, order, refund, customer-count and inventory signals per regime.
- Leakage-safe training / validation / holdout windows, 7-day and 30-day forecasts, four core simple models plus a prior-year analogue, 15-run default robustness test, explicit opportunities and adversarial alternatives.
- See [learning protocol](docs/LEARNING_LAB_PROTOCOL.md) and [measured synthetic benchmark report](docs/SYNTHETIC_BASELINE_REPORT.md).
- All simulation outcomes and business decisions remain **SYNTHETIC / HOLD**. No Shopify orders, personal data, secrets or real-world accuracy claims are involved.

## Phase 2 — Shopify read-only backend (source available; NOT deployed)

A separate **private** Node 22 service is in [`server/`](server/), with a [setup guide](docs/SHOPIFY_BACKEND_SETUP.md) and an optional Render development-preview [Blueprint](render.yaml). The existing GitHub Pages website remains a **public synthetic dashboard only**. Private store access has **not** been installed or authorized and must not be attempted from the public site.

The bridge uses Shopify client credentials only for a store under the same Shopify organization, selects minimal read-only scopes, aggregates recent order subtotal *proxies* by verified store timezone, and keeps all business decisions on **HOLD** until independent financial reconciliation and out-of-sample evaluation are complete. The code does not contain Shopify tokens, passwords, raw order exports, or other merchant secrets.

## Synthetic Business Testing Lab v1.1 — nine scenarios

- Original five generator regimes and their frozen fingerprints are preserved.
- Four new independent stress conditions: sudden demand drop, promotion fatigue, recurring stockouts, and shifted weekday shopping patterns.
- A fixed 70% recent / 30% longer same-weekday forecasting method is tested as a **shadow** and never used to replace the frozen production champion.
- 7-day and 30-day results are compared on distinct validation and holdout windows; the two additional synthetic seed groups challenge the fixed model choices.
- [Full v1.1 adversarial synthetic evaluation](docs/SYNTHETIC_V11_CHALLENGE_REPORT.md).
- **Synthetic only / production HOLD.** No merchant credentials, customer information, or evidence of real Shopify profit lift is involved.

## Scenario-specific forecasting research v1.2

Explore [the preselected method versus challenge matrix](lab/strategies.html), including 9 store regimes × 7/30-day horizons × 12 forecasting methods. Pre-registered development validation seeds select one method per synthetic type and horizon. Three different synthetic challenge seed groups independently grade those methods without test-time model changes. [Read the complete findings](docs/SCENARIO_METHODS_V12.md). All merchant decisions remain **HOLD**.

The [second calendar-shift challenge](docs/SCENARIO_RESULTS_V12.md) preserves adverse results and flags promotion cycle phase uncertainty. Frozen method choices remain research only.
