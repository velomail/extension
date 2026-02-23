# VeloMail

Real-time mobile preview for Gmail and Outlook. See how your emails look on iPhone and Android as you type.

## Quick start

1. Open [Gmail](https://mail.google.com)
2. Click **Compose** button
3. Mobile preview (iPhone/Android) appears on the right side
4. Start typing - watch it update in real-time!
5. Click VeloMail icon to see your mobile score

## Features

### Live Mobile Preview
- Real phone frame beside your draft; updates with every keystroke
- iPhone and Android-style preview (393×852px), draggable & collapsible
- Shadow DOM isolated (no Gmail/Outlook conflicts)

### Pre-flight Tips
- Three weighted checks: **subject length**, **CTA placement**, **link tap spacing**
- Each turns green when your email is ready; fix before you send

### Subject Counter
- Color-coded character count inline in Gmail — green, amber, or red
- Never send a subject that gets cut off on mobile

### Dark Mode Preview
- Toggle dark mode to see how your email renders for the 80%+ of mobile users who have it on

### Freemium Limits
- **Free**: 5 sends/day (resets at midnight)
- **Lifetime**: $49 one-time, unlimited sends (see landing/upgrade)

## Project layout

- **`src/`** — Extension: popup, background (service worker), content script, welcome page, shared lib (first-compose-guide, theme).
- **`landing/`** — Marketing site (index, privacy); deploy to Netlify.
- **`assets/`** — Images: extension icons in `assets/images/` (icon16, icon48, icon128); store mockups in `assets/store/`.
- **`scripts/`** — Build/package: `build-icons-from-logo.js` (build icon16/48/128 from arrow logo), `create-store-icons.js` (placeholder icons; skips if icons exist), `package-for-store.js`.
- **`docs/`** — Audit, Chrome Web Store listing, architecture, developer guide, privacy.

```
email-mobility/
├── manifest.json
├── src/
│   ├── background/   # Service worker
│   ├── content/      # Content script + styles
│   ├── popup/        # Popup UI
│   ├── welcome/      # Onboarding
│   └── lib/          # first-compose-guide, theme
├── landing/          # Marketing site (Netlify)
├── assets/
│   ├── images/       # icon16, icon48, icon128
│   └── store/        # Store mockups
├── scripts/          # build-icons-from-logo, create-store-icons, package-for-store
└── docs/             # Audit, listing, architecture, privacy
```

| File | Purpose |
|------|---------|
| `content.js` | Main logic, scoring, preview UI |
| `worker-simple.js` | Background / service worker |
| `popup.js` | Popup UI |
| `first-compose-guide.js` | Onboarding overlay |
| `theme.js` | Dark mode |

### Documentation

- **Architecture**: `docs/ARCHITECTURE.md`
- **Developer Guide**: `docs/DEVELOPER-GUIDE.md`
- **Publishing & deploy**: `DEPLOY.md` — Chrome Web Store package, Netlify landing, GitHub upload, and next steps.

---

## Target Users

- Sales Development Reps (SDRs)
- Account Executives (AEs)
- Business Development Reps (BDRs)
- Anyone composing outbound sales emails

---

## Supported Email Clients

- Gmail (mail.google.com)
- Outlook Web (outlook.live.com, outlook.office.com, outlook.office365.com)

---

## Troubleshooting

### Preview doesn't show?

1. Check console for VeloMail errors (ignore Gmail errors)
2. Verify usage limit: `chrome.storage.local.get('monthlyUsage')`
3. Reload extension: `chrome://extensions/` → Reload
4. Check service worker: Click "service worker" link on extension

### Console full of errors?

Ignore these (Gmail's own errors):
- Service worker navigation preload
- FetchEvent network error
- iframe sandbox warnings

Only worry about errors starting with:
- `VeloMail Error`
- `chrome-extension://`

---

## License

Proprietary - VeloMail

---

## Links

- Chrome Web Store: (pending)
- Website: (pending)
- Support: (pending)

---

**Version**: 1.0.1  
**Status**: Production Ready  
**Last Updated**: February 22, 2026
