# VeloMail — What’s Done and Working (Checklist)

Everything below is implemented and working in the codebase. Use this as a single source of truth for what’s complete.

---

## 1. Extension core

### 1.1 Manifest & config
- [x] **Manifest V3** — `manifest.json` uses `manifest_version: 3`
- [x] **Name & version** — VeloMail, v1.0.1
- [x] **Description** — Store-ready short description
- [x] **Icons** — 16, 48, 128 px paths declared (`assets/images/icon16.png`, etc.)
- [x] **Action** — Toolbar icon + popup `src/popup/index.html`
- [x] **Service worker** — `src/background/worker-simple.js` (no remote code)
- [x] **Content scripts** — Single script + CSS on Gmail and Outlook host patterns
- [x] **Permissions** — `storage`, `activeTab`, `notifications`, `alarms`
- [x] **Host permissions** — Gmail + Outlook (live, office365, office.com)
- [x] **Web accessible resources** — `assets/images/*.png`, `src/lib/first-compose-guide.js`
- [x] **Content Security Policy** — `script-src 'self'; object-src 'self'` on extension pages
- [x] **Minimum Chrome version** — 88
- [x] **Keyboard command** — `toggle-preview` declared in manifest (Ctrl+Shift+M / Command+Shift+M)
- [x] **Keyboard shortcut wired** — Service worker listens for command and sends `TOGGLE_PREVIEW` to active Gmail/Outlook tab; content script calls `toggleCollapse()`. Collapse/expand also via UI button and collapsed logo

### 1.2 Supported surfaces
- [x] **Gmail** — `https://mail.google.com/*`
- [x] **Outlook** — `outlook.live.com`, `outlook.office365.com`, `outlook.office.com`

---

## 2. Background (service worker)

### 2.1 Lifecycle & state
- [x] **onInstalled** — Sets install date, version, first-time flag, `emailsComposed: 0`, default settings
- [x] **First install** — Opens welcome tab (`src/welcome/welcome.html`)
- [x] **In-memory state** — `currentEmailState` (html, text, subject, counts, environment, url, mobileScore, preflightChecks, timestamp)
- [x] **Popup ports** — Set of long-lived `popup-realtime` ports for real-time updates

### 2.2 Messaging (content → worker)
- [x] **CHECK_USAGE_LIMIT** — Returns allowed, remaining, limit, isApproachingLimit
- [x] **TRACK_PREVIEW_USAGE** / **TRACK_GREEN_CHECK** — Returns current usage snapshot (no increment)
- [x] **ERROR_LOGGED** — Logs error, responds success
- [x] **EMAIL_CONTENT_UPDATED** — Updates state, badge (traffic light or score), broadcasts to popups
- [x] **COMPOSE_OPENED** — Sets active, environment, url; broadcasts to popups
- [x] **COMPOSE_CLOSED** — Sets inactive, badge idle; broadcasts
- [x] **EMAIL_SENT** — Increments `monthlyUsage[currentMonth].previews`, clears state, clears badge, broadcasts EMAIL_SENT

### 2.3 Messaging (popup → worker)
- [x] **GET_CURRENT_EMAIL_STATE** — Returns current in-memory state
- [x] **SETTINGS_UPDATED** — Broadcasts to all Gmail/Outlook tabs via `chrome.tabs.sendMessage`
- [x] **MILESTONE_ACHIEVED** — Acknowledged
- [x] **PING** — Returns PONG + timestamp

### 2.4 Usage & limits
- [x] **Free limit** — 15 sends per month (`FREE_CHECKS_LIMIT`)
- [x] **checkUsageLimit()** — Reads `monthlyUsage`, current month key, returns allowed/remaining/limit/isApproachingLimit
- [x] **Email send tracking** — On EMAIL_SENT, increments `monthlyUsage[YYYY-MM].previews`, persists to storage

### 2.5 Badge
- [x] **Traffic light** — idle (grey ·), ready (green ✓), issues (yellow !)
- [x] **Score badge** — Grade (A–F) or score when no traffic light; color by grade

### 2.6 Alarms & maintenance
- [x] **keepalive** — Every 1 minute (service worker keepalive)
- [x] **monthlyCleanup** — Every 1440 minutes; prunes non-current months from `monthlyUsage`

### 2.7 Other listeners
- [x] **tabs.onRemoved** — On active tab close, sets state inactive and broadcasts
- [x] **runtime.onStartup** — Logs startup
- [x] **Port disconnect** — Removes port from set; popup reconnect handled in popup

---

## 3. Content script (Gmail/Outlook)

### 3.1 Initialization & compose detection
- [x] **initialize()** — Waits for Gmail main area, loads settings, runs onboarding check, starts compose watcher
- [x] **watchForComposeWindow()** — MutationObserver on body; calls `handleComposeDetected` when compose dialog appears
- [x] **findComposeWindow()** — Uses `[role="dialog"]`, Gmail selectors (`.AD`, `.nH.aHU`), subject + textbox presence
- [x] **attachToCompose()** — Injects overlay, creates Shadow DOM UI, syncs subject/body, sets up listeners; retry on missing body

### 3.2 Preview UI (Shadow DOM)
- [x] **Phone mockup** — iPhone-style frame with status bar, notch, home indicator
- [x] **Live preview area** — Renders body HTML in iframe-like area; updates as user types
- [x] **Subject display** — Shows subject in preview header
- [x] **Collapse / expand** — Collapse button and collapsed logo; `toggleCollapse()` toggles visibility
- [x] **Draggable** — Drag handle and collapsed logo; position clamped to viewport
- [x] **Dark mode simulation** — Toggle adds `dark-mode-sim` to phone screen for device dark preview
- [x] **Reattach on DOM replace** — `tryReattachComposeBody()` when compose body node is replaced by Gmail/Outlook

### 3.3 Subject line
- [x] **Subject sync** — Listener on subject field; updates preview and subject counter
- [x] **Subject character counter** — In-preview badge: “X chars”; green (30–50), amber (borderline), red (too long)
- [x] **updateSubjectCounter()** — Updates counter element class and text from subject length

### 3.4 Live sync & performance
- [x] **setupLiveSync()** — MutationObserver on compose body; debounced/throttled `updatePreview()`
- [x] **updatePreview()** — RAF-batched; reads body html/text, subject; runs preflight + score; updates DOM and sends state to worker
- [x] **Content hashing** — Fast hash to skip redundant heavy work when content unchanged
- [x] **Performance tracking** — previewRender, scoreCalculation, syncLatency, domQuery; warns when averages exceed thresholds
- [x] **LRU caches** — e.g. preflight results cached by content hash
- [x] **Safe DOM** — safeQuerySelector, safeQuerySelectorAll, safeCreateElement; no raw querySelector on risky selectors

### 3.5 Pre-flight checks (three tips)
- [x] **subjectFrontLoaded** — First ~30 chars “compelling” (e.g. not “Re:”, “Fwd:”, “Hi”, “Quick question” only)
- [x] **ctaAboveFold** — CTA (link/button) within first ~250 characters of body
- [x] **linkTapability** — Links not too close together (tap-friendly spacing)
- [x] **runPreflightChecks()** — Fills `preflightChecks`, caches result; sends with email state to worker

### 3.6 Mobile score (0–100)
- [x] **calculateMobileScore()** — In content.js; returns score, breakdown, suggestions, grade
- [x] **Factors** — Subject length, CTA placement, link density, images, text length, spacing (paragraph breaks), readability (paragraph length)
- [x] **getGradeFromScore()** — A (≥90), B (≥80), C (≥70), D (≥60), F (&lt;60)
- [x] **getTrafficLightState()** — idle / ready / issues from subject length and CTA presence
- [x] **sendEmailStateToServiceWorker()** — Sends html, text, subject, counts, environment, mobileScore, trafficLight, preflightChecks; throttled

### 3.7 Send detection & usage
- [x] **setupSendButtonListener()** — MutationObserver to find Send button in compose dialog
- [x] **attachSendListener()** — Listens for Send click; calls `handleEmailSent()`
- [x] **handleEmailSent()** — Sends EMAIL_SENT to worker (which increments usage), shows toast (e.g. “Sent. N left this month”)
- [x] **Usage limit UI** — When at limit: paywall sheet in preview, resets date, usage count, Upgrade / Wait buttons
- [x] **showUpgradeModal()** — Document-level modal when at limit with upgrade/dismiss
- [x] **checkLimit()** / **trackPreview()** — Message worker for limit check and tracking (track returns snapshot)

### 3.8 Settings
- [x] **loadSettings()** — Reads `settings` from storage (autoShow, showNotifications); used in content
- [x] **SETTINGS_UPDATED** — Listener updates local settings when popup changes them

### 3.9 Onboarding & first-run
- [x] **checkAndShowOnboarding()** — If welcome completed, first-compose guide not shown, no first_compose milestone, not skipped → load first-compose guide
- [x] **loadFirstComposeGuide()** — Injects `src/lib/first-compose-guide.js` (script tag)
- [x] **First-compose guide** — Overlay with “Click Compose” style guidance; can show/skip; state in onboardingState
- [x] **Milestones** — first_preview, first_compose; stored in chrome.storage.local
- [x] **First preview celebration** — Optional celebration when user gets first preview (script injection, onboardingState flags)

### 3.10 Error handling & logging
- [x] **log()** — Debug-only
- [x] **logError()** — Always logs, appends to errorLog, sends ERROR_LOGGED to worker
- [x] **logWarn()** — Always logs
- [x] **validateEmailState()** — Validates state shape before send
- [x] **Gmail selectors** — Centralized GMAIL_SELECTORS (compose window, body fallbacks, subject field)

---

## 4. Popup

### 4.1 Connection & state
- [x] **Long-lived port** — `chrome.runtime.connect({ name: 'popup-realtime' })`
- [x] **INITIAL_STATE** — On connect, worker sends current state; popup updates UI
- [x] **EMAIL_CONTENT_UPDATED** — Popup updates tips, status, usage
- [x] **COMPOSE_OPENED** / **COMPOSE_CLOSED** — Status text and empty state
- [x] **EMAIL_SENT** — Empty state, status “Ready”, refresh usage
- [x] **ACTIVE_TAB_CLOSED** — Re-request state
- [x] **HEALTH_PING** — Popup responds with HEALTH_PONG
- [x] **Reconnect on disconnect** — setTimeout 1s then connect again
- [x] **GET_CURRENT_EMAIL_STATE** — On load and when needed; `requestInitialState()`

### 4.2 UI
- [x] **Header** — Logo, “VeloMail v1.0.1”, status (Ready / Composing)
- [x] **Tips (pre-flight)** — Three tip bubbles with pass/fail/pending; labels from preflightChecks (subjectFrontLoaded, ctaAboveFold, linkTapability)
- [x] **Empty state** — “No Active Email”, copy, “Open Gmail” link
- [x] **Usage card** — “Sends This Month” with count (e.g. 0 / 15), progress bar, reset date text, “Upgrade →” link (e.g. when low or at limit)
- [x] **Settings** — “Auto-show preview”, “Tip notifications” checkboxes; persist via chrome.storage
- [x] **loadSettings()** / **saveSettings()** — Read/write settings and notificationPreferences; broadcast SETTINGS_UPDATED to worker

### 4.3 Helpers
- [x] **updateUI()** / **performUIUpdate()** — Show tips vs empty state from state; update status
- [x] **showChatBubbles()** — Renders tip cards with badge (pass/fail/pending)
- [x] **showEmptyState()** — Hides tips, shows empty state
- [x] **updateUsageStats()** — Reads monthlyUsage, updates count/fill/reset text/upgrade CTA
- [x] **stripLeadingEmoji** / **escapeHtml** — For safe tip text

---

## 5. Welcome / onboarding

### 5.1 Welcome page
- [x] **4-slide carousel** — Problem → Checks → Preview → Get Started; dots and next/done/skip
- [x] **Slide 1** — “81% of emails are read on mobile”, iPhone mockup
- [x] **Slide 2** — Pre-flight checks intro
- [x] **Slide 3** — Live preview intro
- [x] **Slide 4** — “Get started”, open Gmail button
- [x] **Theme** — Uses `theme.js` (initializeTheme, watchSystem)
- [x] **finishOnboarding()** — Sets onboardingState (welcomeCompleted, etc.), may open Gmail tab
- [x] **Quick start modal** — Help link opens modal; close via button or backdrop

---

## 6. First-compose guide (lib)

- [x] **first-compose-guide.js** — Injected once; prevents duplicate via `window.VeloMailFirstComposeGuide`
- [x] **showFirstComposeGuide()** — Full-screen overlay with card (“Click Compose to start”), Skip / Got it
- [x] **Dismissal** — Sets firstComposeGuideShown (and optionally guideSkipped) in storage
- [x] **Styling** — Inline styles, high z-index, no conflict with Gmail

---

## 7. Theme (lib)

- [x] **theme.js** — ES module: getSystemTheme(), watchSystemTheme(), init helpers
- [x] **Used in welcome** — welcome.js imports initializeTheme, watchSystem: true
- [x] **Light/Dark/System** — Constants and storage key for theme preference (used where theme is wired)

---

## 8. Landing & privacy

### 8.1 Landing page
- [x] **landing/index.html** — Nav, hero (“Your next reply starts on mobile”), how it works, features, pricing, CTA
- [x] **landing/style.css** — Styles for landing
- [x] **landing/landing.js** — Any interactive behavior
- [x] **Links** — Add to Chrome, upgrade, velomailext.netlify.app
- [x] **Favicon** — Uses `../assets/images/icon48.png`

### 8.2 Privacy
- [x] **landing/privacy.html** — Full privacy policy page (data stored, not collected, permissions, contact)
- [x] **docs/PRIVACY-POLICY.md** — Source text for policy
- [x] **Store listing doc** — Privacy URL intended: https://velomailext.netlify.app/privacy.html (requires deployment)

---

## 9. Chrome Web Store readiness (assets & docs)

### 9.1 Listing content (in repo)
- [x] **Short description** — In CHROME-WEB-STORE-LISTING.md (≤132 chars)
- [x] **Detailed description** — Full copy in same doc
- [x] **Category** — Productivity
- [x] **Tags** — Listed in doc
- [x] **Permissions justifications** — Table in doc for each permission and host access

### 9.2 Store assets (in repo)
- [x] **Screenshot(s)** — At least one 1280×800 PNG (e.g. `assets/store/screenshot-1-1280x800.png`) — present per your confirmation
- [x] **Mockups** — HTML mockups for screenshot and promo tile in `assets/store/`
- [x] **Icon script** — `scripts/create-store-icons.js` generates 16/48/128 placeholder PNGs to `assets/images/`

### 9.3 Packaging
- [x] **package-for-store.js** — Copies manifest, src/, assets/ to staging, zips (PowerShell on Windows, zip on macOS/Linux)
- [x] **Output** — `velomail-chrome-web-store.zip` in project root
- [x] **npm script** — `package-store` in package.json runs the script

---

## 10. Documentation

- [x] **README.md** — Quick start, features, structure, testing, troubleshooting, version
- [x] **docs/ARCHITECTURE.md** — Components, data flow, messaging, storage schema, performance targets, security, browser support
- [x] **docs/DEVELOPER-GUIDE.md** — Logging, safe DOM, error codes, patterns
- [x] **docs/PRIVACY-POLICY.md** — Policy text
- [x] **docs/CHROME-WEB-STORE-LISTING.md** — Store copy, checklist, permissions, build steps
- [x] **docs/DONE-AND-WORKING-CHECKLIST.md** — This file

---

## 11. Code quality & tooling

- [x] **Prettier** — .prettierrc.mjs, format script
- [x] **.gitignore** — Present
- [x] **No remote code** — All scripts and assets local (manifest + CSP)
- [x] **ES modules** — Used where appropriate (e.g. welcome + theme); content/worker/popup are classic scripts for extension compatibility
- [x] **Utility-first / minimal UI** — Popup and overlay use minimal, focused layout and styles

---

## 12. Optional / partial (for accuracy)

- **Paywall → landing** — Paywall sheet, upgrade modal, and popup "Upgrade →" all open https://velomailext.netlify.app (landing).
- **Outlook** — Host permissions and content script matches include Outlook; compose detection and selectors are Gmail-centric (e.g. `input[name="subjectbox"]`). Outlook compose UX may need additional selectors for full parity.
- **GitHub Actions** — `.github/workflows/submit.yml` references `pnpm build`, `pnpm package`, and artifact `build/chrome-mv3-prod.zip`; project has `package-store` and outputs `velomail-chrome-web-store.zip`. Workflow may need to be aligned with this repo if you use it for store uploads.

---

**Summary:** Extension core, background logic, content script (preview, preflight, score, send tracking, usage limit UI, onboarding), popup, welcome flow, first-compose guide, theme, landing, privacy page, store listing copy, screenshot asset, and packaging script are all implemented and working. Remaining steps for store submission are: ensure icons in `assets/images/`, add 440×280 promo tile image, deploy landing (so privacy URL is live), generate zip, then fill the Chrome Web Store dashboard (descriptions, category, permissions, screenshots, promo tile, privacy URL).
