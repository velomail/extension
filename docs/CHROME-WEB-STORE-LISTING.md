# Chrome Web Store listing – VeloMail

Use this when filling out the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) for VeloMail.

---

## Short description (max 132 characters)

```
See your email on a live mobile preview before you send. Pre-flight tips catch every issue in real time.
```

(Current length: ~103 characters.)

---

## Detailed description

Paste this into the "Detailed description" field on the store listing:

---

**VeloMail — Mobile Preview & Pre-flight Tips for Gmail and Outlook**

67% of sales emails are opened on a phone. VeloMail shows you exactly what your prospect sees — and flags every issue — before you hit send.

**How it works:**
Open Gmail or Outlook and start composing. VeloMail activates automatically. A live phone frame appears beside your draft and updates in real time as you type. When you're ready to send, three pre-flight tips confirm your email is optimized for mobile.

**Features:**

- **Live mobile preview** — A real phone frame renders your email as you type. No refresh, no delay. Toggle dark mode to see how it looks for the 80%+ of users who have it on.
- **Pre-flight tips** — Three weighted checks run before every send: subject length, CTA above the fold, and tap-friendly link spacing. Each turns green when your email passes.
- **Subject line counter** — A color-coded character counter appears inside the Gmail subject field: green (30–50 chars), amber (51–60), red (above 60). Never send a subject that gets cut off again.
- **Works where you write** — Gmail (mail.google.com) and Outlook Web (outlook.live.com, outlook.office.com, outlook.office365.com).
- **Zero setup** — Install once. VeloMail activates the moment you open a compose window.
- **Private by design** — All data is stored locally on your device using chrome.storage.local. No email content, no personal data, and nothing is ever transmitted to a server.

**Free plan:** 5 sends per day. Resets at midnight (your local time). No credit card required.
**Lifetime plan:** $49 one-time. Unlimited sends, Android preview, and priority support.

---

## Category

**Productivity**

---

## Tags / keywords

sales email, email preview, mobile email, Gmail extension, Outlook extension, cold email, email optimization, sales productivity

---

## Icons and images

- **Extension icon (store):** `assets/images/icon128.png` (128×128 — already in the zip)
- **Small promo tile:** 440×280 PNG — create a tile showing the VeloMail logo, name, and tagline
- **Screenshots (required):** At least 1 at **1280×800** or **640×400**
  - Capture Gmail with the mobile preview panel open and an email being composed
  - Capture the popup showing pre-flight tip states (pass/fail/pending)
  - Save to `assets/store/screenshot-1-1280x800.png`, `screenshot-2-1280x800.png`, etc.

**Capturing from mockups:** Open `assets/store/mockup-screenshot1.html` or `mockup-screenshot2.html` in a browser (they use 1280×800 viewport), then use your OS or browser screenshot tool to capture the full view; save as PNG and upload in the dashboard. For the promo tile, open `assets/store/mockup-promo-tile.html` and capture at 440×280. Screenshot PNGs are uploaded in the Developer Dashboard and do not need to be in the extension zip.

---

## Promo screenshot email copy (pasteable)

Use this subject and body in the Gmail compose when capturing store screenshots. It passes VeloMail’s pre-flight checks (subject front-loaded, CTA above fold, link tapability) so tips show green.

**Subject (paste into subject field):**

```
See your email on mobile before you send
```

**Body (paste into compose — Gmail will auto-link the URL):**

```
You're writing on desktop. They're reading on a phone.

VeloMail shows you exactly what they see — live, as you type in Gmail or Outlook. Pre-flight tips turn green when your subject, CTA, and link are mobile-ready.

One click to add it:

https://chrome.google.com/webstore

No setup. It activates the next time you compose.
```

---

## Privacy policy URL

After enabling GitHub Pages (see [DEPLOY.md](DEPLOY.md)), your privacy page is at:

```
https://velomail.github.io/extension/landing/privacy.html
```

Paste this URL into **Privacy practices → Privacy policy** in the Developer Dashboard.

---

## Permissions justification

The store will ask you to explain each permission. Use these:

| Permission | Justification |
|---|---|
| `storage` | Saves user settings and daily send count locally on the user's device. No data leaves the device. |
| `activeTab` | Detects when the user is in a Gmail or Outlook compose window so the preview and tips can be shown in context. |
| `notifications` | Used to show optional local in-app tips (e.g. first-use guidance). No external notifications are sent. |
| `alarms` | Used to schedule the daily usage counter reset at local midnight. |
| Host access (Gmail, Outlook) | Required to inject the mobile preview panel and subject counter into the Gmail and Outlook compose UI. No email content is read, stored, or transmitted. |

---

## Upgrade / paywall links

In-app upgrade CTAs (paywall sheet in the preview, upgrade modal, and popup "Upgrade" link) all open the extension website/landing page: **https://velomail.github.io/extension**. Set the store listing **Website** field to this URL so users who click "Upgrade" land on your pricing/signup page.

---

## How to build the zip for upload

1. From the project root, run:
   ```
   node scripts/package-for-store.js
   ```
   This produces **`velomail-chrome-web-store.zip`** (~93 KB) in the project root. Upload this file in the Developer Dashboard.

2. In the dashboard, fill in the fields using the content from this document.

---

## Pre-submission checklist

- [ ] `velomail-chrome-web-store.zip` generated and ready to upload
- [ ] Icons 16, 48, 128 present in the zip
- [ ] Short description ≤ 132 characters
- [ ] Detailed description pasted
- [ ] Category set to **Productivity**
- [x] At least one screenshot ready (1280×800 or 640×400) — `assets/store/screenshot-1-1280x800.png` (upload in dashboard)
- [ ] Privacy policy hosted at a public URL and entered in the dashboard
- [ ] Permissions justifications filled in for each permission
- [ ] Landing page live and linked from the store listing website field
