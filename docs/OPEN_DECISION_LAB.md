# LIBERIENT Open Decision Lab — reference forecasting + inventory research

**Status:** pure JavaScript, offline, SHADOW/HOLD. No production Shopify access, purchased service, secrets, new dependencies, customer orders or autonomous supplier action.

## Implemented
- `lab/open_decision_lab.js`: chronological, in-stock, same-weekday median baseline for 7/30 days. Only historical completed days are used.
- Expanding-window, non-overlapping **chronological** backtest against training-only global median, reporting candidate/reference MAE and all withheld windows.
- An *illustrative* bounded replenishment/case-pack calculator respecting lead days, stock on hand, confirmed inbound units, case packs, budget, and max stock capacity. It returns `order_placed:false`, `merchant_authorized:false` and `authority:HOLD`.
- Strict handling of known out-of-stock, unknown availability, malformed dates, negative costs and stale data. Unknown inventory or sales opportunity is **not** treated as zero true demand.
- Regression tests in `tests/test_open_decision_lab.js`.

Run offline:

```sh
node --test tests/test_open_decision_lab.js
node -e "const x=require('./lab/open_decision_lab.js'); console.log(Object.keys(x))"
```

## Reference capabilities vs products (no cloning)

- **Pecan AI / StatsForecast:** traditional baseline and walk-forward statistical model comparison. This implementation is self-written, dependency-free and MUCH simpler than a trained predictive platform.
- **Inventory Planner / Anaplan:** future supply requirements under budget/storage/case-pack constraints. The research calculator uses a conservative greedy bound, **not** an optimal, validated replenishment plan.
- **OR-Tools:** Apache-2.0 optional mature optimizer candidate for a separate future reviewed module; it is NOT currently installed or integrated. Source: https://github.com/google/or-tools
- **StatsForecast:** Apache-2.0 optional forecast-method benchmark candidate; NOT currently installed. Source: https://github.com/Nixtla/statsforecast
- **MLflow:** Apache-2.0 model/experiment provenance tool candidate; NOT currently installed. Source: https://github.com/mlflow/mlflow
- **Shopify Sidekick:** native Shopify merchant access and tasks are proprietary; no impersonation, API bypass, or feature copying.

The current synthetic LIBERIENT Learning Lab v1.5 remains frozen and separate. This new module is NOT an approved model replacement and is NOT connected to merchant UI or Shopify purchase workflows. All prospective merchant forecasts and order placements stay HOLD.

## Inputs and limits

`validateHistory([{date:'YYYY-MM-DD',units_sold:integer,stockout:boolean,on_hand?:integer},...])` requires at least 28 contiguous days. For in-stock demand proxy the code uses only `stockout===false`; unknown availability is excluded and flagged. If no verified in-stock days exist, the default zero forecast is **not** a defensible demand estimate; it must be held and reviewed.

`backtest(history,{horizon:7|30,minTrain:28})` creates nonoverlapping chronological folds and does not train on future outcomes; it abstains when the test window has unresolved availability. It reports cohort coverage but no confidence interval or statistically justified commercial lift.

`simulateReplenishment({dailyForecast,onHand,onOrder,leadDays,casePack,unitCost,budget,maxStorageUnits})` uses observed-sales proxy, **not** calibrated unconstrained demand. It ignores variable supplier fill rates, lead-time uncertainty, taxes, constraints across many SKUs, shelf life, substitutions and optimal capital allocation. It never acts.

To permit verified merchant recommendations later, add independent financial/inventory reconciliation, transaction and stock-state rights, prospective fixed-model holdouts, supply lead-time calibration, audited action logs and explicit merchant authorization. No performance superiority or return-on-investment claim can be made today.
