# F2 Commerce Intelligence — Offline Starter 0.2

A credit-free **offline prototype** for F2 Commerce Intelligence. Open `index.html` in a modern desktop or mobile browser. It has **no dependencies**, hosting requirement, Replit credits or Shopify credentials.

## What works now

- Explore an unmistakably **synthetic** 400-day retail example.
- Import a **daily aggregate** CSV in the format `date,net_sales,orders` (see `sample_daily.csv`).
- Run 7-day and 30-day walk-forward baseline and challenger comparisons, with chronological validation / holdout separation.
- View revenue trend, horizon forecasts, WAPE, bias and Learning Lab HOLD reasons.
- Download an audit JSON summarizing tests and controls.
- No imported data is uploaded anywhere: data lives in the browser's active session.

## What is not done

- **Not an installed or embedded Shopify app.** It cannot automatically synchronize orders.
- No merchant OAuth, multi-tenant server, database, production auth or background jobs.
- No verified shop profitability uplift; no calibrated prediction intervals or model promotions.
- No complete inventory ingestion yet: relevant recommendations remain HOLD.
- Audit JSON downloaded by the user is **not** an immutable ledger.

## Importing data from Shopify

Use an approved **daily aggregated** Shopify analytics export, with at least `date,net_sales,orders`. Dates should be `YYYY-MM-DD`, and revenue numeric in store currency (demo displays USD). Include every calendar day, recording genuine zero-sales days as 0. Do **not** assume missing days equal zero. **Do not** upload a raw order-level CSV containing customer PII; pre-aggregate in an authorized tool first.

Note that a date and a value labeled `total_sales` can be imported, but the dashboard will flag missing net-sales reconciliation. Refund/tax/shipping definitions need to be verified separately. This prototype does not assert reconciliation merely because column headers match.

For a store without sufficient verified transactions, the correct output is HOLD. This starter does not connect to or disclose any merchant's private store data.

## Tests

If Node is installed, run `node tests/test_core.js`. All tests are offline and use no user data.

## Next production step

Integrate these components into the existing F2 app or another host after secure independent Shopify app registration, merchant OAuth, least-privilege read-only scopes, historical access approval when required, multi-tenant isolation, and an authenticated database-backed immutable Learning Lab ledger. **Do not deploy this prototype as a publicly accessible merchant application**; it has no user authentication. Publishing the source code does not make it production-ready.
