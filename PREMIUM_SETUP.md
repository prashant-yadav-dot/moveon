# MoveOn ₹49/month Premium Setup

This build adds a Premium subscription layer to the existing MoveOn Firebase + Cloudflare Worker structure.

## What was added

- `Moveon/premium.html` — ₹49/month Premium page and Razorpay Checkout.
- `Moveon/premium.js` — reads the user's Premium status from Firebase.
- `profile.html` — Premium status card/link.
- `ex-roleplay.html` — protected as a Premium feature.
- `worker.js` — subscription creation, server-side subscription confirmation, and webhook handling.
- Premium status is written by the Worker, not by the browser.

## Razorpay setup

Razorpay supports recurring subscriptions. Create a **monthly ₹49 plan** in Razorpay Dashboard and copy its Plan ID.

For testing, use Razorpay Test Mode first. Do not put the Razorpay API secret in HTML/JavaScript.

## Cloudflare Worker secrets

Add these Worker secrets:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_PLAN_ID` — your ₹49/month plan ID, e.g. `plan_xxxxx`
- `RAZORPAY_WEBHOOK_SECRET`
- `FIREBASE_WEB_API_KEY` — the same Firebase Web API key already present in `firebase-config.js`
- `FIREBASE_DB_SECRET` — a server-only credential that allows the Worker to write verified Premium records to Realtime Database.

The Worker never sends `RAZORPAY_KEY_SECRET` to the browser.

## Razorpay webhook

After deploying the Worker, configure a Razorpay webhook pointing to:

`https://YOUR-MOVEON-DOMAIN/api/premium/webhook`

Use the same `RAZORPAY_WEBHOOK_SECRET` in Cloudflare.

Enable subscription lifecycle events such as:

- `subscription.activated`
- `subscription.charged`
- `subscription.pending`
- `subscription.halted`
- `subscription.cancelled`
- `subscription.completed`

Webhooks are important because recurring billing can change after the initial checkout.

## Firebase database shape

The Worker writes:

`users/{firebaseUid}/premium`

Example:

```json
{
  "active": true,
  "plan": "moveon_premium_49",
  "subscriptionId": "sub_xxxxx",
  "paymentId": "pay_xxxxx",
  "expiresAt": 1790000000000,
  "updatedAt": 1790000000000
}
```

Keep client-side writes to this `premium` node disabled in your Realtime Database rules. Only the server/Worker should update it.

## Important

The ZIP is code-ready, but **real payment activation cannot happen until the Razorpay account, ₹49 monthly plan, API credentials, webhook secret, and server-only Firebase DB credential are configured**.

Test with Razorpay Test Mode before switching to Live Mode.
