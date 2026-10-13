# F2 Commerce Shopify Read-only Bridge

This subdirectory contains a **separate private server**. The root GitHub Pages dashboard remains a public synthetic demo.

- `app.js` — merchant-only authenticated report API and private mobile dashboard.
- `shopify.js` — Shopify client credentials, strictly read-only paginated GraphQL order proxy aggregation.
- `dashboard.html`, `dashboard.js` — private UI; no secrets stored in browser local storage.
- `test/` — offline tests with mocked Shopify responses; no real store credentials needed.
- `.env.example` — environment variable names (not secrets).

**Start with** [the private Shopify setup guide](../docs/SHOPIFY_BACKEND_SETUP.md).

Run: `npm test` and then `npm start` after setting secret environment variables securely.

No Shopify mutations, order/customer PII queries, or automatic business actions are implemented. Forecast authority remains **HOLD**.


For a development-only deployment, see the repository root [`render.yaml`](../render.yaml). This is **not** approved for hosting production merchant data.
