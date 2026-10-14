# LIBERIENT Experience 2.0 — Connected, adaptive customer dashboard

Status: **DEVELOPMENT / SYNTHETIC**, no commercial model promotion, no installed Shopify app, no OAuth. Decision authority **HOLD**. Replaces neither F2 Core forecasting methods nor the internal **Learning Lab** evaluation designation.

## Product contract

- **Branding:** Sidebar only: `F2 Commerce · POWERED BY LIBERIENT`. Other UI sections never duplicate sponsorship copy. *Learning Lab* remains the internal verification/evaluation system name; **LIBERIENT** is the customer-facing framework name.
- **Priority:** An owner should identify the trend, source provenance, risk, and next step in seconds. A visible cosmic eclipse is a **conceptual astronomical illustration**, not an actual live prediction from F2. It must not be represented as verified scientific forecast data.
- **Customer view:** Overview carousel with one partially visible following card; configurable horizontal signal stream; single instant-answers form. Responsive iPhone browser layout; no static promotional phone mockup. No misleading live notifications, scores, inventory, or customer metrics.
- **Source gating:** The module catalog is declarative. The controller resolves each module's named feature requirements against a verified per-session data adapter. No source means no business cards or question control. Synthetic/demo source counts as an *active synthetic source*, not live merchant data. Imported CSV and authorized private aggregate snapshot use explicitly different provenance labels. If the source lacks actual verified inventory/customer/refund fields, corresponding modules are not rendered and cannot be enabled in customization settings.
- **Forecasts:** 7/30-day forecasts appear only if the actual analysis object contains the horizon's point forecast and there is at least 120 days of valid observations. Label **exploratory / HOLD**; do not promote weights or methods. A forecast should never imply inventory quantities, customer segmentation, or causal promotional attribution.
- **Trend inflections:** A luminous point is placed only when the completed most-recent and preceding seven-observation windows differ by >=12%. It is a descriptive change marker, not a claim of statistically validated structural break. The graph's earlier/later colors signal the latest-window boundary; no invented data.
- **Streaming tracker:** One UI component can stream real authenticated snapshots when authorized, polling at most once per 60 seconds while the tab is visible. For synthetic or imported history it is a labeled snapshot, not a live stream. Tracker preferences are module IDs only, stored in browser localStorage; business metrics and keys are not persisted.
- **Event/audit bus:** Connection, module navigation, carousel selection, user customization, assistant questions (not prompt text) and adaptive research proposals create timestamped bounded session events. An adaptive proposal **never applies** a predictive code or weight change; verified changes require prospective out-of-sample tests and approval under Learning Lab rules. Export is a voluntary local snapshot, **not an immutable production audit**. No app analytics pipeline or customer behavior tracking is set up.

## Private connection and ChatGPT

- Demo and imported daily CSV are handled locally in the browser. Raw CSV data must never be transmitted to the application server. The existing CSV parser forbids personal/order-level columns. Current merchant data is accessible only from `/api/snapshot` with the server-only existing private dashboard key.
- `/experience/` is a **public, unprivileged shell**. The server sends no private data until the user supplies their own key in this browser tab. The key is not stored in browser storage or embedded in page source. A protected snapshot can refresh in the background at most once per minute, never by leaking tokens in URLs.
- ChatGPT is an **optional server-side integration**, disabled unless `F2_ASSISTANT_ENABLED=true`, `F2_AI_DATA_SHARING_APPROVED=true`, and a private `OPENAI_API_KEY` is provided. The user's explicit prior approval for external data processing must be recorded before enabling; no automatic activation by a plugin connection. The public UI only labels it “Ask ChatGPT” when the connection is configured **and** private dashboard authentication succeeds.
- ChatGPT POST `/api/assistant` is read-only, bearer-protected, hard-capped in input size, call frequency, and output length. It passes only date bounds and aggregate source totals, without customer names, IDs, or order records, and requests `store:false`; never forwards raw Shopify responses or credentials. A refusal or unavailability falls back to clearly marked local snapshot insights, **not a simulated ChatGPT response**. No unauthorized business actions or production model changes.
- Local instant answers are deterministic calculations on the connected data and clearly explain missing inventory/customer fields. They do not train the model, and ChatGPT replies cannot directly modify state.

## Release & tests

`node --test tests/test_experience.js server/test/experience.test.js` plus existing repository CI. Functional UI validation should cover Chrome/Safari desktop and iPhone screen widths, including keyboard carousel navigation and empty-source behavior.

## Deliberate non-goals

- This release does not autonomously rewrite model algorithms, unlock LIVE merchant forecasting, create true intraday streaming without a source, or add paid API credits.
- There is no permanent multi-user authentication, consent/audit log or security-reviewed merchant production deployment. Production deployment still requires service-level tenancy, consent review, durable audit records, financial reconciliation and independent forecasting calibration.
