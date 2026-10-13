# F2 Commerce Phase 2 — private read-only Shopify connection

**Status:** Implemented and tested source code. **Not connected to a production store or deployed yet.** GitHub Pages remains the independent public synthetic demo.

## Scope of this release

- Single-store, private merchant-only Node 22 backend (`server/`), no required third-party packages.
- User-owned Shopify Dev Dashboard app, **client credentials grant** for stores in the **same Shopify organization** only. No merchant-install/OAuth support for unrelated businesses yet.
- Strict `read_orders` scope required; explicitly rejects write scopes and uses only GraphQL queries, never mutations.
- Authenticates a private dashboard using a strong `F2_DASHBOARD_KEY`, never transmitted to the public GitHub Pages site; browser holds it only in tab memory.
- Pulls up to 55 days of complete paginated order records; requests **only** order time, cancellation/financial status, order subtotal proxy and refund proxy. No names, emails, customer IDs, addresses or line items requested.
- Aggregates in ephemeral server memory by **Shopify's IANA reporting timezone** and **shop currency**. Reporting converts records into daily values and discards raw orders after each fetch. Ten-minute cache is ephemeral. No persistent data retention.
- Daily zero counts are inferred only after pagination completes; if the page cap is reached, financial field is invalid, timezone inconsistent, credentials invalid, or API response incomplete, the refresh is rejected.
- The order subtotal proxy is **NOT official Shopify net sales**, and lifetime order refund amounts do **not** correspond to refund event dates. Excludes canceled orders from order-count/subtotal proxy, notes unpaid orders but does not verify deposits. Projections and business-action authority always remain **HOLD**.
- Designed for the merchant's own store proof of concept. Not a multi-store or production-ready commercial Shopify application.

## One-time setup in Shopify (merchant action)

1. Open the Shopify [Dev Dashboard](https://dev.shopify.com/dashboard), choose **Apps → Create app** and name it **F2 Commerce Learning Lab**.
2. Create a version that requests only `read_orders`; release the version. `read_all_orders` is not requested, so this starter explicitly limits itself to recent order history. Shopify may require additional protected customer data review for some order access even when the query omits personal fields.
3. Install the app on **a store owned by the same Shopify organization**. Client credentials cannot access a store in another organization or an arbitrary merchant's store. Such use requires a separate OAuth-based architecture.
4. Copy **Client ID** and **Client secret** from the app settings to the **private backend host's encrypted environment settings**, never to the public GitHub repository, ChatGPT message, a screenshot or a browser console.
5. Choose a secure backend host that provides HTTPS, private environment variables, Node 22, and adequate uptime/operational security. GitHub Pages is **not** a backend host. A free preview host is **not** a secure production guarantee.
6. Configure the variables below. Set `F2_BASE_URL` to the exact HTTPS backend URL and `SHOPIFY_SHOP` to the store's `*.myshopify.com` address. Generate a random dashboard key of **at least 32 characters**, store it as a secret. **Never use passwords or reusable API tokens from other services** for this key.
7. Backend root URL opens the login page; enter the dashboard key to view a private read-only aggregate report. API endpoint `/api/snapshot` requires an `Authorization: Bearer` header. Only an authorized reader sees aggregated data.
8. Verify that the Shopify admin and F2 figures align conceptually; investigate timing, cancellations, returns, taxes, shipping, discounts and payouts. **Do not treat the subtotal proxy as reconciled net sales** or use it for real forecasts yet.

## Required secret variables

| Variable | Meaning |
|---|---|
| `SHOPIFY_SHOP` | Merchant's `store.myshopify.com` domain; hostname is pinned, not user-supplied |
| `SHOPIFY_CLIENT_ID` | Dev Dashboard app client ID (private backend) |
| `SHOPIFY_CLIENT_SECRET` | Dev Dashboard app secret (private backend) |
| `F2_DASHBOARD_KEY` | Strong merchant-only bearer key, 32+ random characters |
| `F2_BASE_URL` | HTTPS URL of the private backend |
| `NODE_ENV` | `production` on HTTPS server |
| `SHOPIFY_API_VERSION` | Defaults to `2026-10` |

Set `PORT` if required by the hosting provider (otherwise `3000`). No keys are committed by this project. See `server/.env.example` for names only.

## Deployment commands

Run from the repository root:

```sh
node --test server/test/*.test.js
node tests/test_core.js
cd server && npm start
```

For a local development example, you can load private variables via an external environment manager. On a hosted service choose root directory `server`, runtime Node 22, start command `npm start`. Configure HTTPS using the host and ensure its forwarding headers are trusted; reject direct plain HTTP access.

### Important limitations before a real merchant rollout

The demo/private prototype does **not** yet provide the following: user-level logins and roles, multi-store tenant isolation, full production OAuth for unrelated merchants, encrypted persistent session storage, webhook validation, durable immutable forecast snapshots, orders older than 60 days, true dated refund reconciliation, independently verified profit uplift, unattended schedulers, or Shopify app-store review. No autonomous write actions are implemented. Those are separate future phases subject to explicit approval and testing.

### Free hosting note

Some platforms provide a free Node web-service tier for demos, but free compute often suspends or has weak persistence. Do not use it as the production home for merchant credentials or customer data without a security review. Deploying this backend in a real environment requires choosing a host and providing the app's credentials **privately in that host**.

Reference: https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant
