# LIBERIENT — no-paid-services Shopify development setup

**State (October 2026): infrastructure prepared; Shopify app registration and installation still require an authorized account holder. Shopify embedded integration is intentionally DISABLED. Do not interpret a demo connection as real merchant synchronization.**

## Existing free infrastructure
- **Demo site, unchanged:** https://f2-commerce-learning-lab-private.onrender.com/experience/
- **Separate Shopify development host (Render Free):** https://liberient-shopify-sandbox-free.onrender.com/
- **Proposed Shopify App URL once enabled:** https://liberient-shopify-sandbox-free.onrender.com/shopify-app/
- **Proposed webhook endpoint:** https://liberient-shopify-sandbox-free.onrender.com/shopify-app/webhooks
- **Free temporary Postgres:** `liberient-shopify-sandbox-free` in Render Oregon, PG18; instance `dpg-db7eg8qj9qps73c54npg-a`. **EXPIRES 2026-11-13, no backups.** Never use for valuable or permanent merchant records.
- **Shopify organization/store observed:** `1181qs-0t.myshopify.com` from existing *ChatGPT Shopify connector* only. This does NOT authorize app installation or provide app credentials.

**No-cost constraints:** Render Free services share 750 running instance-hours per workspace/month and can be suspended when exhausted. Bandwidth and build-minute overages may be charged depending on the workspace billing policy; inspect Render usage/settings. Do not upgrade or enable paid plans. The two Free Render services have `autoDeploy: no`, and the sandbox presently has `F2_DEMO_MODE=true` / `LIBERIENT_EMBEDDED_ENABLED=false`. The embedded endpoint returning 404 until configured is intentional.

## Merchant-authorized step — create a Shopify app from the Dev Dashboard

1. Open **https://dev.shopify.com/dashboard** and sign in using an account that has Shopify app development permissions. Prefer creating a **Dev store** under **Stores → Create store → Dev** (free for development, not the merchant's live Basic store).
2. Select **Apps → Create app → Start from Dev Dashboard**. Name it **LIBERIENT**.
3. Under the new app's **Versions**, configure:
   - App URL: `https://liberient-shopify-sandbox-free.onrender.com/shopify-app/`
   - Embedded: **On**
   - Access scope: `read_orders` **only**
   - Webhooks: `2026-10`; configure mandatory privacy webhooks and order create/update + app uninstall, pointed to the webhook URL above. For exact topic setup consult `shopify.app.toml.example` and Shopify's documentation.
   - **Do not** request write scopes, customer data scopes, or `read_all_orders` for this proof of concept.
4. Save/release the app version. Shopify app installation must be explicitly approved by the user and should first happen in a Dev store. If the app shows a loading/not-found page at this point, that is expected until the secured integration is enabled.
5. Return only the **app client ID** (public identifier), **not** the client secret, token, payment details or store credentials, in chat. Configure any secret directly in the Render service environment UI, not in GitHub or conversation.

Shopify's Dev Dashboard creation documentation: https://shopify.dev/docs/apps/build/dev-dashboard/create-apps-using-dev-dashboard
Development stores: https://shopify.dev/docs/apps/build/stores/development-stores

## Once the Shopify app exists

1. Safely configure server secrets on the **separate Shopify sandbox service only**, never on the public demo:
   - `F2_DEMO_MODE=false`
   - `LIBERIENT_EMBEDDED_ENABLED=true`
   - `SHOPIFY_CLIENT_ID` (public)
   - `SHOPIFY_CLIENT_SECRET` (private, store in Render environment)
   - `LIBERIENT_DATABASE_URL` (private PostgreSQL URL)
   - `LIBERIENT_TOKEN_ENCRYPTION_KEY` (cryptographically generated, 64 hex chars; do not commit)
   - `F2_BASE_URL=https://liberient-shopify-sandbox-free.onrender.com`
2. Verify the Render build installs Node dependencies: `npm install --prefix server --omit=dev && node --test server/test/*.test.js && node tests/test_core.js`.
3. Verify install, Shopify App Bridge session token, tenant-scoped data reads, privacy webhooks, uninstall cleanup and Shopify subtotal reconciliation with a Dev store. **Do not store actual customer data on the temporary expiring free database.**
4. Replace temporary storage with a reliable backed-up store before any non-demo rollout. Production forecasts, automatic model switching and recommendations remain **HOLD** until independent validation.

## Not yet completed

- Shopify app creation and installation in the Shopify Dev Dashboard (the connected Shopify tools cannot administer Dev Dashboard apps).
- Credentials/token exchange against a real Shopify installation.
- Database-to-service credential link and live data sync.
- Full browser verification inside Shopify Admin.
- A permanent **no-cost** storage option with reliable backup/retention. This free Render PostgreSQL is temporary only.

**Do not pay to complete these tests.** If Shopify or Render asks for a paid upgrade, stop and choose a supported free alternative.
