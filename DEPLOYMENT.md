# Deploying Northstar School Management System to Vercel (Neon PostgreSQL)

This repository contains a full-stack Node.js + Express + tRPC + React 19 application backed by **Neon PostgreSQL** and Resend email credential delivery.

## Step 1: Push to GitHub

1. Ensure your changes are committed:
   ```bash
   git status
   ```
2. Push to your private repository on GitHub:
   ```bash
   git push origin main
   ```

---

## Step 2: Configure Environment Variables on Vercel

When importing the project in Vercel, configure the following environment variables under **Project Settings > Environment Variables**:

| Variable Name | Description | Example / Note |
| :--- | :--- | :--- |
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgres://user:pass@ep-example.region.aws.neon.tech/dbname?sslmode=require` |
| `JWT_SECRET` | Secret used for signing session cookies | Random secure string |
| `RESEND_API_KEY` | Resend API key for automatic credential delivery | `re_123456789...` |
| `EMAIL_FROM` | Verified sender address for credentials | `noreply@yourdomain.com` |
| `VITE_APP_ID` | OAuth app ID | Provided by system or configuration |
| `OAUTH_SERVER_URL` | OAuth gateway URL | Provided by system |

---

## Step 3: Build Settings on Vercel

- **Framework Preset:** Vite
- **Build Command:** `pnpm build`
- **Output Directory:** `dist/public`
- **Install Command:** `pnpm install`
