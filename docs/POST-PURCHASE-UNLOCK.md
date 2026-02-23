# Post-purchase unlock (isPaid)

After a user pays for lifetime access, the extension sets `chrome.storage.sync.set({ isPaid: true })` so they have no usage limits. Option A (success page + backend verification) is implemented below.

---

## Implementation status (Option A)

| Piece | Status |
|-------|--------|
| **Landing (GitHub)** | Repo is hosted on GitHub; **GitHub Pages** serves the site. Success page: `landing/success.html` (thank-you page; extension updates status text). |
| **Content script** | `src/content/success-unlock.js` — runs on success URL, reads `session_id`, sends `VERIFY_AND_UNLOCK` to background. |
| **Background** | `src/background/worker-simple.js` — handles `VERIFY_AND_UNLOCK`, calls Vercel API, sets `isPaid: true` on success. |
| **Manifest** | Content script and host_permissions for `velomail.github.io/extension/landing/success.html*` and `velomail-api.vercel.app`. |
| **API (Vercel)** | `api/verify-session.js` — serverless function in this repo; retrieves Stripe Checkout Session, returns `{ ok: true }` if paid. |

**To finish and go live:**

1. **Landing (GitHub)**  
   - Push this repo to GitHub and enable **GitHub Pages** (Settings → Pages → deploy from branch). The success page will be at `https://<username>.github.io/<repo>/landing/success.html`. If your URL is not `velomail.github.io/extension`, update the content_script `matches` and success URL in Stripe to match.

2. **Deploy the API (Vercel)**  
   - Connect **this same repo** to [Vercel](https://vercel.com) and deploy (Vercel will build and serve the `api/` folder as serverless functions).  
   - In Vercel: **Project → Settings → Environment Variables** add `STRIPE_SECRET_KEY` (your Stripe secret key, e.g. `sk_live_...`).  
   - Your API URL will be `https://<your-vercel-project>.vercel.app/api/verify-session`. If the project name is not `velomail-api`, update the `apiBase` constant in `src/background/worker-simple.js` (VERIFY_AND_UNLOCK handler) and the matching origin in `manifest.json` host_permissions, then repackage the extension.

3. **Stripe success URL**  
   - In Stripe: Payment link or Checkout **Success URL** =  
     `https://velomail.github.io/extension/landing/success.html?session_id={CHECKOUT_SESSION_ID}`  
   - (Use your real GitHub Pages URL if different.) After payment, Stripe redirects to the success page; the extension verifies the session with the Vercel API and unlocks.

---

## Option A: Success page + backend verification (recommended)

**1. Landing — success page**

- **File:** `landing/success.html`
- **URL:** `https://velomail.github.io/extension/landing/success.html?session_id=CHECKOUT_SESSION_ID`
- **Role:** Static thank-you page. Stripe redirects here after checkout (set in Stripe Dashboard → Product / Payment link → Success URL with `{CHECKOUT_SESSION_ID}`).
- **Content:** “Thank you for your purchase. Unlocking VeloMail…” and a short note that they can close the tab once the extension shows “Lifetime — Unlimited”.

**2. Extension — run on success page and set isPaid**

- **Manifest** ([manifest.json](manifest.json)):
  - Add a **content script** that runs only on the success page, e.g.:
    - `"matches": ["https://velomail.github.io/extension/landing/success.html*"]`
    - `"js": ["src/content/success-unlock.js"]`
  - Add **host_permissions** for:
    - `https://velomail.github.io/extension/*` (so the content script can run on the success page)
    - Your backend API origin (e.g. `https://your-api.netlify.app/*` or similar) so the service worker can call the verify endpoint.
- **New file:** `src/content/success-unlock.js`
  - On load, read `session_id` from the page URL (e.g. `new URL(window.location.href).searchParams.get('session_id')`).
  - Send a message to the background, e.g. `chrome.runtime.sendMessage({ type: 'VERIFY_AND_UNLOCK', sessionId })`.
- **Background** ([src/background/worker-simple.js](src/background/worker-simple.js)):
  - Handle `VERIFY_AND_UNLOCK`: call your backend with the `session_id`; if the response is success, run `chrome.storage.sync.set({ isPaid: true })` and optionally send a response back so the success page can show “Unlocked!”.

**3. Backend — verify Stripe session**

- **Where:** One serverless function (e.g. Netlify Function, Vercel Serverless, or Cloudflare Worker).
- **Endpoint:** e.g. `GET /api/verify-session?session_id=cs_xxx` or `POST /api/verify-session` with body `{ "session_id": "cs_xxx" }`.
- **Logic:** Use the Stripe SDK to retrieve the Checkout Session by ID; if `payment_status === 'paid'` (and optionally `status === 'complete'`), return `{ "ok": true }`; otherwise 400/403.
- **Why:** So only real Stripe payments unlock the extension; random visits to `success.html` do not.

**Flow:** User pays → Stripe redirects to `success.html?session_id=cs_xxx` → extension content script on that page sends `session_id` to background → background calls backend → backend verifies with Stripe → if ok, background sets `isPaid: true` → user has lifetime (no limits) in the extension.

---

## Option B: Success page only (no backend)

- **Where:** Same `landing/success.html` and same extension content script + background handler.
- **Difference:** No backend. Background does **not** verify the session; when the content script runs on the success page URL, it sends a message and the background sets `isPaid: true` as soon as it sees that page (e.g. only when the path is `landing/success.html` and there is a `session_id` query param).
- **Tradeoff:** Anyone who opens `https://velomail.github.io/extension/landing/success.html?session_id=anything` could unlock. So this is only acceptable if you treat the success URL as a “secret” (weak) or you add a later step (e.g. license key) and use the success page only as UX.

---

## Option C: Unlock from inside the extension only (license key)

- **Where:** Popup or options page.
- **New UI:** e.g. “Already purchased? Enter your license key” and an input + “Unlock” button.
- **Flow:** User pastes a key (you generate keys per purchase, e.g. in Stripe webhook or manually). Extension sends the key to a small backend; if valid, backend returns success and extension sets `isPaid: true`. No content script on the success page needed; Stripe can redirect to a simple “Check your email for your license key” page.
- **Backend:** One endpoint that checks the key (e.g. in a DB or serverless KV) and returns ok.

---

## Summary

| Piece | Where |
|-------|--------|
| **Success page** | `landing/success.html` (static, on GitHub Pages). |
| **Extension logic** | New content script `src/content/success-unlock.js` (runs only on success page) + new message handler in `src/background/worker-simple.js` for `VERIFY_AND_UNLOCK` and `chrome.storage.sync.set({ isPaid: true })`. |
| **Manifest** | Extra content_script match for success URL + host_permissions for that origin and your API. |
| **Backend (Option A)** | One serverless function that verifies Stripe Checkout Session and returns `{ ok: true }`. |

Recommended: **Option A** (success page + backend verification) so only real Stripe payments unlock and the experience is automatic (redirect → unlock) without license keys.
