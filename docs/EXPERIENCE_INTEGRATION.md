# Customer experience setup

1. **Synthetic preview:** Open `/experience/`, click **Explore simulation**. Cards are labeled SYNTHETIC; only backed values appear. A fresh `F2.makeDemo()` provides the aggregate data.
2. **Local CSV:** Import only approved daily aggregate `date,net_sales,orders` data. The parser rejects customer or order-level columns. Data never leaves the browser when this import path is used.
3. **Private snapshot:** On the protected Render service, click **Private source** and supply `F2_DASHBOARD_KEY` once per browser tab. The existing `/api/snapshot` supplies subtotal-proxy and aggregate order signals; missing customer/inventory modules remain hidden and forecast authority stays HOLD.
4. **ChatGPT** *(optional; not automatically connected)*: after a security/privacy review and explicit merchant approval for sending aggregate data to OpenAI, configure `OPENAI_API_KEY`, `F2_ASSISTANT_ENABLED=true`, and `F2_AI_DATA_SHARING_APPROVED=true` in **private Render environment settings** only. Keep keys out of GitHub, screenshots, and chat. Model is configured with `OPENAI_MODEL` (defaults to `gpt-4.1-mini`). Disable any of these toggles to deactivate it.
5. **Customization:** Open Customize in Your signal stream. Toggle supported source-backed cards and arrange your quick scan by selecting the desired ones; settings store only module IDs on-device.
6. **Adaptation governance:** Download a session audit; `adaptive-proposal` is a research suggestion requiring prospective comparison and accountable approval. Do not interpret a local session audit as persistent, tamper-proof logging.

The page and the UI assets can be served unchanged from GitHub Pages, but GitHub Pages cannot execute the secure backend or optional ChatGPT requests. ChatGPT must be activated on the private Render server; otherwise the locally backed “Ask your business data” experience is available.
