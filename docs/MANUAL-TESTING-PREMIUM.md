# VeloMail Premium/Lifetime — Manual Testing Guide

This document describes manual tests for the premium/lifetime functionality. These tests **require the extension to be loaded** in Chrome because they depend on `chrome.storage`, `chrome.runtime`, and other extension APIs.

---

## Prerequisites

1. **Load the extension unpacked**
   - Open `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `c:\Users\jesse\velomail` folder
   - Note the **Extension ID** (e.g. `abcdefghijklmnopqrstuvwxyz123456`)

2. **Open the side panel**
   - Click the VeloMail icon in the toolbar, or
   - Right-click the icon → "Open side panel"

---

## Test 1: Free Plan (Default)

**Expected:** Usage card shows "Free Plan", "0 / 5", progress bar, upgrade CTA, no Premium badge.

1. Ensure `isPaid` is not set (or is `false`):
   - Open DevTools on the popup (right-click popup → Inspect)
   - Console: `chrome.storage.sync.get(['isPaid'], r => console.log(r))`
   - If `isPaid: true`, run: `chrome.storage.sync.set({ isPaid: false })` and reopen the popup

2. Open the popup (side panel).

3. **Verify:**
   - Header: "VeloMail" (no "Premium" badge)
   - Usage card: "Free Plan" | "0 / 5"
   - Usage bar visible
   - "Resets at midnight" text
   - "Tired of daily limits? Get Lifetime Access ($29) →" link visible

---

## Test 2: Premium Plan (isPaid = true)

**Expected:** Usage card shows "Premium", "Unlimited", no bar, no upgrade CTA, Premium badge in header.

1. Set `isPaid` to `true`:
   - Open DevTools on the popup
   - Console: `chrome.storage.sync.set({ isPaid: true })`
   - Close and reopen the popup (or click elsewhere and back)

2. **Verify:**
   - Header: "VeloMail **Premium**" (green badge)
   - Usage card: "Premium" | "Unlimited"
   - Usage bar hidden
   - "Resets at midnight" hidden
   - Upgrade CTA hidden
   - Usage card has green tint (`.usage-card--premium`)

---

## Test 3: Post-Purchase Unlock Flow (End-to-End)

**Expected:** After completing a Stripe purchase and landing on the success page, `isPaid` is set and the popup reflects Premium.

1. Use the upgrade link in the popup to go to Stripe Checkout.
2. Complete a test purchase (Stripe test mode: `4242 4242 4242 4242`).
3. Stripe redirects to `https://velomail.vercel.app/landing/success.html?session_id=cs_xxx`
4. The content script `success-unlock.js` runs on that page and sends `VERIFY_AND_UNLOCK` to the background.
5. Background calls the API, verifies the session, and sets `chrome.storage.sync.set({ isPaid: true })`.
6. Open the popup — it should show Premium/Unlimited.

**Note:** This requires a working backend and Stripe test mode. If the API is not deployed, you can simulate by manually setting `isPaid` (Test 2).

---

## Test 4: Usage Limit Enforcement (Free Plan)

**Expected:** Free users are limited to 5 previews per day.

1. Set `isPaid: false` (or leave unset).
2. Open Gmail compose and trigger 5 previews (each "send" or equivalent action increments usage).
3. On the 6th attempt, the extension should block or warn (check `worker-simple.js` logic).
4. Verify usage count in popup: "5 / 5" and bar at 100%.

---

## Test 5: Usage Limit Bypass (Premium)

**Expected:** Premium users have no daily limit.

1. Set `isPaid: true`.
2. Trigger many previews — no blocking.
3. Popup shows "Unlimited".

---

## Test 6: Welcome Page

**Expected:** Welcome page loads and displays correctly when opened from the extension.

1. Navigate to `chrome-extension://[YOUR-EXTENSION-ID]/src/welcome/welcome.html`
2. Verify all 4 slides render, navigation works, "Open Gmail" button works.

---

## What Cannot Be Tested Without the Extension

| Item | Reason |
|------|--------|
| `chrome.storage.sync.get(['isPaid'])` | Extension API only |
| `chrome.runtime.sendMessage` / `connect` | Extension API only |
| Popup UI with real data | Depends on storage + service worker |
| Post-purchase unlock flow | Requires content script on success URL + background |
| Usage limit enforcement | Background worker logic |

---

## What Can Be Tested Without Loading the Extension

| Item | How |
|------|-----|
| HTML structure | Open `src/popup/index.html` in a browser (will error on scripts) |
| CSS styling | Inspect `style.css`; use mockup HTML files in `assets/store/` |
| Validate-for-store | `node scripts/validate-for-store.js` |
| Package zip | `npm run package-store` |
| Code logic review | Read `popup.js` `updateUsageStats()` |

---

## Premium Badge Logic (Reference)

From `src/popup/popup.js` `updateUsageStats()`:

```javascript
if (sync.isPaid === true) {
  usagePlanLabel.textContent = 'Premium';
  usageCount.textContent = 'Unlimited';
  usageBar.classList.add('hidden');
  usageReset.textContent = '';
  upgradeCta.classList.add('hidden');
  usageCard.classList.add('usage-card--premium');
  premiumBadge.classList.remove('hidden');
  return;
}
```

- `#premiumBadge` starts with class `hidden` in HTML.
- When `isPaid === true`, `hidden` is removed so "Premium" appears next to "VeloMail".
- When `isPaid` is false/undefined, `hidden` is added and the free-plan UI is shown.
