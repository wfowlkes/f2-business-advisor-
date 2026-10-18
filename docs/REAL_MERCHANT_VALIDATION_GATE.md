# LIBERIENT real-merchant validation: Phase 1 read-only gate

**Status: research / HOLD.** This pilot module inspects **only caller-supplied aggregate records**, never fetches Shopify tokens, order/customer personal information, or automatically authorizes recommendations. It is not installed in the merchant-facing experience, and the existing customer dashboard is unchanged.

## Run tests

```sh
node --test tests/test_merchant_readiness.js
```

Optional local invocation, with numbers normalized by a separate approved read-only data adapter:

```js
const {assessMerchantReadiness}=require('./lab/merchant_readiness.js');
const result=assessMerchantReadiness({
 source:'SHOPIFY_AGGREGATE',
 daily:[/* chronological {date:'YYYY-MM-DD', orders:integer, total_sales:number} */],
 inventoryRows:[],
 customerSeries:[]
});
```

## Source requirements

- **Real merchant data:** explicitly authorized Shopify aggregate sales and daily order counts, provenance-labeled, no individual names, emails, addresses, or raw order exports committed to GitHub.
- **Dates and arithmetic:** at least 120 complete contiguous days; numeric, nonnegative sales and integer order counts.
- **Minimum activity:** at least 30 days with orders and 100 recorded orders. These conservative *initial pilot-readiness heuristics* are not statistically justified accuracy guarantees.
- **Supply/customer prerequisites:** the presence of separately verified inventory and customer activity aggregates. Actual availability, replenishment and refunded sales still require correct financial definitions and reconciliation before prospective experiments.

The gate only returns **pilot_data_ready**, which means suitable to begin additional validation, not that an AI forecast is proven or can be shown to the merchant. Authority remains HOLD at every stage.

## Zero-activity case

A store can have 181 calendar rows and still contain no predictive signal if orders and sales are all zero. An all-zero store is valid as a *connection test* but not a statistically useful experiment for finding an improvement in sales forecasting. Similarly, missing inventory data cannot be treated as a true zero inventory count.

Do not display a nonzero forecast, inferred inventory, conversion improvements, customer retention, or measured ROI without source-backed evidence.

## Required next protocol

1. Separately reconcile ShopifyQL daily aggregates with store financial totals, refunds, timezones, and record completeness. Validate data rights and privacy rules.
2. Enroll a merchant with meaningful, consented activity; do **not** manufacture activity in the connected real store.
3. Freeze a naive baseline and exploratory F2 forecasts at identical chronological cutoffs, with stockout and promotion assumptions recorded as-of-cutoff.
4. Evaluate 7- and 30-day horizons prospectively, including bias, WAPE/MAE, group coverage, calibration, drift, and realistic stock availability. Keep all failures and abstentions.
5. Promote no model without a reviewed, independently audited improvement and merchant approval. Changes to the actual Shopify app require separate security and consent review.

Current synthetic Learning Lab v1.5 remains a distinct experiment and must never be mixed with the real-merchant holdout leaderboard.
