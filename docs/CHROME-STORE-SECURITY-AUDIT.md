# Chrome Web Store Security & Policy Audit

Audit date: Feb 22, 2026. Covers Manifest V3 review risk, remote-code policy, and paywall UI.

---

## 1. Manifest V3 & Review Risk Audit

### Permissions that can trigger long manual review

| Permission / pattern | In your manifest? | Risk |
|----------------------|-------------------|------|
| `<all_urls>` | **No** | N/A – you use specific host patterns only. |
| `scripting` | **No** | N/A – no scripting permission. |
| Broad host_permissions | **No** | Your `host_permissions` are scoped to Gmail and Outlook only. |

**Verdict:** Your permissions are **low risk**. You use:

- `storage`, `activeTab`, `notifications`, `alarms` (no special justification needed for typical use).
- `host_permissions`: `https://mail.google.com/*`, `https://outlook.live.com/*`, `https://outlook.office365.com/*`, `https://outlook.office.com/*` – all narrowly scoped to mail UIs where the extension runs.

No `webRequest`, `debugger`, or `<all_urls>` – this helps avoid long manual review.

### webRequest vs declarativeNetRequest

- **webRequest:** Not used. No migration needed.
- **declarativeNetRequest:** Not used. You don’t need it unless you add blocking/redirect rules.

### Icons and service worker (Manifest V3)

- **Service worker path:** Correct.  
  `"background": { "service_worker": "src/background/worker-simple.js" }` – single file, no `type: "module"` unless you need it.
- **Icons:** Manifest references:
  - `assets/images/icon16.png`
  - `assets/images/icon48.png`
  - `assets/images/icon128.png`  
  **Action required:** Ensure these files exist in the package. If they are missing, run `node scripts/create-store-icons.js` to generate placeholder PNGs in `assets/images/`, then replace with final artwork before publishing. Missing icons will cause validation failure and store rejection.

**Summary (Manifest):** Permissions and structure are MV3-friendly and review-friendly. Fix icon paths/files before submission.

---

## 2. “Remote Code” Policy Check (2026 No Remote Code)

### Scanned for

- `eval()`, `new Function()` – **None found.**
- Scripts loaded from external URLs (CDN, unpkg, jsdelivr, googleapis, etc.) – **None found.**

### Script injection in content script

- **Location:** `src/content/content.js` (two places) injects a script via:
  - `script.src = chrome.runtime.getURL('src/lib/first-compose-guide.js');`
- **Compliance:** This is **allowed**. The URL is from the extension package (`chrome.runtime.getURL` → extension origin), not a remote server. The injected file is listed in `web_accessible_resources` in the manifest, which is correct.

### External URLs in the project

- `https://buy.stripe.com/...` – used for **navigation** (upgrade/purchase) when user clicks Upgrade. OK.
- `https://velomail.github.io/extension` – used in welcome/help for **navigation** (landing, support). OK.
- `https://mail.google.com` and Outlook URLs – host patterns and links only. OK.
- Landing page links (Chrome Web Store, Stripe, etc.) – normal links, not script sources. OK.

**Summary (Remote code):** No remote code; no `eval`/`new Function`; only extension-bundled script injection. Compliant with a strict “no remote code” policy.

---

## 3. Paywall UI Check

### 5-per-day limit and redirect behavior

- **Limit:** Enforced in the service worker (`worker-simple.js`): `DAILY_LIMIT = 5` (resets at local midnight). Popup and content script use the same limit from storage/worker.
- **When the user hits the limit:**  
  - In content (Gmail/Outlook): Paywall sheet and upgrade modal show; “Upgrade” now triggers a message to the background, which opens the purchase page with **`chrome.tabs.create`** (no `window.open` from content, no blocking UI).
  - In popup: “Upgrade →” uses **`chrome.tabs.create`** and then `window.close()`, so the redirect does not block the browser UI.

### Changes made for store policy

- **Content script (paywall sheet + upgrade modal):** “Upgrade” sends `OPEN_UPGRADE_URL` to the background; the service worker calls `chrome.tabs.create({ url: 'https://buy.stripe.com/...' })`. This avoids popup-blocking and keeps behavior consistent and non-malicious.
- **Popup:** Upgrade CTA click is handled in JS: `e.preventDefault()` and `chrome.tabs.create({ url: UPGRADE_URL })` then `window.close()`.

Result: Redirect to the upgrade/purchase page at the daily limit is done via **`chrome.tabs.create`** and does not block the browser UI in a way that looks like malware.

---

## 4. Justification for Permissions (Developer Dashboard)

Copy this into the “Justification for Permissions” (or equivalent) field in the Chrome Web Store Developer Dashboard:

---

**Justification for Permissions**

VeloMail needs **storage** to remember the user’s daily preview count (5 free sends per day, resets at midnight), settings, and onboarding state. **activeTab** is used so the extension can run only when the user is on Gmail or Outlook. **Host access** to `mail.google.com` and Outlook URLs is required to inject the mobile preview UI and read compose content only on those tabs. **notifications** and **alarms** are used for daily limit reset. **webNavigation** and **tabs** are used to detect the compose frame and show the correct state in the extension popup. No email content or personal data is sent to external servers; the user is only taken to the purchase/landing page when they explicitly click Upgrade.

---

**Final audit (post–logo revert):** Manifest MV3 and permissions verified; no remote code (no eval/new Function, no external script URLs); paywall uses `OPEN_UPGRADE_URL` and `chrome.tabs.create`; `assets/images/icon16.png`, `icon48.png`, `icon128.png` present. **Approved** for store submission.

End of audit.
