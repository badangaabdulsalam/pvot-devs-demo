# Pivot Devs Demo Deployment Guide

This project is ready to go live.

## Best Zero-Cost Option

Use **Render Free Web Service** + a scheduled keep-awake ping.

Why this is the best no-money setup:
- Free hosting for your Node server.
- HTTPS included.
- Works with the current start command and health endpoint.
- Keep-awake workflow pings `/api/health` every 10 minutes.

Important free-tier caveat:
- Free instances can still sleep occasionally (for example, platform maintenance or delayed scheduler runs).
- This app stores orders in local JSON files, so data may reset after redeploy/restart.
- For permanent order history, move storage to a managed database later.

## 1) Preflight Checks

Run these before every deployment:

- npm install
- npm run audit

The audit verifies:
- storefront shell endpoints
- API health and catalog endpoint
- every product image and fallback image URL
- orders list endpoint availability

## 2) Local Production Run

- npm run start:prod

Open:
- http://localhost:3000/

## 3) Go Live On Render (Free)

1. Push this folder to a GitHub repository.
2. In Render, click **New +** -> **Blueprint**.
3. Select your repository.
4. Render will auto-read `render.yaml` from this project and prefill settings.
5. Click **Apply** to deploy.
6. Wait for build and open the generated `onrender.com` URL.

If Blueprint is unavailable, create **Web Service** manually:
- Runtime: Node
- Plan: Free
- Build Command: npm install
- Start Command: npm run start:prod
- Health Check Path: /api/health

## 4) Keep The Free Service Warm

This repository includes a GitHub Actions workflow at `.github/workflows/keep-alive.yml`.

- It sends a ping to `/api/health` every 10 minutes.
- Keep Actions enabled for this repository.
- If your Render URL changes, update the URL inside that workflow file.

## 5) Deploy Option B: Docker Anywhere

Build image:

- docker build -t pivot-devs-demo .

Run container:

- docker run -p 3000:3000 -e PORT=3000 pivot-devs-demo

## 6) Go-Live Checklist

- Confirm homepage, catalog, cart, and order tracking work on desktop and mobile.
- Confirm /api/health returns ok=true.
- Confirm /api/products returns expected count and categories.
- Confirm all image URLs resolve (npm run audit).
- Point your custom domain to hosting provider.
- Enable HTTPS in hosting dashboard.
- Re-run npm run audit after every deployment.

## 7) Optional Hardening for Public Traffic

- Put the app behind a CDN/proxy (Cloudflare).
- Add automated uptime checks on /api/health.
- Back up data/products.json and data/orders.json daily.
- Add basic request rate limiting before heavy public promotion.

## 8) Next Upgrade (Still Low Cost)

When you want better reliability without changing frontend behavior:
- Move orders/products from JSON files to a hosted DB (Postgres/Supabase).
- Keep Render free/cheap app hosting and preserve order history permanently.
