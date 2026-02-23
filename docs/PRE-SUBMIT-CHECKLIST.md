# Chrome Web Store pre-submit checklist

Use this before pushing to GitHub and before submitting to the Chrome Web Store.

---

## Manifest

- [ ] Version bumped if needed (e.g. in `manifest.json`)
- [ ] Name and description are clear; single purpose is obvious
- [ ] No remote code; CSP and Manifest V3 compliant (see [CHROME-STORE-SECURITY-AUDIT.md](CHROME-STORE-SECURITY-AUDIT.md))

---

## Icons

- [ ] `assets/images/icon16.png`, `icon48.png`, `icon128.png` exist and are referenced in manifest
- [ ] If missing, run: `node scripts/create-store-icons.js` (then replace with final artwork before publishing)

---

## Package

- [ ] Run: `node scripts/package-for-store.js` (from project root)
- [ ] Zip contains only `manifest.json`, `src/`, `assets/` (no `node_modules`, `.git`, `landing/`, `api/`, `docs/`, `scripts/`)
- [ ] Upload `velomail-chrome-web-store.zip` in the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)

---

## Permissions

- [ ] Copy the justification from [PERMISSIONS-JUSTIFICATION.txt](PERMISSIONS-JUSTIFICATION.txt) into the Developer Dashboard **"Justification for Permissions"** field

---

## Privacy

- [ ] Privacy policy is on your landing page at `landing/privacy.html` (linked in the landing footer)
- [ ] After deploying the landing, set the **Privacy policy URL** in the dashboard to your live URL, e.g. `https://yoursite.com/landing/privacy.html` or `https://yoursite.com/privacy.html` (depending on how you deploy)
- [ ] The content there matches [docs/PRIVACY-POLICY.md](PRIVACY-POLICY.md) (use that as the source for `landing/privacy.html` if you build the page from it)

---

## Store listing

- [ ] Short and detailed descriptions from [CHROME-WEB-STORE-LISTING.md](CHROME-WEB-STORE-LISTING.md)
- [ ] Category: **Productivity**
- [ ] At least one screenshot: **1280×800** or **640×400**
- [ ] Promo tile if required (see CHROME-WEB-STORE-LISTING)

---

## Testing

- [ ] Load unpacked in Chrome; test Gmail compose, popup tips, usage limit, "Start now" and upgrade link
- [ ] Popup shows "Composing" when a compose is open and "No Active Email" when none

---

## References

- [PERMISSIONS-JUSTIFICATION.txt](PERMISSIONS-JUSTIFICATION.txt) — copy-paste for Developer Dashboard
- [CHROME-STORE-SECURITY-AUDIT.md](CHROME-STORE-SECURITY-AUDIT.md) — permissions, remote code, paywall
- [CHROME-WEB-STORE-LISTING.md](CHROME-WEB-STORE-LISTING.md) — description, category, screenshots, privacy URL
- [DEPLOY.md](../DEPLOY.md) — packaging, icons, GitHub Pages, store URLs
