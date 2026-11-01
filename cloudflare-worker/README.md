# 🤖 Producto - Cloudflare Workers AI Setup Guide

This lightweight serverless worker provides **Meta Llama 3.1 8B** AI intelligence for Producto whenever you ask an open-ended or out-of-the-box question that falls outside the offline knowledge bank.

---

### 🚀 3-Minute Deployment (100% Free)

#### Method 1: Web Dashboard (No Terminal Required)
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com/) and create a free account (or log in).
2. In the left sidebar, click **Compute (Workers) > Workers & Pages**.
3. Click **Create application** > **Create Worker**.
4. Name your worker (e.g. `producto-ai`) and click **Deploy**.
5. Click **Edit code**.
6. Replace the existing code with the contents of [`worker.js`](worker.js).
7. In the top right, click **Save and deploy**.
8. Go back to your Worker's **Settings > Bindings**:
   - Click **Add** > **Workers AI**.
   - Variable name: `AI`.
   - Click **Save**.
9. Copy your Worker URL (e.g., `https://producto-ai.<your-subdomain>.workers.dev`).
10. In Productivity Meter, tap the **Settings ⚙️** icon in the Producto chat window, paste your URL, and click **Save**!

---

#### Method 2: Command Line (Wrangler CLI)
If you have Node.js installed:
```bash
cd cloudflare-worker
npx wrangler login
npx wrangler deploy
```

---

### 🔒 Privacy & Free Tier
- **Zero Cost**: Cloudflare gives you **10,000 free AI generations every single day**.
- **Privacy**: Raw study logs are never saved. Only the single question and high-level score numbers are used to formulate coaching advice.
- **Offline Resilience**: When your device is offline or in Airplane Mode, Producto automatically falls back to the 100% offline cognitive engine for all scoring, daily debriefs, and app questions.
