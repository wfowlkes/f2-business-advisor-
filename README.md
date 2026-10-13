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


## Phase 2 — Shopify read-only backend (source available; NOT deployed)

A separate **private** Node 22 service is in [`server/`](server/), with a [setup guide](docs/SHOPIFY_BACKEND_SETUP.md) and an optional Render development-preview [Blueprint](render.yaml). The existing GitHub Pages website remains a **public synthetic dashboard only**. Private store access has **not** been installed or authorized and must not be attempted from the public site.

The bridge uses Shopify client credentials only for a store under the same Shopify organization, selects minimal read-only scopes, aggregates recent order subtotal *proxies* by verified store timezone, and keeps all business decisions on **HOLD** until independent financial reconciliation and out-of-sample evaluation are complete. The code does not contain Shopify tokens, passwords, raw order exports, or other merchant secrets.
