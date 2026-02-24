# Chrome Web Store submission review packet

Use this document together with **velomail-chrome-web-store.zip** when doing a final approval pass (e.g. with a Chrome Web Store expert or before upload).

---

## Submission artifact

- **File:** `velomail-chrome-web-store.zip`
- **How to create:** From project root run:
  ```bash
  npm run package-store
  ```
  Or validate then package in one step:
  ```bash
  npm run store-release
  ```

---

## Contents of the zip

The zip contains **only**:

- `manifest.json`
- `src/` (all extension code)
- `assets/` (icons and other assets)

It does **not** include: landing site, api, docs, scripts, node_modules, or .git. There is no remote code; all scripts are bundled in the extension.

---

## Manifest and permissions

- **Manifest version:** 3 (required by the store).
- **Permissions and host_permissions:** Scoped to Gmail and Outlook mail URLs plus the extension’s landing/API domains. No `<all_urls>`, no broad host access.
- **Full audit:** See [CHROME-STORE-SECURITY-AUDIT.md](CHROME-STORE-SECURITY-AUDIT.md) for permissions, remote-code check, and paywall behavior.

---

## Permission justification (Developer Dashboard)

Copy-paste text for the **“Justification for Permissions”** field in the Chrome Web Store Developer Dashboard is in:

**[PERMISSIONS-JUSTIFICATION.txt](PERMISSIONS-JUSTIFICATION.txt)**

---

## Privacy

- **Policy page:** `landing/privacy.html` (on your deployed site).
- **URL to set in dashboard:** After deploying (e.g. GitHub Pages), set **Privacy practices → Privacy policy** to your live URL. Example: `https://velomail.github.io/extension/landing/privacy.html` (see [DEPLOY.md](../DEPLOY.md)).

---

## Pre-submit checklist

Full step-by-step checklist before submit:

**[PRE-SUBMIT-CHECKLIST.md](PRE-SUBMIT-CHECKLIST.md)**

Covers: manifest version and clarity, icons, package contents, permissions justification, privacy URL, store listing (description, category, screenshots), and manual testing.

---

## Reviewer checklist (short)

When reviewing the zip and this repo for store approval, confirm:

1. **Zip contents** — Only `manifest.json`, `src/`, and `assets/`. No node_modules, landing, docs, or scripts.
2. **No remote code** — No `eval()` or `new Function()` in extension code; no scripts loaded from external URLs. (Validated by `scripts/validate-for-store.js`.)
3. **Permissions** — Narrow and justified; justification text is in PERMISSIONS-JUSTIFICATION.txt and matches manifest.
4. **Paywall** — Upgrade/purchase flow uses `chrome.tabs.create` (no blocking popups or deceptive redirects).
5. **Privacy** — Privacy policy URL is set in the Developer Dashboard and points to the live policy page.

---

## References

| Doc | Purpose |
|-----|--------|
| [CHROME-STORE-SECURITY-AUDIT.md](CHROME-STORE-SECURITY-AUDIT.md) | Permissions, remote code, paywall, MV3 |
| [PERMISSIONS-JUSTIFICATION.txt](PERMISSIONS-JUSTIFICATION.txt) | Copy-paste for dashboard |
| [PRE-SUBMIT-CHECKLIST.md](PRE-SUBMIT-CHECKLIST.md) | Full pre-submit steps |
| [CHROME-WEB-STORE-LISTING.md](CHROME-WEB-STORE-LISTING.md) | Description, category, screenshots |
| [DEPLOY.md](../DEPLOY.md) | Packaging, icons, store URLs |
