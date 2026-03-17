# Chrome Web Store listing – VeloMail

Use this when filling out the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) for VeloMail.

---

## Short description (max 132 characters)

```
67% of cold emails open on mobile. See yours on a live phone preview before you send — Gmail & Outlook.
```

(Current length: ~95 characters.)

---

## Detailed description

Paste this into the "Detailed description" field on the store listing:

---

67% of sales emails are opened on a phone. Most get deleted in 3 seconds. VeloMail shows you exactly what your prospect sees — and flags every reason they'd skip it — before you hit send. A live phone frame appears beside your Gmail or Outlook draft and updates as you type. Three pre-flight tips (subject length, CTA above fold, tap-friendly links) turn green when your email is mobile-ready. Built for SDRs and AEs who send dozens of cold emails a day.

**Features:**

- **Live mobile preview** — Real phone frame, updates as you type. Toggle dark mode (80%+ of users have it on).
- **Pre-flight tips** — Subject length, CTA above fold, link tap spacing. Green = ready to send.
- **Subject counter** — Color-coded in Gmail: green (30–50 chars), amber (51–60), red (60+). Never get cut off.
- **Zero setup** — Activates in Gmail and Outlook Web. No new tabs, no learning curve.
- **Private** — All data local. No email content transmitted.

**Pricing:** Free: 5 sends/day (resets at midnight). Lifetime: $29 one-time, unlimited sends.

---

## Category

**Productivity**

---

## SEO keywords (no separate field)

The Chrome Web Store dashboard has no Tags/Keywords field. These terms are already woven into the short and detailed descriptions above. For reference, the main search terms we target: sales email, cold email, mobile email preview, Gmail extension, Outlook extension, email optimization, sales productivity, outbound sales, SDR tools.

---

## Icons and images

- **Extension icon (store):** `assets/images/icon128.png` (128×128 — already in the zip)
- **Small promo tile:** 440×280 PNG — create a tile showing the VeloMail logo, name, and tagline
- **Marquee promo (optional):** 1400×560 PNG — for featured/editors' choice slots. Use `assets/store/mockup-marquee-promo.html`; open in browser and capture at 1400×560.
- **Screenshots (required):** At least 1 at **1280×800** or **640×400**
  - Capture Gmail with the mobile preview panel open and an email being composed
  - Capture the popup showing pre-flight tip states (pass/fail/pending)
  - Save to `assets/store/screenshot-1-1280x800.png`, `screenshot-2-1280x800.png`, etc.

**Capturing from mockups:** Open `assets/store/mockup-screenshot1.html` or `mockup-screenshot2.html` in a browser (1280×800), then capture the full view; save as PNG. For the small promo tile, open `assets/store/mockup-promo-tile.html` and capture at 440×280. For the marquee promo (optional), open `assets/store/mockup-marquee-promo.html` and capture at 1400×560. Screenshot PNGs are uploaded in the Developer Dashboard and do not need to be in the extension zip.

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

https://chromewebstore.google.com/detail/velomail/gifcnmheckieogmpnohkhajjhnelmico

No setup. It activates the next time you compose.
```

---

## Privacy policy URL

**Canonical domain:** Vercel. Your privacy page is at:

```
https://velomail.vercel.app/landing/privacy.html
```

Paste this URL into **Privacy practices → Privacy policy** in the Developer Dashboard.

---

## Permissions justification

The store will ask you to explain each permission. Use these:

| Permission | Justification |
|---|---|
| `storage` | Saves user settings and daily send count locally on the user's device. No data leaves the device. |
| `activeTab` | Detects when the user is in a Gmail or Outlook compose window so the preview and tips can be shown in context. |
| `alarms` | Used for the daily usage counter reset at local midnight and a lightweight keepalive so the limit is applied reliably. All alarm data stays on the device. |
| Host access (Gmail, Outlook) | Required to inject the mobile preview panel and subject counter into the Gmail and Outlook compose UI. No email content is read, stored, or transmitted. |
| `sidePanel` | Opens the VeloMail tips panel in Chrome's side panel when the user composes email. No data is collected. |

---

## Upgrade / paywall links

In-app upgrade CTAs (paywall sheet in the preview, upgrade modal, and popup "Upgrade" link) all open the extension website/landing page: **https://velomail.vercel.app**. Set the store listing **Website** field to this URL so users who click "Upgrade" land on your pricing/signup page.

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
