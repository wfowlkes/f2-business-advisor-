# F2 Commerce — Free browser preview

## Activate GitHub Pages on iPhone
1. While logged in, open https://github.com/wfowlkes/f2-business-advisor-/settings/pages
2. In **Build and deployment**, choose **Deploy from a branch**.
3. Select branch **main**, folder **/(root)**, and **Save**.
4. Once deployment completes, GitHub Pages will display the confirmed website URL. Expected URL pattern (not confirmed active): https://wfowlkes.github.io/f2-business-advisor-/.
5. Open the URL in Safari and press **Explore demo** to inspect synthetic numbers.

## Safety
This is a public, browser-only prototype, not an installed Shopify app. Public GitHub Pages contains no merchant credentials or personally identifying customer information. CSV imports are handled locally by JavaScript and this application does not upload the CSV to a server. Do **not** place access tokens, personal data, raw order CSV files or private exports in this repository or online demo. A public static site is not a merchant-authenticated dashboard.

## Verify
- Before interaction: no-data state
- After Explore demo: SYNTHETIC DEMO, 7/30 day exploratory forecasts, all decisions HOLD
- CSV import: daily aggregate date, net_sales, orders only; malformed or customer/order-level inputs are rejected
- F2 model approvals remain HOLD; no business accuracy claims derived from the synthetic demo
- Offline automated tests: `node tests/test_core.js`
- A Shopify backend, secure install flow, and real-data verification are future work; enabling Pages does not enable Shopify
