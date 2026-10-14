# LIBERIENT Shopify embedded app — gated foundation v3.0

## Release state

This release adds a **server implementation and testable app configuration**, not a completed merchant installation. It stays disabled unless ALL required environment variables and PostgreSQL are provided. The existing `/experience/` and 60-day synthetic SQLite demo remain intact and continue to work.

The customer app URL *after enablement* is `/shopify-app/` (Shopify Admin App Home). Outside Shopify Admin, no Shopify ID token is available and therefore **no real merchant data** can be read. The dashboard reuses LIBERIENT design, not the misleading synthetic preview. Source-gating activates only `order subtotal`, `orders`, `source status`, and simple observed changes once connected. Customer-level metrics, refunds/returns, inventory, 7/30-day forecasts and ChatGPT cannot be activated from data the app has not actually synced.

## Architecture

- Shopify managed app installation and Shopify App Bridge CDN; a fresh Shopify-issued **ID token** is included in each API request. The server checks HS256 signature, issuer/destination domain, client ID (`aud`), `iat`, `nbf` and expiration. Do not authenticate via URL shop parameters or client-supplied headers.
- `POST /shopify-app/api/sync`: validates the ID token, exchanges it for an **expiring offline access token**, and fetches a bounded 55-day historical order window with cursor pagination, read-only GraphQL, no PII. Existing tokens are reused until expiry. No partial snapshot is committed if pagination or reporting context is incomplete.
- `GET /shopify-app/api/snapshot`: authenticates against the same verified ID token. Returns **only** that shop's aggregates from PostgreSQL, never access/refresh tokens or customer/order-level data. A `needsSync` flag allows the UI to request a refresh on reconnect.
- Signed webhooks: `orders/create`, `orders/updated` flag a store's data as dirty. A best-effort server-side refresh runs after acknowledgment; if interrupted, the durable dirty marker triggers a retry at the next authorized visit. GDPR `customers/data_request` and `customers/redact` are acknowledged as no customer-personal records are stored. `shop/redact` and `app/uninstalled` erase the store's token and daily aggregates. **Test webhooks in an actual development store before public distribution.**
- Persistent PostgreSQL: `liberient_shops`, `liberient_daily`, `liberient_receipts`; every query uses the verified `shop` key. No raw orders, names, emails, addresses, or unencrypted tokens are stored. Tokens are encrypted at rest using AES-256-GCM with a 32-byte separately managed key.
- The app does not mutate orders, inventory, customer data, products, or Shopify itself. Only aggregate histories and operational sync state are written to LIBERIENT's own database.
- All financial reconciliation, real-world forecast accuracy, automated predictive method promotion, and decision authority remain **HOLD**. Current metric is *order subtotal proxy*, not reconciled net sales.

## Deployment checklist (requires explicit merchant action)

1. Create or select a Shopify app in Shopify **Dev Dashboard** using Shopify CLI. Use the current official React Router template when building a new app from scratch. For the current custom LIBERIENT Node backend, copy the provided `shopify.app.toml.example` into your Shopify CLI project, replace the public client ID and HTTPS app URL, then use `shopify app deploy` and select a development store for installation.
2. Configure the app with read-only `read_orders` permission and mandatory compliance webhooks. **Never put Shopify client secret or access/refresh tokens in public GitHub or client-side JavaScript.** A scope for older-than-60-day orders, `read_all_orders`, would require its own approval; it is intentionally not used here.
3. Provision a secure, reliable, backed-up **PostgreSQL** database (not the existing in-memory SQLite demo). The current Render workspace has no Postgres instance as of implementation. Do not place real merchant data on ephemeral SQLite or an expiring unbacked free database.
4. Enable proper Node dependency installation during deployment (`npm install --prefix server --omit=dev`) and keep the build's existing regression test command. Add the `pg` package from `server/package.json`.
5. Configure these **private Render environment variables**:
   - `LIBERIENT_EMBEDDED_ENABLED=true` (leave off until installation and database are ready)
   - `SHOPIFY_CLIENT_ID` (public Shopify client ID; not a secret)
   - `SHOPIFY_CLIENT_SECRET` (secret, server-side only)
   - `LIBERIENT_DATABASE_URL` (server-side PostgreSQL connection URL; never in public assets)
   - `LIBERIENT_TOKEN_ENCRYPTION_KEY` (64 hex characters / 32 random bytes; rotate with a planned re-encryption migration)
   - `SHOPIFY_API_VERSION=2026-10` (review each quarter)
   - `LIBERIENT_DB_SSL=false` **only if** communicating with the DB via Render's private internal network where TLS is not required. For remote DBs leave TLS on and configure its CA correctly.
6. Run an installation in a **Shopify development store** and verify: embedding, token exchange, permission scopes, 55-day read-only backfill, daily aggregate reconciliation, webhook signatures and redaction, token expiry/refresh, empty or high-volume stores, tenant separation and deletion. Obtain real merchant approval and privacy assessment before rolling out widely.
7. After those checks, use a per-shop backfill and source-quality validation process. The current baseline must not claim real forecast confidence without chronological prospective testing.

## Operational limitations in this build

- During a fresh store's first sync, incomplete pagination yields a HOLD/503; no silent fall-through to zeros.
- Background webhook refresh is best effort, not a durable job queue. A production-grade queue and retries, scheduled reconciliation checks, monitoring and alerting are needed before marketing near-real-time updates.
- Embedded frame behavior, HMAC compliance webhooks, and permission scopes are locally tested; **Shopify installation, a live Postgres connection, webhook delivery and real-data sync are not yet verified**.
- Only completed local-store reporting days are aggregated. The current report is based on Shopify order subtotal amounts and should be reconciled to Shopify Analytics before being described as revenue.
- A standard Shopify public app must use **expiring offline tokens** and respect token refresh/rotation; this implementation requests expiring offline tokens and performs refresh only when needed for background work.

## Official references

- https://shopify.dev/docs/apps/build/authentication-authorization
- https://shopify.dev/docs/apps/build/authentication-authorization/implement-token-exchange
- https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens
- https://shopify.dev/docs/apps/build/webhooks
- https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance
- https://shopify.dev/docs/api/app-home/latest
