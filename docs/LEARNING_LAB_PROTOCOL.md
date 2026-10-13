# Learning Lab — Synthetic testing and control protocol

**Version:** F2 Synthetic Business Testing Lab v1.0, created 2026-10-13

## Purpose

Build a low-cost, reproducible synthetic test environment to challenge data validation, 7/30-day forecasting, and conditional recommendations. Never confuse simulator performance with a real retailer's verified results.

## Every test run

1. VERIFY provenance (`SYNTHETIC`) and record business type, seed, generator version, history cutoff, fingerprints, 7/30-day horizons.
2. ANALYZE sales, order, refund, customer-cohort counts and stockout flags. Never invent unprovided profitability, margin, tax, shipping or cost data.
3. FORECAST at chronological cutoffs using only earlier observations. Freeze champion selection at validation end. Grade holdout separately, without reselecting on holdout.
4. ATTACK: test adversarial stories (holiday seasonality mistaken for persistent growth; stockout causes lower sales; returns distort apparent demand; shocks ruin averages; short-run cherry-picking).
5. RECOMMEND an *experiment*, if and only if evidence gates pass. Any numeric scenario forecast shown must remain **synthetic and NOT APPROVED**.
6. MEASURE: report folds, WAPE, signed bias, % change vs a validated baseline, negative and positive examples, by scenario and horizon; use unobserved seeds for future prospective testing.
7. LEARN: record anomalies, corrective hypothesis, next evaluation and control ledger. Never claim autonomous learning or a persistent immutable ledger from a browser-side JSON file.

## Authority gates

- Technical integrity: full deterministic replay, chronological boundaries, no PII/credentials, complete store-level metrics, zero missing dates, 8+ nonoverlapping folds for selected horizon.
- Predictive efficacy: compare to **validation-selected** simple baseline, evaluate candidate on reserved holdout, and require strong evidence across independent seeds. Initial research thresholds: >=10% WAPE reduction on holdout; <=5% absolute signed bias; candidate improves validation; 2 of 3 seeds support candidate. These are **candidate screening**, not statistical proof of profit or model validity.
- Real merchant release gate: protected Shopify connection; financial reconciliation; separate real-store chronological holdout; error calibration; comparison to existing analytics; privacy/security and operations approval. Absent any gate, authority remains HOLD.

## Success / failure examples

- PASS-synthetic: repeated deterministic dataset, correct dates, consistent labeled forecasts, no data leakage, accurate metric calculations, all five operating conditions represented.
- HOLD: insufficient historical data, candidate fails in volatile scenario, no interval calibration or Shopify verification.
- FAIL: future actuals influence method selection, financial metric labeled reconciled without Shopify evidence, any customer identifier reaches public demo, forecast silently treated as approved, test outcomes revised after fact.

## Release management

Synthetic lab is browser-run; it does not write to Shopify, change merchant inventory, run recurring jobs, retain uploads, or hold access credentials. The production read-only Shopify bridge remains unchanged and separately secured. Developer proposals are code-reviewed and tested before merging, and the Render service uses manual deploys.
