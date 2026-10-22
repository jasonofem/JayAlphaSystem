# ⚡ JAY ALPHA SYSTEM — Quantitative 2.00+ Odds Engine (SportyBet Calibrated)

Real-life **Football + WTA/ATP Tennis** quantitative `2.00+` odds builder calibrated specifically for **SportyBet Nigeria** with **Neon Serverless Postgres** persistence and **Vercel** zero-config serverless deployment.
- **Zero Virtuals**
- **Zero Basketball (Hard-Blocked)**
- **Built-in Live ESPN + DraftKings + WTA/ATP Feed + Plug-and-Play The Odds API v4 Key Vault**

---

## 🚀 How to Push to GitHub via Windows `cmd` & Deploy to Vercel + Neon DB

### Step 1: Unzip the Downloaded Archive
1. Download `jay-alpha-system-vercel.zip` from Arena.
2. Extract it to a folder on your PC, for example: `C:\Users\YOUR_NAME\Desktop\jay-alpha-system`

### Step 2: Create an Empty Repository on GitHub
1. Go to [https://github.com/new](https://github.com/new)
2. Repository name: `jay-alpha-system`
3. Leave **"Add a README file"** UNCHECKED, then click **Create repository**.

### Step 3: Run These Commands in Windows `cmd`
Open **Command Prompt (`cmd`)** and run:

```cmd
cd C:\Users\YOUR_NAME\Desktop\jay-alpha-system
git init
git add .
git commit -m "Launch Jay Alpha System 2.00+ SportyBet Engine"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/jay-alpha-system.git
git push -u origin main
```

### Step 4: Deploy on Vercel & Connect Neon Postgres
1. Go to [https://vercel.com/new](https://vercel.com/new) and click **Import** next to your `jay-alpha-system` GitHub repository.
2. Click **Deploy** (Vercel automatically detects `vercel.json`, `api/feed.js`, `api/db.js`, and `public/index.html`).
3. **To connect Neon Database**:
   - In your Vercel project dashboard, go to the **Storage** tab → click **Connect Store** → select **Neon Postgres** (or create a free project at [https://neon.tech](https://neon.tech) and copy your `DATABASE_URL` connection string into Vercel **Settings → Environment Variables** as `DATABASE_URL`).
   - Redeploy once — `/api/db` will automatically create the `user_settings` table on your very first visit and sync your API keys and 7-Day Profit Ledger to Neon Postgres!
