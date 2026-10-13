# F2 Commerce — Shopify read-only integration plan

**Current status: OFFLINE PREVIEW / DESIGN ONLY.** There is no embedded Shopify app, server-side OAuth flow, automatic data sync, multi-tenant isolation, or merchant-authorized production integration in this repository.

## Phase 1: privacy-safe data validation
1. Use an approved, **anonymized daily aggregate** CSV with exactly `date,net_sales,orders`, one row per calendar date. Each row represents daily totals in the store's reporting time zone.
2. Reject files with order IDs, customer names, email addresses, addresses, phone numbers or other order-level/identifying fields. Reject blank or invalid dates and numeric values.
3. Never infer that missing dates mean zero sales. Zero-sales dates must be verified as actual zero days. Negative revenue may represent refunds; verify its meaning.
4. Do not assume reported `net_sales` reconciles to Shopify financial statements. Mark reconciliation and recommendations HOLD until tested against independently verified reporting metrics.
5. Distinguish exploratory statistical forecasts from financially validated or approved decisions.

## Phase 2: read-only merchant-authorized connection
- Build an authenticated backend from a supported Shopify app template with merchant-approved installation and OAuth. Keep secrets and access tokens encrypted server-side only; never expose tokens via static HTML, JavaScript, Pages, or public GitHub.
- Request only necessary read scopes; start with `read_orders` for aggregate order metrics, and add `read_products` / relevant inventory read scopes only after the feature requires them. Do not request write scopes.
- Historical order access generally defaults to recent records; data beyond 60 days can require specific Shopify approval for `read_all_orders`. Access to protected customer data requires additional compliance and permissions.
- Aggregate authorized fields inside the secured backend to daily totals; do not display or copy private customer or order data to a publicly hosted client.
- Account for store timezone and currency, cancellations, tax, shipping, discounts, returns, refunds, partial refunds, discounts and multiple financial states. Validate against actual reports.
- Enforce tenant isolation, access control, encrypted storage, retention/deletion, replay-resistant verification of app callbacks, token revocation and an audit trail before any real synchronization.

## Phase 3: Learning Lab
- Freeze time-stamped source snapshots, forecasts, model versions and evaluation cutoffs *before* future outcomes.
- Benchmark against simple seasonal averages, the best validation-selected baseline, and available Shopify-native metrics; use chronological holdout tests, compare error/bias, evaluate uncertainty calibration, and track failure cases.
- Record adversarial alternative explanations and prospective tests for any candidate improvement.
- Never retrospectively upgrade or recalculate a frozen forecast to claim an artificial accuracy improvement.
- Put production immutable audit records in an authenticated database. An exported JSON from the browser is *not* an immutable ledger.
- Release business-impact recommendations only after financial reconciliation, sufficient real data, out-of-sample verification and documented approval. Until then HOLD.

## Incremental merchant value: to be demonstrated, not presumed
F2 is designed to provide transparent baseline comparisons, data quality alerts, controlled forecasting research and evidence-led scenario suggestions alongside Shopify. No measured profit or forecast improvement over Shopify has yet been established by this prototype.

## Permissions and sources
- Shopify authentication: https://shopify.dev/docs/apps/build/authentication-authorization
- Shopify access scopes: https://shopify.dev/docs/api/usage/access-scopes
- Protected customer data: https://shopify.dev/docs/apps/launch/protected-customer-data
- GitHub Pages is for the **public synthetic preview only**; it is not a production-hosted Shopify app.
